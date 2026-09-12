const mongoose = require('mongoose');

const pendingUserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  identifier: { type: String, required: true, unique: true, trim: true },
  method: { type: String, enum: ['email', 'phone'], required: true },
  password_hash: { type: String, required: true },
  otp: { type: String, required: true },
  otp_expires_at: { type: Date, required: true },
  expires_at: { type: Date, required: true, expires: 0 },
});

module.exports = mongoose.model('PendingUser', pendingUserSchema);
