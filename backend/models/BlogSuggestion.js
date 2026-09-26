const mongoose = require('mongoose');
const toJSONPlugin = require('../utils/toJSON');

const replySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true, trim: true, maxlength: 1000 },
    edited: { type: Boolean, default: false },
  },
  { timestamps: true }
);
toJSONPlugin(replySchema);

const blogSuggestionSchema = new mongoose.Schema(
  {
    blog: { type: mongoose.Schema.Types.ObjectId, ref: 'Blog', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true, trim: true, maxlength: 1000 },
    edited: { type: Boolean, default: false },
    replies: { type: [replySchema], default: [] },
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

blogSuggestionSchema.index({ blog: 1, createdAt: -1 });

toJSONPlugin(blogSuggestionSchema);

module.exports = mongoose.model('BlogSuggestion', blogSuggestionSchema);
