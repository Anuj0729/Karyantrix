const request = require('supertest');
const { app } = require('../server');
const { createBookingSetup, createWorkCompletedBooking, signRazorpayPayment } = require('./helpers');

// These tests focus on the parts of the payment flow that bookings.test.js's
// happy path doesn't exercise: signature verification actually rejecting
// bad input, replay/double-payment protection, and the ordering rules that
// stop a leg being paid before it's due.

describe('Payments — advance leg', () => {
  test('rejects a forged/tampered signature', async () => {
    const { customerToken, booking } = await createBookingSetup({ bidAmount: 1000 });
    const order = await request(app)
      .post(`/api/bookings/${booking.id}/advance/order`)
      .set('Authorization', `Bearer ${customerToken}`);

    const res = await request(app)
      .post(`/api/bookings/${booking.id}/advance/verify`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        razorpay_order_id: order.body.order_id,
        razorpay_payment_id: 'pay_forged',
        razorpay_signature: 'not-a-real-signature',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/verification failed/i);
  });

  test('rejects a validly-signed payment for an order_id that does not belong to this booking', async () => {
    const { customerToken, booking } = await createBookingSetup({ bidAmount: 1000 });
    await request(app).post(`/api/bookings/${booking.id}/advance/order`).set('Authorization', `Bearer ${customerToken}`);

    // A genuinely valid signature, just for the wrong order — e.g. an order
    // created for a different booking/session.
    const foreignOrderId = 'order_test_from_elsewhere';
    const signature = signRazorpayPayment(foreignOrderId, 'pay_x');

    const res = await request(app)
      .post(`/api/bookings/${booking.id}/advance/verify`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ razorpay_order_id: foreignOrderId, razorpay_payment_id: 'pay_x', razorpay_signature: signature });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/does not match/i);
  });

  test('rejects a verification request missing required fields', async () => {
    const { customerToken, booking } = await createBookingSetup();
    const res = await request(app)
      .post(`/api/bookings/${booking.id}/advance/verify`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ razorpay_order_id: 'order_x' }); // missing payment_id and signature
    expect(res.status).toBe(400);
  });

  test('cannot be paid twice — replaying an already-successful callback is rejected', async () => {
    const { customerToken, booking } = await createBookingSetup({ bidAmount: 1000 });
    const order = await request(app).post(`/api/bookings/${booking.id}/advance/order`).set('Authorization', `Bearer ${customerToken}`);
    const paymentId = 'pay_once';
    const signature = signRazorpayPayment(order.body.order_id, paymentId);

    const first = await request(app)
      .post(`/api/bookings/${booking.id}/advance/verify`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ razorpay_order_id: order.body.order_id, razorpay_payment_id: paymentId, razorpay_signature: signature });
    expect(first.status).toBe(200);

    // Replaying the exact same (validly-signed) callback must not
    // re-process the booking or double-credit the wallet.
    const replay = await request(app)
      .post(`/api/bookings/${booking.id}/advance/verify`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ razorpay_order_id: order.body.order_id, razorpay_payment_id: paymentId, razorpay_signature: signature });
    expect(replay.status).toBe(400);
    expect(replay.body.message).toMatch(/already recorded as paid/i);
  });

  test('a fresh order cannot be created once the advance is already paid', async () => {
    const { customerToken, booking } = await createBookingSetup({ bidAmount: 1000 });
    const order = await request(app).post(`/api/bookings/${booking.id}/advance/order`).set('Authorization', `Bearer ${customerToken}`);
    const paymentId = 'pay_a';
    const signature = signRazorpayPayment(order.body.order_id, paymentId);
    await request(app)
      .post(`/api/bookings/${booking.id}/advance/verify`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ razorpay_order_id: order.body.order_id, razorpay_payment_id: paymentId, razorpay_signature: signature });

    const secondOrder = await request(app).post(`/api/bookings/${booking.id}/advance/order`).set('Authorization', `Bearer ${customerToken}`);
    expect(secondOrder.status).toBe(400);
  });

  test('only the customer on this specific booking can create or verify the advance — the hired provider cannot', async () => {
    const { providerToken, booking } = await createBookingSetup();

    const order = await request(app).post(`/api/bookings/${booking.id}/advance/order`).set('Authorization', `Bearer ${providerToken}`);
    expect(order.status).toBe(403);

    const verify = await request(app)
      .post(`/api/bookings/${booking.id}/advance/verify`)
      .set('Authorization', `Bearer ${providerToken}`)
      .send({ razorpay_order_id: 'order_x', razorpay_payment_id: 'pay_x', razorpay_signature: 'sig_x' });
    expect(verify.status).toBe(403);
  });
});

describe('Payments — balance leg', () => {
  test('the balance cannot be ordered or paid before the work is marked completed', async () => {
    const { customerToken, booking } = await createBookingSetup();
    const order = await request(app).post(`/api/bookings/${booking.id}/balance/order`).set('Authorization', `Bearer ${customerToken}`);
    expect(order.status).toBe(400);
  });

  test('rejects a forged/tampered signature', async () => {
    const { customerToken, booking } = await createWorkCompletedBooking({ bidAmount: 1000 });
    const order = await request(app).post(`/api/bookings/${booking.id}/balance/order`).set('Authorization', `Bearer ${customerToken}`);

    const res = await request(app)
      .post(`/api/bookings/${booking.id}/balance/verify`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ razorpay_order_id: order.body.order_id, razorpay_payment_id: 'pay_fake', razorpay_signature: 'bad-signature' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/verification failed/i);
  });

  test('cannot be paid twice, and correctly completes the booking with a payout date on the first successful payment', async () => {
    const { customerToken, booking } = await createWorkCompletedBooking({ bidAmount: 1000 });
    const order = await request(app).post(`/api/bookings/${booking.id}/balance/order`).set('Authorization', `Bearer ${customerToken}`);
    const paymentId = 'pay_bal_once';
    const signature = signRazorpayPayment(order.body.order_id, paymentId);

    const first = await request(app)
      .post(`/api/bookings/${booking.id}/balance/verify`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ razorpay_order_id: order.body.order_id, razorpay_payment_id: paymentId, razorpay_signature: signature });
    expect(first.status).toBe(200);
    expect(first.body.booking.status).toBe('completed');
    expect(new Date(first.body.booking.payout_expected_at).getTime()).toBeGreaterThan(Date.now());

    const replay = await request(app)
      .post(`/api/bookings/${booking.id}/balance/verify`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ razorpay_order_id: order.body.order_id, razorpay_payment_id: paymentId, razorpay_signature: signature });
    expect(replay.status).toBe(400);
    expect(replay.body.message).toMatch(/already recorded as paid/i);
  });
});
