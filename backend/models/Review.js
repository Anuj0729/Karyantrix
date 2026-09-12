const mongoose = require('mongoose');
const toJSONPlugin = require('../utils/toJSON');

const reviewSchema = new mongoose.Schema(
  {
    requirement: { type: mongoose.Schema.Types.ObjectId, ref: 'Requirement', required: true, unique: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    provider: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: null },
    title: { type: String, default: null, maxlength: 150 },
    status: { type: String, enum: ['published', 'pending', 'flagged'], default: 'published' },
    provider_response: {
      text: { type: String, default: null, maxlength: 500 },
      responded_at: { type: Date, default: null },
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

reviewSchema.index({ provider: 1 });
toJSONPlugin(reviewSchema);

module.exports = mongoose.model('Review', reviewSchema);
