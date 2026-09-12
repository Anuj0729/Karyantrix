const mongoose = require('mongoose');
const toJSONPlugin = require('../utils/toJSON');

const conversationSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    provider: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    last_message_preview: { type: String, default: null, maxlength: 200 },
    last_message_type: { type: String, enum: ['text', 'image', 'video', 'audio'], default: null },
    last_message_at: { type: Date, default: null },
    last_message_sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    customer_unread_count: { type: Number, default: 0 },
    provider_unread_count: { type: Number, default: 0 },
  },
  { timestamps: true }
);

conversationSchema.index({ customer: 1, provider: 1 }, { unique: true });
conversationSchema.index({ customer: 1, last_message_at: -1 });
conversationSchema.index({ provider: 1, last_message_at: -1 });

toJSONPlugin(conversationSchema);

module.exports = mongoose.model('Conversation', conversationSchema);
