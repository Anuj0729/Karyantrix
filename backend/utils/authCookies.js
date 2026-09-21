const { generateAccessToken, generateRefreshToken } = require('./generateToken');

const REFRESH_COOKIE_NAME = 'refreshToken';

const getRefreshMaxAgeMs = () =>
  process.env.REFRESH_TOKEN_EXPIRES_MS
    ? parseInt(process.env.REFRESH_TOKEN_EXPIRES_MS, 10)
    : 7 * 24 * 60 * 60 * 1000;

const baseCookieOptions = () => {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'None' : 'Lax',
    path: '/',
  };
};

const setRefreshCookie = (res, token) => {
  res.cookie(REFRESH_COOKIE_NAME, token, { ...baseCookieOptions(), maxAge: getRefreshMaxAgeMs() });
};

const clearRefreshCookie = (res) => {
  res.clearCookie(REFRESH_COOKIE_NAME, baseCookieOptions());
};

const issueAuthTokens = (res, user) => {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  setRefreshCookie(res, refreshToken);
  return { accessToken };
};

module.exports = {
  REFRESH_COOKIE_NAME,
  issueAuthTokens,
  setRefreshCookie,
  clearRefreshCookie,
};