const mongoose = require('mongoose');
const toJSONPlugin = require('../utils/toJSON');

const serviceCatalogSchema = new mongoose.Schema(
  {
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    name: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, default: null, maxlength: 255 },
    is_active: { type: Boolean, default: true },
    deactivated_by_category: { type: Boolean, default: false },
  },
  { timestamps: false }
);

serviceCatalogSchema.index({ category: 1 });

toJSONPlugin(serviceCatalogSchema);

module.exports = mongoose.model('ServiceCatalog', serviceCatalogSchema);
