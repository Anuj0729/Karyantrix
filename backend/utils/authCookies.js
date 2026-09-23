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

// remember = true  -> persistent cookie with maxAge, survives browser close
// remember = false -> browser-session cookie (no maxAge), deleted when the browser closes
const setRefreshCookie = (res, token, remember = true) => {
  const options = remember
    ? { ...baseCookieOptions(), maxAge: getRefreshMaxAgeMs() }
    : baseCookieOptions();
  res.cookie(REFRESH_COOKIE_NAME, token, options);
};

const clearRefreshCookie = (res) => {
  res.clearCookie(REFRESH_COOKIE_NAME, baseCookieOptions());
};

const issueAuthTokens = (res, user, remember = true) => {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  setRefreshCookie(res, refreshToken, remember);
  return { accessToken };
};

module.exports = {
  REFRESH_COOKIE_NAME,
  issueAuthTokens,
  setRefreshCookie,
  clearRefreshCookie,
};