const crypto = require('crypto');
const { Booking, Notification, WalletTransaction, PlatformSetting } = require('../models');
const { getRazorpay } = require('../config/razorpay');
const { toPaise } = require('../utils/payments');
const { emitToUser } = require('../sockets/socketHandler');

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

const CUSTOMER_CANCELLATION_REASONS = [
  'change_of_plans',
  'found_another_provider',
  'price_too_high',
  'no_longer_needed',
  'provider_unresponsive',
  'other',
];

const PROVIDER_CANCELLATION_REASONS = [
  'unavailable',
  'customer_unresponsive',
  'scope_mismatch',
  'pricing_dispute',
  'safety_concern',
  'other',
];

const notify = async (userId, title, message, extra = {}) => {
  const notification = await Notification.create({ user: userId, title, message, type: 'booking', ...extra });
  emitToUser(userId, 'notification', notification);
  return notification;
};

const populateBooking = (query) =>
  query
    .populate({ path: 'customer', select: 'id name avatar_url email phone' })
    .populate({ path: 'provider', select: 'id name avatar_url email phone' })
    .populate({ path: 'requirement', select: 'id services description budget status' });

const verifySignature = (orderId, paymentId, signature) => {
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  return expected === signature;
};

const getMyBookings = async (req, res, next) => {
  try {
    const filter = req.user.role === 'provider' ? { provider: req.user.id } : { customer: req.user.id };
    const bookings = await populateBooking(Booking.find(filter).sort({ createdAt: -1 }));
    res.json({ bookings });
  } catch (error) {
    next(error);
  }
};

const getBooking = async (req, res, next) => {
  try {
    const booking = await populateBooking(Booking.findById(req.params.id));
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.customer.id !== req.user.id && booking.provider.id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You do not have access to this booking' });
    }
    res.json({ booking });
  } catch (error) {
    next(error);
  }
};

const createAdvanceOrder = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.customer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the customer on this booking can pay the advance' });
    }
    if (booking.status !== 'awaiting_advance' || booking.advance.status === 'paid') {
      return res.status(400).json({ message: 'The advance for this booking is not due (it may already be paid)' });
    }

    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount: toPaise(booking.advance_amount),
      currency: 'INR',
      receipt: `adv_${booking.id}`,
      notes: { booking_id: booking.id, leg: 'advance' },
    });

    booking.advance.razorpay_order_id = order.id;
    await booking.save();

    res.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.RAZORPAY_KEY_ID,
      booking_id: booking.id,
    });
  } catch (error) {
    next(error);
  }
};

const verifyAdvancePayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: 'Missing payment verification fields' });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.customer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the customer on this booking can verify this payment' });
    }
    if (booking.advance.razorpay_order_id !== razorpay_order_id) {
      return res.status(400).json({ message: 'This order does not match this booking' });
    }
    if (booking.advance.status === 'paid') {
      return res.status(400).json({ message: 'Advance already recorded as paid' });
    }
    if (!verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
      return res.status(400).json({ message: 'Payment verification failed' });
    }

    booking.advance.status = 'paid';
    booking.advance.razorpay_payment_id = razorpay_payment_id;
    booking.advance.paid_at = new Date();
    booking.status = 'in_progress';
    await booking.save();

    await WalletTransaction.create({
      booking: booking._id,
      customer: booking.customer,
      provider: booking.provider,
      type: 'advance_received',
      direction: 'credit',
      amount: booking.advance_amount,
      status: 'completed',
      method: 'razorpay',
      reference: razorpay_payment_id,
      resolved_at: booking.advance.paid_at,
    });

    await notify(
      booking.provider,
      'Advance payment received',
      `The customer paid the \u20b9${booking.advance_amount} advance. You can start the work now.`,
      { related_requirement: booking.requirement }
    );
    emitToUser(booking.provider, 'booking_updated', { booking_id: booking.id, status: booking.status });
    emitToUser(booking.customer, 'booking_updated', { booking_id: booking.id, status: booking.status });

    res.json({ message: 'Advance payment verified, work can begin', booking });
  } catch (error) {
    next(error);
  }
};

const addProgressUpdate = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.provider.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the hired provider can post progress updates' });
    }
    if (booking.status !== 'in_progress') {
      return res.status(400).json({ message: 'Progress updates can only be posted while the job is in progress' });
    }

    const { note, is_final } = req.body;
    if (!note || !note.trim()) {
      return res.status(400).json({ message: 'A short note describing the work done is required' });
    }
    const files = req.files || [];
    if (files.length === 0) {
      return res.status(400).json({ message: 'At least one photo or video of the work is required' });
    }

    const media = files.map((f) => ({
      url: `/uploads/booking-progress/${f.filename}`,
      type: f.mimetype.startsWith('video/') ? 'video' : 'image',
    }));

    booking.progress_updates.push({
      note: note.trim(),
      media,
      is_final: is_final === true || is_final === 'true',
      status: 'pending',
    });
    await booking.save();

    const update = booking.progress_updates[booking.progress_updates.length - 1];

    await notify(
      booking.customer,
      update.is_final ? 'Provider says the job is complete' : "Today's progress update",
      update.is_final
        ? 'Your provider has shared photos/videos and marked the job as fully done. Please review and approve.'
        : 'Your provider shared photos/videos of the work done today. Take a look.',
      { related_requirement: booking.requirement }
    );
    emitToUser(booking.customer, 'booking_progress_update', { booking_id: booking.id, update });

    res.status(201).json({ message: 'Progress update posted', booking });
  } catch (error) {
    next(error);
  }
};

const respondToProgressUpdate = async (req, res, next) => {
  try {
    const { action, feedback } = req.body;
    if (!['approve', 'request_changes'].includes(action)) {
      return res.status(400).json({ message: "action must be 'approve' or 'request_changes'" });
    }
    if (action === 'request_changes' && (!feedback || !feedback.trim())) {
      return res.status(400).json({ message: 'Please describe what needs to change' });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.customer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the customer on this booking can respond to progress updates' });
    }

    const update = booking.progress_updates.id(req.params.updateId);
    if (!update) return res.status(404).json({ message: 'Progress update not found' });
    if (update.status !== 'pending') {
      return res.status(400).json({ message: 'This update has already been responded to' });
    }

    update.status = action === 'approve' ? 'approved' : 'changes_requested';
    update.customer_feedback = feedback ? feedback.trim() : null;
    update.responded_at = new Date();
    await booking.save();

    await notify(
      booking.provider,
      action === 'approve' ? 'Progress update approved' : 'Customer requested changes',
      action === 'approve'
        ? update.is_final
          ? 'The customer approved the final update. You can now mark the job as fully completed.'
          : 'The customer approved your progress update. Keep going.'
        : `The customer asked for changes: ${update.customer_feedback}`,
      { related_requirement: booking.requirement }
    );
    emitToUser(booking.provider, 'booking_progress_update', { booking_id: booking.id, update });

    res.json({ message: 'Response recorded', booking });
  } catch (error) {
    next(error);
  }
};

const markWorkCompleted = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.provider.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the hired provider can mark this work as completed' });
    }
    if (booking.status !== 'in_progress') {
      return res.status(400).json({ message: 'Work can only be marked completed once the advance has been paid and it is in progress' });
    }

    const finalUpdate = [...booking.progress_updates].reverse().find((u) => u.is_final);
    if (!finalUpdate) {
      return res.status(400).json({
        message: 'Post a final progress update (with photos/videos of the finished job) before completing the booking',
      });
    }
    if (finalUpdate.status === 'changes_requested') {
      return res.status(400).json({
        message: 'The customer requested changes on the final update. Address the feedback and post a new final update.',
      });
    }
    if (finalUpdate.status !== 'approved') {
      return res.status(400).json({
        message: 'Waiting on the customer to approve the final progress update before this can be completed',
      });
    }

    booking.status = 'work_completed';
    booking.work_completed_at = new Date();
    await booking.save();

    await notify(
      booking.customer,
      'Work marked as completed',
      `Your provider marked the job as done. Please pay the remaining \u20b9${booking.balance_amount} to close it out.`,
      { related_requirement: booking.requirement }
    );
    emitToUser(booking.customer, 'booking_updated', { booking_id: booking.id, status: booking.status });
    emitToUser(booking.provider, 'booking_updated', { booking_id: booking.id, status: booking.status });

    res.json({ message: 'Work marked as completed', booking });
  } catch (error) {
    next(error);
  }
};

const createBalanceOrder = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.customer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the customer on this booking can pay the balance' });
    }
    if (booking.status !== 'work_completed' || booking.balance.status === 'paid') {
      return res.status(400).json({ message: 'The balance is not due yet (it may already be paid)' });
    }

    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount: toPaise(booking.balance_amount),
      currency: 'INR',
      receipt: `bal_${booking.id}`,
      notes: { booking_id: booking.id, leg: 'balance' },
    });

    booking.balance.razorpay_order_id = order.id;
    await booking.save();

    res.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.RAZORPAY_KEY_ID,
      booking_id: booking.id,
    });
  } catch (error) {
    next(error);
  }
};

const verifyBalancePayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: 'Missing payment verification fields' });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.customer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the customer on this booking can verify this payment' });
    }
    if (booking.balance.razorpay_order_id !== razorpay_order_id) {
      return res.status(400).json({ message: 'This order does not match this booking' });
    }
    if (booking.balance.status === 'paid') {
      return res.status(400).json({ message: 'Balance already recorded as paid' });
    }
    if (!verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
      return res.status(400).json({ message: 'Payment verification failed' });
    }

    booking.balance.status = 'paid';
    booking.balance.razorpay_payment_id = razorpay_payment_id;
    booking.balance.paid_at = new Date();
    booking.status = 'completed';

    const settings = await PlatformSetting.getGlobal();
    const payoutSlaDays = settings.payout_sla_days;
    const expectedPayoutDate = new Date(Date.now() + payoutSlaDays * 24 * 60 * 60 * 1000);
    booking.payout_expected_at = expectedPayoutDate;

    await booking.save();

    await WalletTransaction.create({
      booking: booking._id,
      customer: booking.customer,
      provider: booking.provider,
      type: 'balance_received',
      direction: 'credit',
      amount: booking.balance_amount,
      status: 'completed',
      method: 'razorpay',
      reference: razorpay_payment_id,
      resolved_at: booking.balance.paid_at,
    });

    const payableAmount = Math.round((booking.total_amount * (100 - settings.commission_percent)) / 100 * 100) / 100;

    await notify(
      booking.provider,
      'Final payment received',
      `The customer paid the remaining \u20b9${booking.balance_amount}. This booking is fully paid. Your payout of \u20b9${payableAmount} (after ${settings.commission_percent}% platform commission) will be sent within ${payoutSlaDays} business day${payoutSlaDays === 1 ? '' : 's'}, by ${expectedPayoutDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}.`,
      { related_requirement: booking.requirement }
    );
    emitToUser(booking.provider, 'booking_updated', { booking_id: booking.id, status: booking.status });
    emitToUser(booking.customer, 'booking_updated', { booking_id: booking.id, status: booking.status });

    res.json({ message: 'Balance payment verified, booking completed', booking });
  } catch (error) {
    next(error);
  }
};

const cancelBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const isCustomer = booking.customer.toString() === req.user.id;
    const isProvider = booking.provider.toString() === req.user.id;
    if (!isCustomer && !isProvider) {
      return res.status(403).json({ message: 'You do not have access to this booking' });
    }

    if (!['awaiting_advance', 'in_progress'].includes(booking.status)) {
      return res.status(400).json({
        message:
          booking.status === 'cancelled'
            ? 'This booking has already been cancelled'
            : 'This booking can no longer be cancelled — the work has already been marked completed',
      });
    }

    const { reason, details } = req.body;
    const role = isCustomer ? 'customer' : 'provider';
    const allowedReasons = isCustomer ? CUSTOMER_CANCELLATION_REASONS : PROVIDER_CANCELLATION_REASONS;
    if (!reason || !allowedReasons.includes(reason)) {
      return res.status(400).json({ message: `reason must be one of: ${allowedReasons.join(', ')}` });
    }
    if (!details || !details.trim()) {
      return res.status(400).json({ message: 'Please add a short explanation for the cancellation' });
    }

    const settings = await PlatformSetting.getGlobal();
    const feePercent = isCustomer ? settings.customer_cancellation_fee_percent : settings.provider_cancellation_fee_percent;
    const advancePaid = booking.advance.status === 'paid';

    const feeBase = advancePaid ? booking.advance_amount : booking.total_amount;
    const feeAmount = round2((feeBase * feePercent) / 100);

    const alreadyPaidByCustomer = advancePaid ? booking.advance_amount : 0;
    const refundAmount = isCustomer ? round2(Math.max(0, alreadyPaidByCustomer - feeAmount)) : round2(alreadyPaidByCustomer);

    booking.status = 'cancelled';
    booking.cancellation = {
      cancelled_by_role: role,
      cancelled_by: req.user.id,
      reason,
      details: details.trim(),
      fee_percent: feePercent,
      fee_amount: feeAmount,
      fee_charged_to: role,
      refund_amount: refundAmount,
      cancelled_at: new Date(),
    };
    await booking.save();

    if (feeAmount > 0) {
      await WalletTransaction.create({
        booking: booking._id,
        customer: booking.customer,
        provider: booking.provider,
        type: 'cancellation_fee',
        direction: 'credit',
        amount: feeAmount,
        status: advancePaid ? 'completed' : 'pending',
        method: 'other',
        notes: `${role === 'customer' ? 'Customer' : 'Provider'} cancellation fee (${feePercent}%) — reason: ${reason}`,
        recorded_by: null,
        resolved_at: advancePaid ? new Date() : null,
      });
    }

    if (refundAmount > 0) {
      await WalletTransaction.create({
        booking: booking._id,
        customer: booking.customer,
        provider: booking.provider,
        type: 'refund',
        direction: 'debit',
        amount: refundAmount,
        status: 'pending',
        method: 'other',
        notes: `Refund following booking cancellation by ${role}`,
        recorded_by: null,
      });
    }

    const otherPartyId = isCustomer ? booking.provider : booking.customer;
    const feeNote = feeAmount > 0 ? ` A ${feePercent}% cancellation fee (\u20b9${feeAmount}) applies to the ${role}.` : '';
    const refundNote = refundAmount > 0 ? ` \u20b9${refundAmount} will be refunded to the customer.` : '';

    await notify(
      otherPartyId,
      'Booking cancelled',
      `The ${role} cancelled this booking. Reason: ${details.trim()}.${feeNote}${refundNote}`,
      { related_requirement: booking.requirement }
    );
    emitToUser(booking.provider, 'booking_updated', { booking_id: booking.id, status: booking.status });
    emitToUser(booking.customer, 'booking_updated', { booking_id: booking.id, status: booking.status });

    res.json({ message: 'Booking cancelled', booking });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyBookings,
  getBooking,
  createAdvanceOrder,
  verifyAdvancePayment,
  addProgressUpdate,
  respondToProgressUpdate,
  markWorkCompleted,
  createBalanceOrder,
  verifyBalancePayment,
  cancelBooking,
  CUSTOMER_CANCELLATION_REASONS,
  PROVIDER_CANCELLATION_REASONS,
};
