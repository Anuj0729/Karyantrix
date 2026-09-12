const { Booking, WalletTransaction, PlatformSetting, User, Notification } = require('../models');
const { emitToUser } = require('../sockets/socketHandler');

const notifyProviderOfPayout = async (providerId, amount, reference) => {
  const notification = await Notification.create({
    user: providerId,
    title: 'Payout sent',
    message: `A payout of \u20b9${amount} has been sent to you${reference ? ` (ref: ${reference})` : ''}. Check your bank/UPI account.`,
    type: 'payout',
  });
  emitToUser(providerId, 'notification', notification);
};

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

const getSettings = async (req, res, next) => {
  try {
    const settings = await PlatformSetting.getGlobal();
    res.json({ settings });
  } catch (error) {
    next(error);
  }
};

const updateSettings = async (req, res, next) => {
  try {
    const { commission_percent, payout_sla_days, customer_cancellation_fee_percent, provider_cancellation_fee_percent } = req.body;
    const settings = await PlatformSetting.getGlobal();

    if (commission_percent !== undefined) {
      if (Number.isNaN(Number(commission_percent)) || commission_percent < 0 || commission_percent > 100) {
        return res.status(400).json({ message: 'commission_percent must be a number between 0 and 100' });
      }
      settings.commission_percent = commission_percent;
    }

    if (payout_sla_days !== undefined) {
      if (Number.isNaN(Number(payout_sla_days)) || payout_sla_days < 0 || payout_sla_days > 60) {
        return res.status(400).json({ message: 'payout_sla_days must be a number between 0 and 60' });
      }
      settings.payout_sla_days = payout_sla_days;
    }

    if (customer_cancellation_fee_percent !== undefined) {
      if (
        Number.isNaN(Number(customer_cancellation_fee_percent)) ||
        customer_cancellation_fee_percent < 0 ||
        customer_cancellation_fee_percent > 100
      ) {
        return res.status(400).json({ message: 'customer_cancellation_fee_percent must be a number between 0 and 100' });
      }
      settings.customer_cancellation_fee_percent = customer_cancellation_fee_percent;
    }

    if (provider_cancellation_fee_percent !== undefined) {
      if (
        Number.isNaN(Number(provider_cancellation_fee_percent)) ||
        provider_cancellation_fee_percent < 0 ||
        provider_cancellation_fee_percent > 100
      ) {
        return res.status(400).json({ message: 'provider_cancellation_fee_percent must be a number between 0 and 100' });
      }
      settings.provider_cancellation_fee_percent = provider_cancellation_fee_percent;
    }

    await settings.save();

    res.json({ message: 'Settings updated', settings });
  } catch (error) {
    next(error);
  }
};

const getSummary = async (req, res, next) => {
  try {
    const settings = await PlatformSetting.getGlobal();
    const commissionPercent = settings.commission_percent;

    const [receivedAgg, pendingRefundAgg, paidRefundAgg, paidPayoutAgg, pendingPayoutTxnAgg, completedBookingsAgg, bookingsWithDues] =
      await Promise.all([
        WalletTransaction.aggregate([
          { $match: { direction: 'credit', status: 'completed' } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        WalletTransaction.aggregate([
          { $match: { type: 'refund', status: 'pending' } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        WalletTransaction.aggregate([
          { $match: { type: 'refund', status: 'completed' } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        WalletTransaction.aggregate([
          { $match: { type: 'payout', status: 'completed' } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        WalletTransaction.aggregate([
          { $match: { type: 'payout', status: 'pending' } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        Booking.aggregate([
          { $match: { status: 'completed' } },
          { $group: { _id: null, total: { $sum: '$total_amount' }, count: { $sum: 1 } } },
        ]),
        Booking.find({
          $or: [{ 'advance.status': 'pending' }, { $and: [{ status: { $in: ['work_completed'] } }, { 'balance.status': 'pending' }] }],
        }).select('advance_amount balance_amount advance balance status'),
      ]);

    const totalReceived = round2(receivedAgg[0]?.total || 0);
    const totalRefundsPending = round2(pendingRefundAgg[0]?.total || 0);
    const totalRefundsPaid = round2(paidRefundAgg[0]?.total || 0);
    const totalPayoutsPaid = round2(paidPayoutAgg[0]?.total || 0);
    const totalPayoutsPendingLogged = round2(pendingPayoutTxnAgg[0]?.total || 0);

    const grossCompletedBookings = round2(completedBookingsAgg[0]?.total || 0);
    const commissionEarned = round2((grossCompletedBookings * commissionPercent) / 100);
    const totalPayableToProviders = round2(grossCompletedBookings - commissionEarned);
    const totalPayoutsPendingComputed = round2(totalPayableToProviders - totalPayoutsPaid);

    const totalPendingFromCustomers = round2(
      bookingsWithDues.reduce((sum, b) => {
        let due = 0;
        if (b.advance?.status !== 'paid') due += b.advance_amount || 0;
        if (b.status === 'work_completed' && b.balance?.status !== 'paid') due += b.balance_amount || 0;
        return sum + due;
      }, 0)
    );

    res.json({
      totals: {
        totalReceivedFromCustomers: totalReceived,
        totalPendingFromCustomers,
        totalRefundsPending,
        totalRefundsPaid,
        totalPayoutsPaid,
        totalPayoutsPendingLogged,
        totalPayoutsPending: Math.max(0, totalPayoutsPendingComputed),
        commissionEarned,
        commissionPercent,
        payoutSlaDays: settings.payout_sla_days,
        customerCancellationFeePercent: settings.customer_cancellation_fee_percent,
        providerCancellationFeePercent: settings.provider_cancellation_fee_percent,
        netPlatformHoldings: round2(totalReceived - totalRefundsPaid - totalPayoutsPaid),
        completedBookingsCount: completedBookingsAgg[0]?.count || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getReceivedFromCustomers = async (req, res, next) => {
  try {
    const { search } = req.query;

    const rows = await WalletTransaction.aggregate([
      { $match: { direction: 'credit', status: 'completed', customer: { $ne: null } } },
      {
        $group: {
          _id: '$customer',
          total_received: { $sum: '$amount' },
          transactions_count: { $sum: 1 },
          last_payment_at: { $max: { $ifNull: ['$resolved_at', '$createdAt'] } },
        },
      },
      { $sort: { total_received: -1 } },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'customer',
        },
      },
      { $unwind: '$customer' },
      {
        $project: {
          _id: 0,
          customer_id: '$_id',
          name: '$customer.name',
          email: '$customer.email',
          phone: '$customer.phone',
          avatar_url: '$customer.avatar_url',
          total_received: 1,
          transactions_count: 1,
          last_payment_at: 1,
        },
      },
    ]);

    const filtered = search
      ? rows.filter((r) => {
          const term = search.toLowerCase();
          return r.name?.toLowerCase().includes(term) || r.email?.toLowerCase().includes(term) || r.phone?.includes(term);
        })
      : rows;

    res.json({ customers: filtered.map((r) => ({ ...r, total_received: round2(r.total_received) })) });
  } catch (error) {
    next(error);
  }
};

const getPendingDues = async (req, res, next) => {
  try {
    const bookings = await Booking.find({
      $or: [{ 'advance.status': 'pending' }, { 'balance.status': 'pending' }],
      status: { $ne: 'completed' },
    })
      .populate({ path: 'customer', select: 'id name email phone avatar_url' })
      .populate({ path: 'provider', select: 'id name' })
      .sort({ createdAt: -1 });

    const items = [];
    for (const b of bookings) {
      if (b.advance.status !== 'paid') {
        items.push({
          booking_id: b.id,
          customer: b.customer,
          provider: b.provider,
          leg: 'advance',
          amount: b.advance_amount,
          due_now: b.status === 'awaiting_advance',
          booking_status: b.status,
          created_at: b.createdAt,
        });
      }
      if (b.status === 'work_completed' && b.balance.status !== 'paid') {
        items.push({
          booking_id: b.id,
          customer: b.customer,
          provider: b.provider,
          leg: 'balance',
          amount: b.balance_amount,
          due_now: true,
          booking_status: b.status,
          created_at: b.createdAt,
        });
      } else if (b.status === 'in_progress' && b.balance.status !== 'paid') {
        items.push({
          booking_id: b.id,
          customer: b.customer,
          provider: b.provider,
          leg: 'balance',
          amount: b.balance_amount,
          due_now: false,
          booking_status: b.status,
          created_at: b.createdAt,
        });
      }
    }

    const byCustomer = new Map();
    for (const item of items) {
      const key = item.customer?.id || 'unknown';
      if (!byCustomer.has(key)) {
        byCustomer.set(key, { customer: item.customer, total_pending: 0, due_now_total: 0, items: [] });
      }
      const entry = byCustomer.get(key);
      entry.total_pending = round2(entry.total_pending + item.amount);
      if (item.due_now) entry.due_now_total = round2(entry.due_now_total + item.amount);
      entry.items.push(item);
    }

    res.json({ customers: Array.from(byCustomer.values()).sort((a, b) => b.due_now_total - a.due_now_total) });
  } catch (error) {
    next(error);
  }
};

const getPendingPayouts = async (req, res, next) => {
  try {
    const settings = await PlatformSetting.getGlobal();
    const commissionPercent = settings.commission_percent;

    const bookings = await Booking.find({ status: 'completed' })
      .populate({ path: 'provider', select: 'id name email phone avatar_url' })
      .populate({ path: 'customer', select: 'id name' })
      .sort({ work_completed_at: -1 });

    const bookingIds = bookings.map((b) => b._id);
    const paidAgg = await WalletTransaction.aggregate([
      { $match: { type: 'payout', status: 'completed', booking: { $in: bookingIds } } },
      { $group: { _id: '$booking', paid: { $sum: '$amount' } } },
    ]);
    const paidByBooking = new Map(paidAgg.map((p) => [p._id.toString(), p.paid]));

    const byProvider = new Map();
    for (const b of bookings) {
      const payable = round2((b.total_amount * (100 - commissionPercent)) / 100);
      const alreadyPaid = round2(paidByBooking.get(b.id) || 0);
      const pending = round2(payable - alreadyPaid);
      if (pending <= 0.01) continue;

      const key = b.provider?.id || 'unknown';
      if (!byProvider.has(key)) {
        byProvider.set(key, { provider: b.provider, total_pending: 0, bookings: [] });
      }
      const entry = byProvider.get(key);
      entry.total_pending = round2(entry.total_pending + pending);
      entry.bookings.push({
        booking_id: b.id,
        customer: b.customer,
        total_amount: b.total_amount,
        payable_amount: payable,
        already_paid: alreadyPaid,
        pending_amount: pending,
        work_completed_at: b.work_completed_at,
      });
    }

    res.json({
      commission_percent: commissionPercent,
      providers: Array.from(byProvider.values()).sort((a, b) => b.total_pending - a.total_pending),
    });
  } catch (error) {
    next(error);
  }
};

const createPayout = async (req, res, next) => {
  try {
    const { booking: bookingId, amount, method, reference, notes, mark_completed } = req.body;
    if (!bookingId || !amount || Number(amount) <= 0) {
      return res.status(400).json({ message: 'booking and a positive amount are required' });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const txn = await WalletTransaction.create({
      booking: booking._id,
      customer: booking.customer,
      provider: booking.provider,
      type: 'payout',
      direction: 'debit',
      amount: Number(amount),
      status: mark_completed ? 'completed' : 'pending',
      method: method || 'bank_transfer',
      reference: reference || null,
      notes: notes || null,
      recorded_by: req.user.id,
      resolved_at: mark_completed ? new Date() : null,
    });

    if (mark_completed) {
      await notifyProviderOfPayout(booking.provider, Number(amount), reference);
    }

    res.status(201).json({ message: 'Payout logged', transaction: txn });
  } catch (error) {
    next(error);
  }
};

const getRefunds = async (req, res, next) => {
  try {
    const { status } = req.query;
    const where = { type: 'refund' };
    if (status) where.status = status;

    const refunds = await WalletTransaction.find(where)
      .populate({ path: 'customer', select: 'id name email phone avatar_url' })
      .populate({ path: 'booking', select: 'id total_amount status' })
      .populate({ path: 'recorded_by', select: 'id name' })
      .sort({ createdAt: -1 });

    res.json({ refunds });
  } catch (error) {
    next(error);
  }
};

const createRefund = async (req, res, next) => {
  try {
    const { booking: bookingId, customer: customerId, amount, method, reference, notes, mark_completed } = req.body;
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ message: 'A positive amount is required' });
    }
    if (!bookingId && !customerId) {
      return res.status(400).json({ message: 'Either booking or customer is required' });
    }

    let booking = null;
    let customer = customerId || null;
    let provider = null;
    if (bookingId) {
      booking = await Booking.findById(bookingId);
      if (!booking) return res.status(404).json({ message: 'Booking not found' });
      customer = booking.customer;
      provider = booking.provider;
    }

    const txn = await WalletTransaction.create({
      booking: booking?._id || null,
      customer,
      provider,
      type: 'refund',
      direction: 'debit',
      amount: Number(amount),
      status: mark_completed ? 'completed' : 'pending',
      method: method || 'bank_transfer',
      reference: reference || null,
      notes: notes || null,
      recorded_by: req.user.id,
      resolved_at: mark_completed ? new Date() : null,
    });

    res.status(201).json({ message: 'Refund logged', transaction: txn });
  } catch (error) {
    next(error);
  }
};

const resolveTransaction = async (req, res, next) => {
  try {
    const { status, reference, notes } = req.body;
    if (!['completed', 'failed'].includes(status)) {
      return res.status(400).json({ message: "status must be 'completed' or 'failed'" });
    }

    const txn = await WalletTransaction.findById(req.params.id);
    if (!txn) return res.status(404).json({ message: 'Transaction not found' });
    if (!['payout', 'refund'].includes(txn.type)) {
      return res.status(400).json({ message: 'Only payout or refund entries can be resolved this way' });
    }
    if (txn.status !== 'pending') {
      return res.status(400).json({ message: 'This transaction has already been resolved' });
    }

    txn.status = status;
    if (reference) txn.reference = reference;
    if (notes) txn.notes = notes;
    txn.resolved_at = new Date();
    await txn.save();

    if (txn.type === 'payout' && status === 'completed' && txn.provider) {
      await notifyProviderOfPayout(txn.provider, txn.amount, txn.reference);
    }

    res.json({ message: `Transaction marked as ${status}`, transaction: txn });
  } catch (error) {
    next(error);
  }
};

const getHistory = async (req, res, next) => {
  try {
    const { type, direction, status, user, booking, from, to, page = 1, limit = 25 } = req.query;
    const where = {};
    if (type) where.type = type;
    if (direction) where.direction = direction;
    if (status) where.status = status;
    if (booking) where.booking = booking;
    if (user) where.$or = [{ customer: user }, { provider: user }];
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.$gte = new Date(from);
      if (to) where.createdAt.$lte = new Date(to);
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));

    const [transactions, total] = await Promise.all([
      WalletTransaction.find(where)
        .populate({ path: 'customer', select: 'id name email phone avatar_url' })
        .populate({ path: 'provider', select: 'id name email phone avatar_url' })
        .populate({ path: 'booking', select: 'id total_amount status' })
        .populate({ path: 'recorded_by', select: 'id name' })
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      WalletTransaction.countDocuments(where),
    ]);

    res.json({
      transactions,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    next(error);
  }
};

const MONTHS_BACK = 6;

const monthSkeleton = (monthsBack = MONTHS_BACK) => {
  const out = [];
  const now = new Date();
  for (let i = monthsBack - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return out;
};

const monthsAgoDate = (monthsBack = MONTHS_BACK) => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1), 1);
};

const getAnalytics = async (req, res, next) => {
  try {
    const skeleton = monthSkeleton();
    const since = monthsAgoDate();
    const settings = await PlatformSetting.getGlobal();

    const [receivedRows, paidOutRows, refundedRows, topCustomers, topProviders] = await Promise.all([
      WalletTransaction.aggregate([
        { $match: { direction: 'credit', status: 'completed', createdAt: { $gte: since } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, total: { $sum: '$amount' } } },
      ]),
      WalletTransaction.aggregate([
        { $match: { type: 'payout', status: 'completed', createdAt: { $gte: since } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, total: { $sum: '$amount' } } },
      ]),
      WalletTransaction.aggregate([
        { $match: { type: 'refund', status: 'completed', createdAt: { $gte: since } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, total: { $sum: '$amount' } } },
      ]),
      WalletTransaction.aggregate([
        { $match: { direction: 'credit', status: 'completed', customer: { $ne: null } } },
        { $group: { _id: '$customer', total: { $sum: '$amount' } } },
        { $sort: { total: -1 } },
        { $limit: 5 },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
        { $unwind: '$user' },
        { $project: { _id: 0, name: '$user.name', total: 1 } },
      ]),
      Booking.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: '$provider', total: { $sum: '$total_amount' } } },
        { $sort: { total: -1 } },
        { $limit: 5 },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
        { $unwind: '$user' },
        { $project: { _id: 0, name: '$user.name', total: 1 } },
      ]),
    ]);

    const alignToSkeleton = (rows) => {
      const byMonth = new Map(rows.map((r) => [r._id, round2(r.total)]));
      return skeleton.map((month) => ({ month, amount: byMonth.get(month) || 0 }));
    };

    res.json({
      commission_percent: settings.commission_percent,
      monthly_received: alignToSkeleton(receivedRows),
      monthly_paid_out: alignToSkeleton(paidOutRows),
      monthly_refunded: alignToSkeleton(refundedRows),
      top_customers_by_spend: topCustomers.map((c) => ({ ...c, total: round2(c.total) })),
      top_providers_by_earnings: topProviders.map((p) => ({ ...p, total: round2(p.total) })),
    });
  } catch (error) {
    next(error);
  }
};

const getMyEarnings = async (req, res, next) => {
  try {
    const providerId = req.user.id;
    const settings = await PlatformSetting.getGlobal();
    const commissionPercent = settings.commission_percent;

    const [completedBookings, inProgressBookings, payoutHistory] = await Promise.all([
      Booking.find({ provider: providerId, status: 'completed' })
        .populate({ path: 'customer', select: 'id name' })
        .sort({ work_completed_at: -1 }),
      Booking.find({ provider: providerId, status: { $in: ['in_progress', 'work_completed'] } })
        .populate({ path: 'customer', select: 'id name' })
        .sort({ createdAt: -1 }),
      WalletTransaction.find({ provider: providerId, type: 'payout' })
        .populate({ path: 'booking', select: 'id total_amount' })
        .sort({ createdAt: -1 }),
    ]);

    const bookingIds = completedBookings.map((b) => b._id);
    const paidAgg = await WalletTransaction.aggregate([
      { $match: { type: 'payout', status: 'completed', booking: { $in: bookingIds } } },
      { $group: { _id: '$booking', paid: { $sum: '$amount' } } },
    ]);
    const paidByBooking = new Map(paidAgg.map((p) => [p._id.toString(), p.paid]));

    let totalPending = 0;
    const awaitingPayout = [];
    for (const b of completedBookings) {
      const payable = round2((b.total_amount * (100 - commissionPercent)) / 100);
      const alreadyPaid = round2(paidByBooking.get(b.id) || 0);
      const pending = round2(payable - alreadyPaid);
      if (pending <= 0.01) continue;
      totalPending = round2(totalPending + pending);
      awaitingPayout.push({
        booking_id: b.id,
        customer: b.customer,
        total_amount: b.total_amount,
        payable_amount: payable,
        already_paid: alreadyPaid,
        pending_amount: pending,
        work_completed_at: b.work_completed_at,
        expected_by: b.payout_expected_at,
      });
    }

    const upcoming = inProgressBookings.map((b) => ({
      booking_id: b.id,
      customer: b.customer,
      total_amount: b.total_amount,
      estimated_payable: round2((b.total_amount * (100 - commissionPercent)) / 100),
      status: b.status,
    }));

    res.json({
      commission_percent: commissionPercent,
      payout_sla_days: settings.payout_sla_days,
      total_pending_payout: totalPending,
      awaiting_payout: awaitingPayout,
      upcoming_bookings: upcoming,
      payout_history: payoutHistory,
    });
  } catch (error) {
    next(error);
  }
};

const getMyWallet = async (req, res, next) => {
  try {
    const providerId = req.user.id;
    const settings = await PlatformSetting.getGlobal();
    const commissionPercent = settings.commission_percent;

    const [completedBookings, payoutTxns, cancelledAtProviderFault] = await Promise.all([
      Booking.find({ provider: providerId, status: 'completed' })
        .populate({ path: 'customer', select: 'id name avatar_url' })
        .sort({ work_completed_at: -1 }),
      WalletTransaction.find({ provider: providerId, type: 'payout' })
        .populate({ path: 'booking', select: 'id total_amount' })
        .populate({ path: 'customer', select: 'id name' })
        .sort({ createdAt: -1 }),
      Booking.find({ provider: providerId, 'cancellation.fee_charged_to': 'provider' })
        .populate({ path: 'customer', select: 'id name avatar_url' })
        .sort({ 'cancellation.cancelled_at': -1 }),
    ]);

    const bookingIds = completedBookings.map((b) => b._id);
    const paidAgg = await WalletTransaction.aggregate([
      { $match: { type: 'payout', status: 'completed', booking: { $in: bookingIds } } },
      { $group: { _id: '$booking', paid: { $sum: '$amount' } } },
    ]);
    const paidByBooking = new Map(paidAgg.map((p) => [p._id.toString(), p.paid]));

    const cancelledBookingIds = cancelledAtProviderFault.map((b) => b._id);
    const cancellationFeeTxns = await WalletTransaction.find({
      type: 'cancellation_fee',
      booking: { $in: cancelledBookingIds },
    }).select('booking status');
    const feeStatusByBooking = new Map(cancellationFeeTxns.map((t) => [t.booking.toString(), t.status]));

    const totalReceived = round2(
      payoutTxns.filter((t) => t.status === 'completed').reduce((sum, t) => sum + t.amount, 0)
    );

    let totalPending = 0;
    const awaitingPayout = [];
    for (const b of completedBookings) {
      const payable = round2((b.total_amount * (100 - commissionPercent)) / 100);
      const alreadyPaid = round2(paidByBooking.get(b.id) || 0);
      const pending = round2(payable - alreadyPaid);
      if (pending <= 0.01) continue;
      totalPending = round2(totalPending + pending);
      awaitingPayout.push({
        booking_id: b.id,
        customer: b.customer,
        total_amount: b.total_amount,
        payable_amount: payable,
        already_paid: alreadyPaid,
        pending_amount: pending,
        work_completed_at: b.work_completed_at,
        expected_by: b.payout_expected_at,
      });
    }

    const totalCommissionDeducted = round2(
      completedBookings.reduce((sum, b) => sum + (b.total_amount * commissionPercent) / 100, 0)
    );
    const totalCancellationFeesDeducted = round2(
      cancelledAtProviderFault.reduce((sum, b) => sum + (b.cancellation?.fee_amount || 0), 0)
    );
    const totalDeducted = round2(totalCommissionDeducted + totalCancellationFeesDeducted);

    const history = [];

    for (const t of payoutTxns) {
      history.push({
        id: t.id,
        type: 'payout',
        direction: 'credit',
        amount: t.amount,
        status: t.status,
        method: t.method,
        reference: t.reference,
        notes: t.notes,
        booking_id: t.booking?.id || null,
        customer: t.customer || null,
        date: t.resolved_at || t.createdAt,
      });
    }

    for (const b of completedBookings) {
      const commission = round2((b.total_amount * commissionPercent) / 100);
      if (commission <= 0) continue;
      history.push({
        id: `commission-${b.id}`,
        type: 'commission',
        direction: 'debit',
        amount: commission,
        status: 'completed',
        method: null,
        reference: null,
        notes: `Platform commission (${commissionPercent}%) on booking with ${b.customer?.name || 'customer'}`,
        booking_id: b.id,
        customer: b.customer || null,
        date: b.work_completed_at || b.updatedAt,
      });
    }

    for (const b of cancelledAtProviderFault) {
      const fee = b.cancellation?.fee_amount || 0;
      if (fee <= 0) continue;
      history.push({
        id: `cancellation-${b.id}`,
        type: 'cancellation_fee',
        direction: 'debit',
        amount: fee,
        status: feeStatusByBooking.get(b.id) || 'pending',
        method: null,
        reference: null,
        notes: `Cancellation fee (${b.cancellation?.fee_percent}%) — reason: ${b.cancellation?.reason}`,
        booking_id: b.id,
        customer: b.customer || null,
        date: b.cancellation?.cancelled_at,
      });
    }

    history.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      commission_percent: commissionPercent,
      payout_sla_days: settings.payout_sla_days,
      summary: {
        totalReceived,
        totalPending,
        totalDeducted,
        totalCommissionDeducted,
        totalCancellationFeesDeducted,
      },
      awaiting_payout: awaitingPayout,
      history,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSettings,
  updateSettings,
  getSummary,
  getReceivedFromCustomers,
  getPendingDues,
  getPendingPayouts,
  createPayout,
  getRefunds,
  createRefund,
  resolveTransaction,
  getHistory,
  getAnalytics,
  getMyEarnings,
  getMyWallet,
};
