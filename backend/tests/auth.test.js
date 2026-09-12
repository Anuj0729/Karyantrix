const request = require('supertest');
const { app } = require('../server');
const { PendingUser } = require('../models');

describe('Auth', () => {
  test('register -> OTP verify -> login -> /me', async () => {
    const identifier = 'newuser@karyantrix.test';

    const initiate = await request(app)
      .post('/api/auth/register/initiate')
      .send({ name: 'New User', identifier, password: 'SecurePass1' });
    expect(initiate.status).toBe(200);

    const pending = await PendingUser.findOne({ identifier });
    expect(pending).toBeTruthy();

    const verify = await request(app)
      .post('/api/auth/register/verify')
      .send({ identifier, otp: pending.otp });
    expect(verify.status).toBe(200);
    expect(verify.body.accessToken).toBeTruthy();
    expect(verify.body.user.email).toBe(identifier);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ identifier, password: 'SecurePass1' });
    expect(login.status).toBe(200);
    expect(login.body.accessToken).toBeTruthy();

    const me = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.email).toBe(identifier);
  });

  test('login rejects wrong password', async () => {
    const identifier = 'wrongpass@karyantrix.test';
    await request(app).post('/api/auth/register/initiate').send({ name: 'X', identifier, password: 'SecurePass1' });
    const pending = await PendingUser.findOne({ identifier });
    await request(app).post('/api/auth/register/verify').send({ identifier, otp: pending.otp });

    const res = await request(app).post('/api/auth/login').send({ identifier, password: 'WrongPassword' });
    expect(res.status).toBe(401);
  });

  test('/me requires a valid token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});
