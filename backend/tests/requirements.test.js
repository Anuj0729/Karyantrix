const request = require('supertest');
const { app } = require('../server');
const { createUserWithToken } = require('./helpers');

describe('Requirements + Bids', () => {
  test('customer posts a requirement, provider bids, customer accepts', async () => {
    const { token: customerToken } = await createUserWithToken({ role: 'customer' });
    const { token: providerToken, user: provider } = await createUserWithToken({ role: 'provider' });

    const create = await request(app)
      .post('/api/requirements')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        services: ['Deep Cleaning'],
        description: 'Need a deep clean before a house party this weekend.',
        budget: 1500,
        location: { text: 'Lucknow', lat: 26.8467, lng: 80.9462 },
      });
    expect(create.status).toBe(201);
    const requirementId = create.body.requirement.id;

    const bid = await request(app)
      .post(`/api/requirements/${requirementId}/bids`)
      .set('Authorization', `Bearer ${providerToken}`)
      .send({ amount: 1200, message: 'Can do it Saturday morning.' });
    expect(bid.status).toBe(201);
    const bidId = bid.body.bid.id;

    const bidsForCustomer = await request(app)
      .get(`/api/requirements/${requirementId}/bids`)
      .set('Authorization', `Bearer ${customerToken}`);
    expect(bidsForCustomer.status).toBe(200);
    expect(bidsForCustomer.body.bids.length).toBe(1);

    const accept = await request(app)
      .patch(`/api/requirements/${requirementId}/bids/${bidId}/accept`)
      .set('Authorization', `Bearer ${customerToken}`);
    expect(accept.status).toBe(200);
  });

  test('a provider cannot bid on a closed requirement', async () => {
    const { token: customerToken } = await createUserWithToken({ role: 'customer' });
    const { token: providerToken } = await createUserWithToken({ role: 'provider' });

    const create = await request(app)
      .post('/api/requirements')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        services: ['Wiring Repair'],
        description: 'Fix a flickering light switch.',
        budget: 500,
        location: { text: 'Delhi', lat: 28.6139, lng: 77.209 },
      });
    const requirementId = create.body.requirement.id;

    await request(app)
      .patch(`/api/requirements/${requirementId}/close`)
      .set('Authorization', `Bearer ${customerToken}`);

    const bid = await request(app)
      .post(`/api/requirements/${requirementId}/bids`)
      .set('Authorization', `Bearer ${providerToken}`)
      .send({ amount: 400 });
    expect(bid.status).toBe(400);
  });
});
