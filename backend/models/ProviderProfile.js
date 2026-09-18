const mongoose = require('mongoose');
const toJSONPlugin = require('../utils/toJSON');

const providerProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    bio: { type: String, default: null },
    service_area: { type: String, default: null },
    city: { type: String, default: null },
    experience_years: { type: Number, default: 0 },
    avg_rating: { type: Number, default: 0.0 },
    total_reviews: { type: Number, default: 0 },
    total_jobs_completed: { type: Number, default: 0 },
    is_approved: { type: Boolean, default: false },
    is_available: { type: Boolean, default: true },
    professional_title: { type: String, default: null, maxlength: 150 },
    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
    skills: [{ type: String, maxlength: 60 }],
    languages: [{ type: String, maxlength: 40 }],
    certifications: [
      {
        title: { type: String, maxlength: 150 },
        issuer: { type: String, maxlength: 150 },
        year: Number,
      },
    ],
    portfolio: [
      {
        image_url: String,
        title: { type: String, maxlength: 150 },
        description: { type: String, maxlength: 500 },
      },
    ],
    starting_price: { type: Number, default: null },
    starting_price_type: { type: String, enum: ['fixed', 'hourly', 'estimate'], default: 'fixed' },
    response_time_minutes: { type: Number, default: null },
    is_online: { type: Boolean, default: false },
    availability: {
      days: [{ type: String, enum: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] }],
      hours_from: { type: String, default: '09:00' },
      hours_to: { type: String, default: '18:00' },
      advance_booking_days: { type: Number, default: 1 },
    },
    service_radius_km: { type: Number, default: 5, min: 1, max: 200 },
    location: {
      text: { type: String, default: null, maxlength: 150 },
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      geo: {
        type: { type: String, enum: ['Point'], default: undefined },
        coordinates: { type: [Number], default: undefined },
      },
    },
    kyc_documents: {
      aadhar_front: { type: String, default: null },
      aadhar_back: { type: String, default: null },
      passbook_front: { type: String, default: null },
      live_photo: { type: String, default: null },
    },
    verification_status: { type: String, enum: ['unverified', 'pending', 'verified'], default: 'unverified' },
    application_status: {
      type: String,
      enum: ['draft', 'incomplete', 'submitted', 'under_review', 'approved', 'rejected', 'changes_required'],
      default: 'draft',
    },
    application_feedback: { type: String, default: null, maxlength: 1000 },
    repeat_customers: { type: Number, default: 0 },
    response_rate: { type: Number, default: null },
  },
  { timestamps: true }
);

providerProfileSchema.index({ is_approved: 1, avg_rating: -1 });
providerProfileSchema.index({ is_approved: 1, starting_price: 1 });
providerProfileSchema.index({ categories: 1 });
providerProfileSchema.index({ city: 1 });
providerProfileSchema.index({ application_status: 1 });
providerProfileSchema.index({ 'location.geo': '2dsphere' });

providerProfileSchema.pre('validate', function keepGeoInSync(next) {
  if (this.location && typeof this.location.lat === 'number' && typeof this.location.lng === 'number') {
    this.location.geo = { type: 'Point', coordinates: [this.location.lng, this.location.lat] };
  } else if (this.location) {
    this.location.geo = undefined;
  }
  next();
});

toJSONPlugin(providerProfileSchema);

module.exports = mongoose.model('ProviderProfile', providerProfileSchema);