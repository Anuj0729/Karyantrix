const mongoose = require('mongoose');
const { User, ProviderProfile, Requirement, Category, Service, Notification, Report, Bid, Booking } = require('../models');
const { emitToUser } = require('../sockets/socketHandler');

const getDashboardStats = async (req, res, next) => {
  try {
    const [
      totalCustomers,
      totalProviders,
      totalRequirements,
      closedRequirements,
      totalCategories,
      pendingReports,
      cancelledBookings,
      pendingProviderApplications,
    ] = await Promise.all([
      User.countDocuments({ role: 'customer' }),
      User.countDocuments({ role: 'provider' }),
      Requirement.countDocuments(),
      Requirement.countDocuments({ status: 'closed' }),
      Category.countDocuments({ is_active: true }),
      Report.countDocuments({ status: { $in: ['pending', 'under_review'] } }),
      Booking.countDocuments({ status: 'cancelled' }),
      ProviderProfile.countDocuments({ application_status: { $in: ['submitted', 'under_review'] } }),
    ]);

    res.json({
      stats: {
        totalCustomers,
        totalProviders,
        totalRequirements,
        closedRequirements,
        totalCategories,
        pendingReports,
        cancelledBookings,
        pendingProviderApplications,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getUsers = async (req, res, next) => {
  try {
    const { role } = req.query;
    // The signed-in admin never sees their own account in this list (other admins still do).
    const where = role ? { role } : {};
    where._id = { $ne: req.user._id };
    const users = await User.find(where).sort({ createdAt: -1 });

    const providerIds = users.filter((u) => u.role === 'provider').map((u) => u.id);
    const profiles = await ProviderProfile.find({ user: { $in: providerIds } });
    const profileByUserId = new Map(profiles.map((p) => [p.user.toString(), p]));

    const result = users.map((u) => {
      const obj = u.toJSON();
      obj.providerProfile = profileByUserId.get(obj.id) || null;
      return obj;
    });

    res.json({ users: result });
  } catch (error) {
    next(error);
  }
};

const PROVIDER_DOCUMENT_TYPES = [
  { key: 'aadhar_front', label: 'Aadhaar card - front' },
  { key: 'aadhar_back', label: 'Aadhaar card - back' },
  { key: 'passbook_front', label: 'Bank passbook - front page' },
  { key: 'live_photo', label: 'Live profile photo' },
];

const buildDocuments = (kyc) => {
  const uploaded = kyc || {};
  return PROVIDER_DOCUMENT_TYPES.map(({ key, label }) => ({ key, label, url: uploaded[key] || null }));
};

// Lightweight list for the admin "Provider Documents" landing view: who the provider is and how many
// of their documents are in. The documents themselves are loaded per provider by getProviderDocumentDetail.
const getProviderDocuments = async (req, res, next) => {
  try {
    const profiles = await ProviderProfile.find({})
      .select('user kyc_documents application_status verification_status professional_title updatedAt')
      .populate({ path: 'user', select: 'id name email phone avatar_url role' })
      .sort({ updatedAt: -1 });

    const providers = profiles
      .filter((p) => p.user)
      .map((p) => {
        const documents = buildDocuments(p.kyc_documents);
        return {
          id: p.id,
          user: {
            id: p.user.id,
            name: p.user.name,
            email: p.user.email,
            phone: p.user.phone,
            avatar_url: p.user.avatar_url,
            role: p.user.role,
          },
          professional_title: p.professional_title,
          application_status: p.application_status,
          verification_status: p.verification_status,
          updatedAt: p.updatedAt,
          uploaded_count: documents.filter((d) => d.url).length,
          total_count: documents.length,
        };
      });

    res.json({ providers });
  } catch (error) {
    next(error);
  }
};

// One provider / applicant: contact details, what they offer, where they are, and their uploaded documents.
// `:id` is the provider profile id (the same `id` returned by getProviderDocuments).
const getProviderDocumentDetail = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: 'Provider not found' });
    }

    const profile = await ProviderProfile.findById(req.params.id)
      .populate({ path: 'user', select: 'id name email phone avatar_url role location' })
      .populate({ path: 'categories', select: 'id name' });

    if (!profile || !profile.user) {
      return res.status(404).json({ message: 'Provider not found' });
    }

    const services = await Service.find({ provider: profile.user._id, is_active: true })
      .populate({ path: 'category', select: 'id name' })
      .sort({ title: 1 });

    // Categories the provider chose on their profile plus the ones their listed services belong to.
    const categoryById = new Map();
    (profile.categories || []).forEach((c) => c && categoryById.set(c.id, { id: c.id, name: c.name }));
    services.forEach((s) => s.category && categoryById.set(s.category.id, { id: s.category.id, name: s.category.name }));

    const documents = buildDocuments(profile.kyc_documents);

    res.json({
      provider: {
        id: profile.id,
        user: {
          id: profile.user.id,
          name: profile.user.name,
          email: profile.user.email,
          phone: profile.user.phone,
          avatar_url: profile.user.avatar_url,
          role: profile.user.role,
        },
        professional_title: profile.professional_title,
        application_status: profile.application_status,
        verification_status: profile.verification_status,
        location: profile.location?.text || profile.city || profile.service_area || profile.user.location || null,
        categories: [...categoryById.values()].sort((a, b) => a.name.localeCompare(b.name)),
        services: services.map((s) => ({
          id: s.id,
          title: s.title,
          category: s.category ? { id: s.category.id, name: s.category.name } : null,
        })),
        updatedAt: profile.updatedAt,
        documents,
        uploaded_count: documents.filter((d) => d.url).length,
        total_count: documents.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

const toggleUserActive = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.is_active = !user.is_active;
    await user.save();
    res.json({ message: `User ${user.is_active ? 'activated' : 'deactivated'}`, user });
  } catch (error) {
    next(error);
  }
};

const approveProvider = async (req, res, next) => {
  try {
    const profile = await ProviderProfile.findOne({ user: req.params.id });
    if (!profile) return res.status(404).json({ message: 'Provider profile not found' });
    profile.is_approved = true;
    await profile.save();

    emitToUser(req.params.id, 'notification', {
      title: 'Profile approved',
      message: 'Your provider profile has been verified and approved by the admin team',
    });

    res.json({ message: 'Provider approved', profile });
  } catch (error) {
    next(error);
  }
};

const getApplications = async (req, res, next) => {
  try {
    const { status } = req.query;
    const where =
      !status || status === 'all'
        ? {}
        : status === 'pending_review'
        ? { application_status: { $in: ['submitted', 'under_review'] } }
        : { application_status: status };

    const profiles = await ProviderProfile.find(where)
      .populate({ path: 'user', select: 'id name email phone avatar_url createdAt' })
      .populate('categories', 'id name slug')
      .sort({ updatedAt: -1 });

    const providerIds = profiles.map((p) => p.user?.id).filter(Boolean);
    const counts = await Service.aggregate([
      { $match: { provider: { $in: providerIds.map((id) => new mongoose.Types.ObjectId(id)) } } },
      { $group: { _id: '$provider', count: { $sum: 1 } } },
    ]);
    const countByProvider = new Map(counts.map((c) => [c._id.toString(), c.count]));

    const withServiceCounts = profiles.map((p) => {
      const obj = p.toJSON();
      obj.service_count = countByProvider.get(p.user?.id) || 0;
      return obj;
    });

    res.json({ applications: withServiceCounts });
  } catch (error) {
    next(error);
  }
};

const reviewApplication = async (req, res, next) => {
  try {
    const { action, feedback } = req.body;
    if (!['approve', 'reject', 'changes_required'].includes(action)) {
      return res.status(400).json({ message: 'action must be one of: approve, reject, changes_required' });
    }

    const profile = await ProviderProfile.findOne({ user: req.params.userId });
    if (!profile) return res.status(404).json({ message: 'Application not found' });
    if (!['submitted', 'under_review'].includes(profile.application_status)) {
      return res.status(400).json({ message: `Application is currently "${profile.application_status}" and is not awaiting review` });
    }

    if (action === 'approve') {
      profile.application_status = 'approved';
      profile.is_approved = true;
      profile.verification_status = 'verified';
      profile.application_feedback = null;
      await profile.save();

      await User.findByIdAndUpdate(req.params.userId, { role: 'provider' });

      emitToUser(req.params.userId, 'notification', {
        title: 'Provider application approved',
        message: 'Congratulations! Your provider application has been approved. You can now access your provider dashboard.',
      });
      await Notification.create({
        user: req.params.userId,
        title: 'Provider application approved',
        message: 'Congratulations! Your provider application has been approved. You can now access your provider dashboard.',
        type: 'application_status',
      });
    } else {
      profile.application_status = action === 'reject' ? 'rejected' : 'changes_required';
      profile.application_feedback = feedback || null;
      await profile.save();

      const title = action === 'reject' ? 'Provider application rejected' : 'Changes required on your application';
      const message =
        feedback ||
        (action === 'reject'
          ? 'Your provider application was not approved this time.'
          : 'Your provider application needs a few changes before it can be approved.');

      emitToUser(req.params.userId, 'notification', { title, message });
      await Notification.create({ user: req.params.userId, title, message, type: 'application_status' });
    }

    res.json({ message: `Application ${action === 'approve' ? 'approved' : action.replace('_', ' ')}`, profile });
  } catch (error) {
    next(error);
  }
};

const getAllRequirements = async (req, res, next) => {
  try {
    const { status } = req.query;
    const where = status ? { status } : {};
    const requirements = await Requirement.find(where)
      .populate({ path: 'customer', select: 'id name phone avatar_url' })
      .populate({ path: 'hired_provider', select: 'id name phone' })
      .populate('categories', 'id name slug')
      .sort({ createdAt: -1 })
      .limit(200);

    const bidCounts = await Bid.aggregate([
      { $match: { requirement: { $in: requirements.map((r) => r._id) } } },
      { $group: { _id: '$requirement', count: { $sum: 1 } } },
    ]);
    const bidCountMap = new Map(bidCounts.map((b) => [b._id.toString(), b.count]));

    const withBidCounts = requirements.map((r) => {
      const json = r.toJSON();
      json.bid_count = bidCountMap.get(r.id) || 0;
      return json;
    });

    res.json({ requirements: withBidCounts });
  } catch (error) {
    next(error);
  }
};

const getCancelledBookings = async (req, res, next) => {
  try {
    const { cancelled_by_role, reason } = req.query;
    const where = { status: 'cancelled' };
    if (cancelled_by_role) where['cancellation.cancelled_by_role'] = cancelled_by_role;
    if (reason) where['cancellation.reason'] = reason;

    const bookings = await Booking.find(where)
      .populate({ path: 'customer', select: 'id name avatar_url email phone' })
      .populate({ path: 'provider', select: 'id name avatar_url email phone' })
      .populate({ path: 'cancellation.cancelled_by', select: 'id name role' })
      .populate({ path: 'requirement', select: 'id services description' })
      .sort({ 'cancellation.cancelled_at': -1 })
      .limit(200);

    res.json({ bookings });
  } catch (error) {
    next(error);
  }
};

const getCancellationAnalytics = async (req, res, next) => {
  try {
    const [totalCancelled, byRoleRows, byReasonRows, feesAgg, refundsAgg, totalBookings] = await Promise.all([
      Booking.countDocuments({ status: 'cancelled' }),
      Booking.aggregate([
        { $match: { status: 'cancelled' } },
        { $group: { _id: '$cancellation.cancelled_by_role', count: { $sum: 1 } } },
      ]),
      Booking.aggregate([
        { $match: { status: 'cancelled' } },
        { $group: { _id: '$cancellation.reason', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Booking.aggregate([
        { $match: { status: 'cancelled' } },
        { $group: { _id: null, total: { $sum: '$cancellation.fee_amount' } } },
      ]),
      Booking.aggregate([
        { $match: { status: 'cancelled' } },
        { $group: { _id: null, total: { $sum: '$cancellation.refund_amount' } } },
      ]),
      Booking.countDocuments(),
    ]);

    const byRole = Object.fromEntries(byRoleRows.map((r) => [r._id, r.count]));

    res.json({
      total_cancelled: totalCancelled,
      total_bookings: totalBookings,
      cancellation_rate: totalBookings > 0 ? Math.round((totalCancelled / totalBookings) * 1000) / 10 : 0,
      cancelled_by_customer: byRole.customer || 0,
      cancelled_by_provider: byRole.provider || 0,
      total_fees_collected: Math.round((feesAgg[0]?.total || 0) * 100) / 100,
      total_refunds_owed: Math.round((refundsAgg[0]?.total || 0) * 100) / 100,
      by_reason: byReasonRows.map((r) => ({ reason: r._id, count: r.count })),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats,
  getUsers,
  toggleUserActive,
  approveProvider,
  getApplications,
  reviewApplication,
  getAllRequirements,
  getProviderDocuments,
  getProviderDocumentDetail,
  getCancelledBookings,
  getCancellationAnalytics,
};