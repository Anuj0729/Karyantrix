const mongoose = require('mongoose');
const toJSONPlugin = require('../utils/toJSON');

const serviceSchema = new mongoose.Schema(
  {
    provider: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    catalog_service: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceCatalog', required: true },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, default: null },
    price: { type: Number, required: true },
    price_type: { type: String, enum: ['fixed', 'hourly', 'estimate'], default: 'fixed' },
    duration_minutes: { type: Number, default: 60 },
    is_active: { type: Boolean, default: true },
    deactivated_by_category: { type: Boolean, default: false },
    deactivated_by_catalog_service: { type: Boolean, default: false },
    images: [{ type: String }],
    tags: [{ type: String, maxlength: 40 }],
    location: { type: String, default: null, maxlength: 150 },
    status: { type: String, enum: ['active', 'paused', 'draft'], default: 'active' },
    avg_rating: { type: Number, default: 0 },
    review_count: { type: Number, default: 0 },
  },
  { timestamps: true }
);

serviceSchema.index({ category: 1 });
serviceSchema.index({ provider: 1 });

serviceSchema.index({ is_active: 1, category: 1, createdAt: -1 });
serviceSchema.index({ is_active: 1, provider: 1 });
serviceSchema.index(
  { provider: 1, catalog_service: 1 },
  { unique: true, partialFilterExpression: { is_active: true } }
);
toJSONPlugin(serviceSchema);

module.exports = mongoose.model('Service', serviceSchema);
