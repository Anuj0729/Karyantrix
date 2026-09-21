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

  test('refresh token travels only in the httpOnly cookie, access token only in the body', async () => {
    const identifier = 'cookie@karyantrix.test';
    await request(app).post('/api/auth/register/initiate').send({ name: 'Cookie', identifier, password: 'SecurePass1' });
    const pending = await PendingUser.findOne({ identifier });
    await request(app).post('/api/auth/register/verify').send({ identifier, otp: pending.otp });

    // an agent keeps cookies between calls, like a browser sending withCredentials requests
    const agent = request.agent(app);
    const login = await agent.post('/api/auth/login').send({ identifier, password: 'SecurePass1' });
    expect(login.status).toBe(200);
    expect(login.body.accessToken).toBeTruthy();
    expect(login.body).not.toHaveProperty('refreshToken');

    const cookie = (login.headers['set-cookie'] || []).find((c) => c.startsWith('refreshToken='));
    expect(cookie).toBeTruthy();
    expect(cookie).toMatch(/HttpOnly/i);

    // No body and no Authorization header: the cookie alone yields a new access token that works.
    const refreshed = await agent.post('/api/auth/refresh');
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.accessToken).toBeTruthy();
    const me = await agent.get('/api/auth/me').set('Authorization', `Bearer ${refreshed.body.accessToken}`);
    expect(me.status).toBe(200);

    // A refresh token sent in the body (without the cookie) is no longer accepted.
    const cookieValue = cookie.split(';')[0].split('=')[1];
    const bodyOnly = await request(app).post('/api/auth/refresh').send({ refreshToken: cookieValue });
    expect(bodyOnly.status).toBe(401);

    // Logout removes the cookie and revokes the old refresh token.
    const out = await agent.post('/api/auth/logout').set('Authorization', `Bearer ${refreshed.body.accessToken}`);
    expect(out.status).toBe(200);
    const replay = await request(app).post('/api/auth/refresh').set('Cookie', `refreshToken=${cookieValue}`);
    expect(replay.status).toBe(401);
  });
});