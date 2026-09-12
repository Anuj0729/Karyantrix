require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../config/db');
const { Requirement, ProviderProfile } = require('../models');

const backfill = async (Model, label) => {
  const cursor = Model.find({
    'location.lat': { $type: 'number' },
    'location.lng': { $type: 'number' },
    'location.geo': { $exists: false },
  }).cursor();

  let updated = 0;
  for await (const doc of cursor) {
    doc.location.geo = { type: 'Point', coordinates: [doc.location.lng, doc.location.lat] };
    await doc.save({ validateModifiedOnly: true });
    updated += 1;
  }
};

(async () => {
  await connectDB();
  await backfill(Requirement, 'Requirement');
  await backfill(ProviderProfile, 'ProviderProfile');
  await mongoose.disconnect();
})().catch((err) => {
  process.exit(1);
});
