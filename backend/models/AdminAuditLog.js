const mongoose = require('mongoose');
const toJSONPlugin = require('../utils/toJSON');

const adminAuditLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    actor_name: { type: String, required: true },
    actor_role: { type: String, enum: ['admin', 'staff', 'customer', 'provider'], required: true },
    method: { type: String, required: true },
    path: { type: String, required: true },
    action: { type: String, required: true },
    target_id: { type: String, default: null },
    status_code: { type: Number, required: true },
    success: { type: Boolean, required: true },
    meta: { type: mongoose.Schema.Types.Mixed, default: null },
    ip: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

adminAuditLogSchema.index({ createdAt: -1 });
adminAuditLogSchema.index({ actor: 1, createdAt: -1 });
adminAuditLogSchema.index({ method: 1 });
adminAuditLogSchema.index({ actor_role: 1, createdAt: -1 });

toJSONPlugin(adminAuditLogSchema);

module.exports = mongoose.model('AdminAuditLog', adminAuditLogSchema);
