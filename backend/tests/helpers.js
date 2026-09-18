const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const request = require('supertest');
const { app } = require('../server');
const { User } = require('../models');
const { generateAccessToken } = require('../utils/generateToken');

async function createUserWithToken(overrides = {}) {
  const password_hash = await bcrypt.hash('SecurePass1', 10);
  const user = await User.create({
    name: overrides.name || 'Test User',
    email: overrides.email || `user_${Date.now()}_${Math.random().toString(36).slice(2)}@karyantrix.test`,
    role: overrides.role || 'customer',
    is_verified: true,
    password_hash,
    ...overrides,
  });
  const token = generateAccessToken(user);
  return { user, token };
}

async function createBookingSetup(overrides = {}) {
  const { token: customerToken, user: customer } = await createUserWithToken({ role: 'customer' });
  const { token: providerToken, user: provider } = await createUserWithToken({ role: 'provider' });

  const bidAmount = overrides.bidAmount ?? 2000;

  const reqRes = await request(app)
    .post('/api/requirements')
    .set('Authorization', `Bearer ${customerToken}`)
    .send({
      services: ['Plumbing'],
      description: 'Fix a leaking kitchen tap before the weekend.',
      budget: bidAmount,
      location: { text: 'Lucknow', lat: 26.8467, lng: 80.9462 },
    });
  const requirementId = reqRes.body.requirement.id;

  const bidRes = await request(app)
    .post(`/api/requirements/${requirementId}/bids`)
    .set('Authorization', `Bearer ${providerToken}`)
    .send({ amount: bidAmount, message: 'I can do this today.' });
  const bidId = bidRes.body.bid.id;

  const acceptRes = await request(app)
    .patch(`/api/requirements/${requirementId}/bids/${bidId}/accept`)
    .set('Authorization', `Bearer ${customerToken}`);

  return {
    customer,
    customerToken,
    provider,
    providerToken,
    requirementId,
    bidId,
    booking: acceptRes.body.booking,
  };
}

function signRazorpayPayment(orderId, paymentId) {
  return crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
}

async function createWorkCompletedBooking(overrides = {}) {
  const setup = await createBookingSetup(overrides);
  const { customerToken, providerToken, booking } = setup;

  const advanceOrder = await request(app)
    .post(`/api/bookings/${booking.id}/advance/order`)
    .set('Authorization', `Bearer ${customerToken}`);
  const advancePaymentId = `pay_adv_${booking.id}`;
  await request(app)
    .post(`/api/bookings/${booking.id}/advance/verify`)
    .set('Authorization', `Bearer ${customerToken}`)
    .send({
      razorpay_order_id: advanceOrder.body.order_id,
      razorpay_payment_id: advancePaymentId,
      razorpay_signature: signRazorpayPayment(advanceOrder.body.order_id, advancePaymentId),
    });

  const progress = await request(app)
    .post(`/api/bookings/${booking.id}/progress`)
    .set('Authorization', `Bearer ${providerToken}`)
    .field('note', 'Finished the job.')
    .field('is_final', 'true')
    .attach('media', Buffer.from('fake-jpeg-bytes'), 'done.jpg');
  const finalUpdate = progress.body.booking.progress_updates[progress.body.booking.progress_updates.length - 1];

  await request(app)
    .patch(`/api/bookings/${booking.id}/progress/${finalUpdate.id}/respond`)
    .set('Authorization', `Bearer ${customerToken}`)
    .send({ action: 'approve' });

  const complete = await request(app)
    .patch(`/api/bookings/${booking.id}/complete-work`)
    .set('Authorization', `Bearer ${providerToken}`);

  return { ...setup, booking: complete.body.booking };
}

module.exports = { createUserWithToken, createBookingSetup, createWorkCompletedBooking, signRazorpayPayment };
