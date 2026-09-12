const mongoose = require('mongoose');
const toJSONPlugin = require('../utils/toJSON');

const requirementSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    services: {
      type: [{ type: String, trim: true, maxlength: 150 }],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: 'At least one service is required',
      },
    },
    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    budget: { type: Number, required: true, min: 0 },
    experience_levels: {
      type: [{ type: String, enum: ['any', 'beginner', 'intermediate', 'expert'] }],
      default: ['any'],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: 'At least one experience level is required',
      },
    },
    media: [
      {
        url: { type: String, required: true },
        type: { type: String, enum: ['image', 'video'], required: true },
      },
    ],
    location: {
      text: { type: String, required: true, trim: true, maxlength: 150 },
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      geo: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], default: undefined },
      },
    },
    status: { type: String, enum: ['open', 'closed'], default: 'open' },
    post_type: { type: String, enum: ['bids', 'fixed'], default: 'bids' },
    target_provider: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    hired_provider: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    hired_bid: { type: mongoose.Schema.Types.ObjectId, ref: 'Bid', default: null },
    hired_at: { type: Date, default: null },
    interested_providers: [
      {
        provider: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        message: { type: String, default: null, maxlength: 500 },
        created_at: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

requirementSchema.index({ customer: 1 });
requirementSchema.index({ createdAt: -1 });
requirementSchema.index({ status: 1, createdAt: -1 });
requirementSchema.index({ 'location.geo': '2dsphere' });

requirementSchema.pre('validate', function keepGeoInSync(next) {
  if (this.location && typeof this.location.lat === 'number' && typeof this.location.lng === 'number') {
    this.location.geo = { type: 'Point', coordinates: [this.location.lng, this.location.lat] };
  }
  next();
});

toJSONPlugin(requirementSchema);

module.exports = mongoose.model('Requirement', requirementSchema);
