const mongoose = require('mongoose');
const toJSONPlugin = require('../utils/toJSON');

const messageSchema = new mongoose.Schema(
  {
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['text', 'image', 'video', 'audio'], default: 'text' },

    text: { type: String, default: null, maxlength: 2000 },

    media: {
      url: { type: String, default: null },
      media_type: { type: String, enum: ['image', 'video', 'audio', null], default: null },
      upload_id: { type: mongoose.Schema.Types.ObjectId, ref: 'UploadSession', default: null },
      is_voice_note: { type: Boolean, default: false },
    },

    is_read: { type: Boolean, default: false },

    is_edited: { type: Boolean, default: false },
    edited_at: { type: Date, default: null },

    deleted_for: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      default: [],
      select: false,
    },

    is_deleted_for_everyone: { type: Boolean, default: false },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true }
);

messageSchema.index({ conversation: 1, createdAt: -1 });

toJSONPlugin(messageSchema);

module.exports = mongoose.model('Message', messageSchema);
