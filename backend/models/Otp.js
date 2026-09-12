const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  identifier: { type: String, required: true },
  purpose: { type: String, enum: ['login', 'reset_password'], required: true },
  otp: { type: String, required: true },
  otp_expires_at: { type: Date, required: true },
  verified: { type: Boolean, default: false },
  expires_at: { type: Date, required: true, expires: 0 },
});

otpSchema.index({ identifier: 1, purpose: 1 });

module.exports = mongoose.model('Otp', otpSchema);
