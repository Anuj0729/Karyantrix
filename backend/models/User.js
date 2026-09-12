const mongoose = require('mongoose');
const toJSONPlugin = require('../utils/toJSON');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, default: null, unique: true, sparse: true, lowercase: true, trim: true, maxlength: 150 },
    phone: { type: String, default: null, sparse: true, trim: true, maxlength: 20 },
    password_hash: { type: String, required: true, select: false },
    google_id: { type: String, default: null },
    role: { type: String, enum: ['customer', 'provider', 'admin'], default: 'customer' },
    avatar_url: { type: String, default: null },
    is_verified: { type: Boolean, default: false },
    is_active: { type: Boolean, default: true },
    bio: { type: String, default: null, maxlength: 500 },
    location: { type: String, default: null, maxlength: 150 },
    account_status: { type: String, enum: ['active', 'suspended', 'banned'], default: 'active' },
    tokenVersion: { type: Number, default: 0 },
    requirement_radius_km: { type: Number, default: 5, min: 1, max: 200 },
  },
  { timestamps: true }
);

userSchema.index({ role: 1 });
userSchema.index({ account_status: 1 });

userSchema.pre('validate', function (next) {
  if (!this.email && !this.phone) {
    return next(new Error('A user must have at least an email or a phone number'));
  }
  next();
});

toJSONPlugin(userSchema);

module.exports = mongoose.model('User', userSchema);
