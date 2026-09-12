const mongoose = require('mongoose');
const toJSONPlugin = require('../utils/toJSON');

const reportSchema = new mongoose.Schema(
  {
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reporter_role: { type: String, enum: ['customer', 'provider'], required: true },

    reported_user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reported_role: { type: String, enum: ['customer', 'provider'], required: true },

    reason: {
      type: String,
      enum: [
        'spam_or_scam',
        'fraud_or_non_payment',
        'abusive_behavior',
        'fake_profile',
        'poor_service_quality',
        'inappropriate_content',
        'safety_concern',
        'other',
      ],
      required: true,
    },
    description: { type: String, required: true, trim: true, maxlength: 1000 },

    context: {
      requirement: { type: mongoose.Schema.Types.ObjectId, ref: 'Requirement', default: null },
      conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', default: null },
    },

    status: {
      type: String,
      enum: ['pending', 'under_review', 'action_taken', 'dismissed'],
      default: 'pending',
    },
    action_taken: {
      type: String,
      enum: ['none', 'warning_sent', 'account_suspended', 'account_banned'],
      default: 'none',
    },
    admin_notes: { type: String, default: null, maxlength: 1000 },
    resolved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    resolved_at: { type: Date, default: null },
  },
  { timestamps: true }
);

reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ reported_user: 1 });
reportSchema.index({ reporter: 1, reported_user: 1 });

toJSONPlugin(reportSchema);

module.exports = mongoose.model('Report', reportSchema);
