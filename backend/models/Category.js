const mongoose = require('mongoose');
const toJSONPlugin = require('../utils/toJSON');

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    slug: { type: String, required: true, unique: true, trim: true, maxlength: 120 },
    description: { type: String, default: null, maxlength: 255 },
    icon: { type: String, default: null },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: false }
);

categorySchema.index({ is_active: 1 });

toJSONPlugin(categorySchema);

module.exports = mongoose.model('Category', categorySchema);
