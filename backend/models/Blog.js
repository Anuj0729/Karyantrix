const mongoose = require('mongoose');
const toJSONPlugin = require('../utils/toJSON');

// Blog posts are managed exclusively from the admin panel (admin/staff roles)
// but are readable by everyone — customers, providers and signed-out visitors.
const blogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    slug: { type: String, required: true, unique: true, trim: true, maxlength: 200, index: true },
    excerpt: { type: String, default: null, maxlength: 300 },
    content: { type: String, required: true },
    cover_image: { type: String, default: null },
    tags: { type: [String], default: [] },
    status: { type: String, enum: ['draft', 'scheduled', 'published'], default: 'draft', index: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    published_at: { type: Date, default: null },
    // When status is 'scheduled', this is the future moment the post should
    // automatically become 'published' (see publishDueScheduledBlogs in
    // blogController.js, which flips it over the moment it's due).
    scheduled_at: { type: Date, default: null },
  },
  { timestamps: true }
);

blogSchema.index({ status: 1, published_at: -1 });
blogSchema.index({ status: 1, scheduled_at: 1 });

toJSONPlugin(blogSchema);

module.exports = mongoose.model('Blog', blogSchema);
