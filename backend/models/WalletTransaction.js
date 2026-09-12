const mongoose = require('mongoose');
const toJSONPlugin = require('../utils/toJSON');

const walletTransactionSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    provider: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    type: {
      type: String,
      enum: ['advance_received', 'balance_received', 'payout', 'refund', 'adjustment', 'cancellation_fee'],
      required: true,
    },
    direction: { type: String, enum: ['credit', 'debit'], required: true },

    amount: { type: Number, required: true, min: 0 },

    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'completed' },

    method: { type: String, enum: ['razorpay', 'bank_transfer', 'upi', 'cash', 'other'], default: 'razorpay' },
    reference: { type: String, default: null, trim: true, maxlength: 120 },
    notes: { type: String, default: null, trim: true, maxlength: 1000 },

    recorded_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    resolved_at: { type: Date, default: null },
  },
  { timestamps: true }
);

walletTransactionSchema.index({ customer: 1, status: 1 });
walletTransactionSchema.index({ provider: 1, status: 1 });
walletTransactionSchema.index({ booking: 1 });
walletTransactionSchema.index({ type: 1, status: 1 });
walletTransactionSchema.index({ createdAt: -1 });

toJSONPlugin(walletTransactionSchema);

module.exports = mongoose.model('WalletTransaction', walletTransactionSchema);
