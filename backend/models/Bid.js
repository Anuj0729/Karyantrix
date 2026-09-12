const mongoose = require('mongoose');
const toJSONPlugin = require('../utils/toJSON');

const bidSchema = new mongoose.Schema(
  {
    requirement: { type: mongoose.Schema.Types.ObjectId, ref: 'Requirement', required: true },
    provider: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 0 },
    message: { type: String, default: null, trim: true, maxlength: 500 },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  },
  { timestamps: true }
);

bidSchema.index({ requirement: 1, provider: 1 });
bidSchema.index({ requirement: 1, createdAt: -1 });

toJSONPlugin(bidSchema);

module.exports = mongoose.model('Bid', bidSchema);
