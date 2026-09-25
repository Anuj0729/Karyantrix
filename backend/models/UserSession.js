const mongoose = require('mongoose');
const toJSONPlugin = require('../utils/toJSON');

const userSessionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    device_label: { type: String, default: 'Unknown device' },
    user_agent: { type: String, default: null },
    ip: { type: String, default: null },
    last_seen_at: { type: Date, default: Date.now },
    revoked_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

userSessionSchema.index({ user: 1, revoked_at: 1, last_seen_at: -1 });
userSessionSchema.index({ last_seen_at: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

toJSONPlugin(userSessionSchema);

module.exports = mongoose.model('UserSession', userSessionSchema);
