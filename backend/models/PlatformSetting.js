const mongoose = require('mongoose');
const toJSONPlugin = require('../utils/toJSON');

const platformSettingSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'global', unique: true },
    commission_percent: { type: Number, default: 10, min: 0, max: 100 },
    payout_sla_days: { type: Number, default: 3, min: 0, max: 60 },

    customer_cancellation_fee_percent: { type: Number, default: 10, min: 0, max: 100 },
    provider_cancellation_fee_percent: { type: Number, default: 10, min: 0, max: 100 },
  },
  { timestamps: true }
);

toJSONPlugin(platformSettingSchema);

platformSettingSchema.statics.getGlobal = async function getGlobal() {
  return this.findOneAndUpdate(
    { key: 'global' },
    { $setOnInsert: { key: 'global', commission_percent: 10 } },
    { new: true, upsert: true }
  );
};

module.exports = mongoose.model('PlatformSetting', platformSettingSchema);
