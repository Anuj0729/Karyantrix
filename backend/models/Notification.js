const mongoose = require('mongoose');
const toJSONPlugin = require('../utils/toJSON');

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, maxlength: 150 },
    message: { type: String, required: true, maxlength: 500 },
    type: { type: String, default: 'general' },
    related_requirement: { type: mongoose.Schema.Types.ObjectId, ref: 'Requirement', default: null },
    related_booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
    is_read: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

notificationSchema.index({ user: 1, is_read: 1 });
toJSONPlugin(notificationSchema);

module.exports = mongoose.model('Notification', notificationSchema);
