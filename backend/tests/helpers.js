const bcrypt = require('bcryptjs');
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

module.exports = { createUserWithToken };
