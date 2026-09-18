const request = require('supertest');
const { app } = require('../server');
const { createUserWithToken, createBookingSetup, signRazorpayPayment } = require('./helpers');
const { WalletTransaction } = require('../models');

describe('Bookings', () => {
  test('full happy path: advance payment -> progress -> work completed -> balance payment', async () => {
    const { customerToken, providerToken, booking } = await createBookingSetup({ bidAmount: 2000 });

    expect(booking.status).toBe('awaiting_advance');
    expect(booking.advance_amount).toBe(400); // 20% of 2000
    expect(booking.balance_amount).toBe(1600);

    // --- Advance payment ---
    const advanceOrder = await request(app)
      .post(`/api/bookings/${booking.id}/advance/order`)
      .set('Authorization', `Bearer ${customerToken}`);
    expect(advanceOrder.status).toBe(200);
    expect(advanceOrder.body.order_id).toBeTruthy();
    expect(advanceOrder.body.amount).toBe(40000); // 400 rupees in paise

    const advancePaymentId = 'pay_test_advance_1';
    const advanceSignature = signRazorpayPayment(advanceOrder.body.order_id, advancePaymentId);

    const advanceVerify = await request(app)
      .post(`/api/bookings/${booking.id}/advance/verify`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        razorpay_order_id: advanceOrder.body.order_id,
        razorpay_payment_id: advancePaymentId,
        razorpay_signature: advanceSignature,
      });
    expect(advanceVerify.status).toBe(200);
    expect(advanceVerify.body.booking.status).toBe('in_progress');
    expect(advanceVerify.body.booking.advance.status).toBe('paid');

    const advanceTxn = await WalletTransaction.findOne({ booking: booking.id, type: 'advance_received' });
    expect(advanceTxn).toBeTruthy();
    expect(advanceTxn.amount).toBe(400);

    // --- Progress update (with a photo) ---
    const progress = await request(app)
      .post(`/api/bookings/${booking.id}/progress`)
      .set('Authorization', `Bearer ${providerToken}`)
      .field('note', 'Replaced the tap washer, testing for leaks now.')
      .field('is_final', 'true')
      .attach('media', Buffer.from('fake-jpeg-bytes'), 'progress.jpg');
    expect(progress.status).toBe(201);
    const finalUpdate = progress.body.booking.progress_updates[progress.body.booking.progress_updates.length - 1];
    expect(finalUpdate.is_final).toBe(true);
    expect(finalUpdate.media[0].url).toMatch(/^\/uploads\/booking-progress\//);

    // Provider can't mark work completed until the customer approves the final update.
    const tooEarly = await request(app)
      .patch(`/api/bookings/${booking.id}/complete-work`)
      .set('Authorization', `Bearer ${providerToken}`);
    expect(tooEarly.status).toBe(400);

    // --- Customer approves the final progress update ---
    const respond = await request(app)
      .patch(`/api/bookings/${booking.id}/progress/${finalUpdate.id}/respond`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ action: 'approve' });
    expect(respond.status).toBe(200);

    // --- Provider marks work completed ---
    const complete = await request(app)
      .patch(`/api/bookings/${booking.id}/complete-work`)
      .set('Authorization', `Bearer ${providerToken}`);
    expect(complete.status).toBe(200);
    expect(complete.body.booking.status).toBe('work_completed');

    // --- Balance payment ---
    const balanceOrder = await request(app)
      .post(`/api/bookings/${booking.id}/balance/order`)
      .set('Authorization', `Bearer ${customerToken}`);
    expect(balanceOrder.status).toBe(200);
    expect(balanceOrder.body.amount).toBe(160000); // 1600 rupees in paise

    const balancePaymentId = 'pay_test_balance_1';
    const balanceSignature = signRazorpayPayment(balanceOrder.body.order_id, balancePaymentId);

    const balanceVerify = await request(app)
      .post(`/api/bookings/${booking.id}/balance/verify`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        razorpay_order_id: balanceOrder.body.order_id,
        razorpay_payment_id: balancePaymentId,
        razorpay_signature: balanceSignature,
      });
    expect(balanceVerify.status).toBe(200);
    expect(balanceVerify.body.booking.status).toBe('completed');
    expect(balanceVerify.body.booking.payout_expected_at).toBeTruthy();

    const balanceTxn = await WalletTransaction.findOne({ booking: booking.id, type: 'balance_received' });
    expect(balanceTxn).toBeTruthy();
    expect(balanceTxn.amount).toBe(1600);
  });

  test('a random third party cannot view, pay for, or act on someone else\u2019s booking', async () => {
    const { booking } = await createBookingSetup();
    const { token: strangerToken } = await createUserWithToken({ role: 'customer' });

    const view = await request(app)
      .get(`/api/bookings/${booking.id}`)
      .set('Authorization', `Bearer ${strangerToken}`);
    expect(view.status).toBe(403);

    const pay = await request(app)
      .post(`/api/bookings/${booking.id}/advance/order`)
      .set('Authorization', `Bearer ${strangerToken}`);
    expect(pay.status).toBe(403);
  });

  test('the provider cannot post a progress update without at least one photo/video', async () => {
    const { providerToken, customerToken, booking } = await createBookingSetup();

    // Pay the advance first so the booking is in_progress.
    const order = await request(app)
      .post(`/api/bookings/${booking.id}/advance/order`)
      .set('Authorization', `Bearer ${customerToken}`);
    const signature = signRazorpayPayment(order.body.order_id, 'pay_no_media_test');
    await request(app)
      .post(`/api/bookings/${booking.id}/advance/verify`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ razorpay_order_id: order.body.order_id, razorpay_payment_id: 'pay_no_media_test', razorpay_signature: signature });

    const noMedia = await request(app)
      .post(`/api/bookings/${booking.id}/progress`)
      .set('Authorization', `Bearer ${providerToken}`)
      .field('note', 'Started work today.');
    expect(noMedia.status).toBe(400);
  });

  test('customer cancellation before advance payment incurs no fee and no refund', async () => {
    const { customerToken, booking } = await createBookingSetup({ bidAmount: 1000 });

    const cancel = await request(app)
      .post(`/api/bookings/${booking.id}/cancel`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ reason: 'change_of_plans', details: 'No longer needed, found a friend to help.' });

    expect(cancel.status).toBe(200);
    expect(cancel.body.booking.status).toBe('cancelled');
    expect(cancel.body.booking.cancellation.fee_amount).toBe(0);
    expect(cancel.body.booking.cancellation.refund_amount).toBe(0);

    const secondCancel = await request(app)
      .post(`/api/bookings/${booking.id}/cancel`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ reason: 'change_of_plans', details: 'Trying again.' });
    expect(secondCancel.status).toBe(400);
  });

  test('customer cancellation after advance payment applies a fee and refunds the remainder', async () => {
    const { customerToken, booking } = await createBookingSetup({ bidAmount: 1000 });

    const order = await request(app)
      .post(`/api/bookings/${booking.id}/advance/order`)
      .set('Authorization', `Bearer ${customerToken}`);
    const signature = signRazorpayPayment(order.body.order_id, 'pay_cancel_test');
    await request(app)
      .post(`/api/bookings/${booking.id}/advance/verify`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ razorpay_order_id: order.body.order_id, razorpay_payment_id: 'pay_cancel_test', razorpay_signature: signature });

    const cancel = await request(app)
      .post(`/api/bookings/${booking.id}/cancel`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ reason: 'price_too_high', details: 'Found a cheaper provider elsewhere.' });

    expect(cancel.status).toBe(200);
    // Default customer_cancellation_fee_percent is 10% of the paid advance (200 rupees -> 10% = 20).
    expect(cancel.body.booking.cancellation.fee_amount).toBe(20);
    expect(cancel.body.booking.cancellation.refund_amount).toBe(180);

    const refundTxn = await WalletTransaction.findOne({ booking: booking.id, type: 'refund' });
    expect(refundTxn).toBeTruthy();
    expect(refundTxn.amount).toBe(180);
  });

  test('an invalid cancellation reason for the acting role is rejected', async () => {
    const { providerToken, booking } = await createBookingSetup();

    // 'price_too_high' is a customer-only reason, not valid for a provider cancelling.
    const cancel = await request(app)
      .post(`/api/bookings/${booking.id}/cancel`)
      .set('Authorization', `Bearer ${providerToken}`)
      .send({ reason: 'price_too_high', details: 'Testing an invalid reason.' });
    expect(cancel.status).toBe(400);
  });

  test('provider cancellation after advance payment charges the fee to the provider and refunds the customer in full', async () => {
    const { customerToken, providerToken, booking } = await createBookingSetup({ bidAmount: 1000 });

    const order = await request(app)
      .post(`/api/bookings/${booking.id}/advance/order`)
      .set('Authorization', `Bearer ${customerToken}`);
    const signature = signRazorpayPayment(order.body.order_id, 'pay_provider_cancel_test');
    await request(app)
      .post(`/api/bookings/${booking.id}/advance/verify`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ razorpay_order_id: order.body.order_id, razorpay_payment_id: 'pay_provider_cancel_test', razorpay_signature: signature });

    const cancel = await request(app)
      .post(`/api/bookings/${booking.id}/cancel`)
      .set('Authorization', `Bearer ${providerToken}`)
      .send({ reason: 'unavailable', details: 'A family emergency came up, cannot make it.' });

    expect(cancel.status).toBe(200);
    expect(cancel.body.booking.cancellation.cancelled_by_role).toBe('provider');
    expect(cancel.body.booking.cancellation.fee_charged_to).toBe('provider');
    // Default provider_cancellation_fee_percent is 10% of the paid advance (200 rupees -> 10% = 20).
    expect(cancel.body.booking.cancellation.fee_amount).toBe(20);
    // The provider is at fault, so the customer gets the full advance back — the fee comes out of the provider's side, not the refund.
    expect(cancel.body.booking.cancellation.refund_amount).toBe(200);

    const refundTxn = await WalletTransaction.findOne({ booking: booking.id, type: 'refund' });
    expect(refundTxn.amount).toBe(200);
  });

  test('a provider cannot mark work completed while the final progress update has "changes requested"; a fresh approved final update unblocks it', async () => {
    const { customerToken, providerToken, booking } = await createBookingSetup({ bidAmount: 1000 });

    const order = await request(app)
      .post(`/api/bookings/${booking.id}/advance/order`)
      .set('Authorization', `Bearer ${customerToken}`);
    const signature = signRazorpayPayment(order.body.order_id, 'pay_changes_requested_test');
    await request(app)
      .post(`/api/bookings/${booking.id}/advance/verify`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ razorpay_order_id: order.body.order_id, razorpay_payment_id: 'pay_changes_requested_test', razorpay_signature: signature });

    const firstFinal = await request(app)
      .post(`/api/bookings/${booking.id}/progress`)
      .set('Authorization', `Bearer ${providerToken}`)
      .field('note', 'Done, I think.')
      .field('is_final', 'true')
      .attach('media', Buffer.from('fake-jpeg-bytes'), 'attempt1.jpg');
    const firstUpdate = firstFinal.body.booking.progress_updates[firstFinal.body.booking.progress_updates.length - 1];

    const requestChanges = await request(app)
      .patch(`/api/bookings/${booking.id}/progress/${firstUpdate.id}/respond`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ action: 'request_changes', feedback: 'The tap is still dripping a little, please recheck.' });
    expect(requestChanges.status).toBe(200);
    expect(requestChanges.body.booking.progress_updates[0].status).toBe('changes_requested');

    // Blocked: the (only) final update currently has changes requested.
    const blocked = await request(app)
      .patch(`/api/bookings/${booking.id}/complete-work`)
      .set('Authorization', `Bearer ${providerToken}`);
    expect(blocked.status).toBe(400);

    // request_changes with no feedback is rejected outright.
    const noFeedback = await request(app)
      .patch(`/api/bookings/${booking.id}/progress/${firstUpdate.id}/respond`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ action: 'request_changes' });
    expect(noFeedback.status).toBe(400);

    // Provider posts a new final update addressing the feedback.
    const secondFinal = await request(app)
      .post(`/api/bookings/${booking.id}/progress`)
      .set('Authorization', `Bearer ${providerToken}`)
      .field('note', 'Fixed the drip, all good now.')
      .field('is_final', 'true')
      .attach('media', Buffer.from('fake-jpeg-bytes'), 'attempt2.jpg');
    const secondUpdate = secondFinal.body.booking.progress_updates[secondFinal.body.booking.progress_updates.length - 1];

    const approve = await request(app)
      .patch(`/api/bookings/${booking.id}/progress/${secondUpdate.id}/respond`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ action: 'approve' });
    expect(approve.status).toBe(200);

    // The same update can't be responded to twice.
    const doubleRespond = await request(app)
      .patch(`/api/bookings/${booking.id}/progress/${secondUpdate.id}/respond`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ action: 'approve' });
    expect(doubleRespond.status).toBe(400);

    const complete = await request(app)
      .patch(`/api/bookings/${booking.id}/complete-work`)
      .set('Authorization', `Bearer ${providerToken}`);
    expect(complete.status).toBe(200);
    expect(complete.body.booking.status).toBe('work_completed');
  });
});
