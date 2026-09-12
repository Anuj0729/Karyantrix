const mongoose = require('mongoose');
const toJSONPlugin = require('../utils/toJSON');

const paymentLegSchema = new mongoose.Schema(
  {
    status: { type: String, enum: ['pending', 'paid'], default: 'pending' },
    razorpay_order_id: { type: String, default: null },
    razorpay_payment_id: { type: String, default: null },
    paid_at: { type: Date, default: null },
  },
  { _id: false }
);

const progressUpdateSchema = new mongoose.Schema(
  {
    note: { type: String, required: true, trim: true, maxlength: 2000 },
    media: [
      {
        url: { type: String, required: true },
        type: { type: String, enum: ['image', 'video'], required: true },
      },
    ],
    is_final: { type: Boolean, default: false },
    status: { type: String, enum: ['pending', 'approved', 'changes_requested'], default: 'pending' },
    customer_feedback: { type: String, default: null, maxlength: 2000 },
    responded_at: { type: Date, default: null },
  },
  { timestamps: true }
);

const cancellationSchema = new mongoose.Schema(
  {
    cancelled_by_role: { type: String, enum: ['customer', 'provider'], required: true },
    cancelled_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: {
      type: String,
      enum: [
        'change_of_plans',
        'found_another_provider',
        'price_too_high',
        'no_longer_needed',
        'provider_unresponsive',
        'customer_unresponsive',
        'unavailable',
        'scope_mismatch',
        'pricing_dispute',
        'safety_concern',
        'other',
      ],
      required: true,
    },
    details: { type: String, required: true, trim: true, maxlength: 1000 },

    fee_percent: { type: Number, default: 0, min: 0, max: 100 },
    fee_amount: { type: Number, default: 0, min: 0 },
    fee_charged_to: { type: String, enum: ['customer', 'provider'], required: true },
    refund_amount: { type: Number, default: 0, min: 0 },

    cancelled_at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const bookingSchema = new mongoose.Schema(
  {
    requirement: { type: mongoose.Schema.Types.ObjectId, ref: 'Requirement', required: true, unique: true },
    bid: { type: mongoose.Schema.Types.ObjectId, ref: 'Bid', required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    provider: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    total_amount: { type: Number, required: true, min: 0 },
    advance_percent: { type: Number, required: true, min: 0, max: 100 },
    advance_amount: { type: Number, required: true, min: 0 },
    balance_amount: { type: Number, required: true, min: 0 },

    status: {
      type: String,
      enum: ['awaiting_advance', 'in_progress', 'work_completed', 'completed', 'cancelled'],
      default: 'awaiting_advance',
    },

    advance: { type: paymentLegSchema, default: () => ({}) },
    balance: { type: paymentLegSchema, default: () => ({}) },

    cancellation: { type: cancellationSchema, default: null },

    progress_updates: { type: [progressUpdateSchema], default: [] },

    work_completed_at: { type: Date, default: null },
    payout_expected_at: { type: Date, default: null },
  },
  { timestamps: true }
);

bookingSchema.index({ customer: 1 });
bookingSchema.index({ provider: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ 'cancellation.cancelled_by_role': 1 });
bookingSchema.index({ 'cancellation.reason': 1 });

toJSONPlugin(bookingSchema);

module.exports = mongoose.model('Booking', bookingSchema);
