const jwt = require('jsonwebtoken');

const generateAccessToken = (user, sessionId) => {
  const payload = { id: user.id, role: user.role, tokenVersion: user.tokenVersion || 0 };
  if (sessionId) payload.sid = sessionId;
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || '15m',
  });
};

const generateRefreshToken = (user, sessionId) => {
  const payload = { id: user.id, role: user.role, tokenVersion: user.tokenVersion || 0 };
  if (sessionId) payload.sid = sessionId;
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
  });
};

module.exports = { generateAccessToken, generateRefreshToken };
