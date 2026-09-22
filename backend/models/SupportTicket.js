const mongoose = require('mongoose');
const toJSONPlugin = require('../utils/toJSON');

const ticketMessageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sender_role: { type: String, enum: ['customer', 'provider', 'admin', 'staff'], required: true },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const supportTicketSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    user_role: { type: String, enum: ['customer', 'provider'], required: true },

    category: {
      type: String,
      enum: ['payment', 'payout', 'booking', 'account', 'technical', 'other'],
      required: true,
    },
    subject: { type: String, required: true, trim: true, maxlength: 150 },

    related_booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
    related_requirement: { type: mongoose.Schema.Types.ObjectId, ref: 'Requirement', default: null },

    status: { type: String, enum: ['open', 'in_progress', 'resolved', 'closed'], default: 'open' },
    priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },

    messages: { type: [ticketMessageSchema], default: [] },

    resolved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    resolved_at: { type: Date, default: null },
    last_message_at: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

supportTicketSchema.index({ user: 1, createdAt: -1 });
supportTicketSchema.index({ status: 1, last_message_at: -1 });
supportTicketSchema.index({ category: 1 });

toJSONPlugin(supportTicketSchema);

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
