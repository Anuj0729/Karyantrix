const { Report, User, Notification } = require('../models');
const { emitToUser } = require('../sockets/socketHandler');

const VALID_REASONS = [
  'spam_or_scam',
  'fraud_or_non_payment',
  'abusive_behavior',
  'fake_profile',
  'poor_service_quality',
  'inappropriate_content',
  'safety_concern',
  'other',
];

const createReport = async (req, res, next) => {
  try {
    const { reported_user_id, reason, description, requirement_id, conversation_id } = req.body;

    if (!reported_user_id || !reason || !description) {
      return res.status(400).json({ message: 'reported_user_id, reason and description are required' });
    }
    if (!VALID_REASONS.includes(reason)) {
      return res.status(400).json({ message: `reason must be one of: ${VALID_REASONS.join(', ')}` });
    }
    if (!description.trim()) {
      return res.status(400).json({ message: 'Please describe the issue' });
    }
    if (reported_user_id === req.user.id) {
      return res.status(400).json({ message: 'You cannot report yourself' });
    }

    const reportedUser = await User.findById(reported_user_id);
    if (!reportedUser) return res.status(404).json({ message: 'The account you are trying to report was not found' });

    const allowedTargetRole = req.user.role === 'customer' ? 'provider' : req.user.role === 'provider' ? 'customer' : null;
    if (!allowedTargetRole || reportedUser.role !== allowedTargetRole) {
      return res.status(400).json({
        message:
          req.user.role === 'customer'
            ? 'Customers can only report a provider profile'
            : 'Providers can only report a customer profile',
      });
    }

    const report = await Report.create({
      reporter: req.user.id,
      reporter_role: req.user.role,
      reported_user: reportedUser.id,
      reported_role: reportedUser.role,
      reason,
      description: description.trim(),
      context: {
        requirement: requirement_id || null,
        conversation: conversation_id || null,
      },
    });

    res.status(201).json({ message: 'Report submitted. Our team will review it shortly.', report });
  } catch (error) {
    next(error);
  }
};

const getReports = async (req, res, next) => {
  try {
    const { status, reason, reported_role } = req.query;
    const where = {};
    if (status && status !== 'all') where.status = status;
    if (reason && reason !== 'all') where.reason = reason;
    if (reported_role && reported_role !== 'all') where.reported_role = reported_role;

    const reports = await Report.find(where)
      .populate({ path: 'reporter', select: 'id name email phone avatar_url role' })
      .populate({ path: 'reported_user', select: 'id name email phone avatar_url role account_status is_active' })
      .populate({ path: 'resolved_by', select: 'id name' })
      .sort({ createdAt: -1 })
      .limit(300);

    res.json({ reports });
  } catch (error) {
    next(error);
  }
};

const getReportById = async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate({ path: 'reporter', select: 'id name email phone avatar_url role' })
      .populate({ path: 'reported_user', select: 'id name email phone avatar_url role account_status is_active createdAt' })
      .populate({ path: 'resolved_by', select: 'id name' })
      .populate({ path: 'context.requirement', select: 'id title status' });

    if (!report) return res.status(404).json({ message: 'Report not found' });

    const priorReportsCount = await Report.countDocuments({
      reported_user: report.reported_user?.id,
      _id: { $ne: report.id },
    });

    const obj = report.toJSON();
    obj.prior_reports_against_user = priorReportsCount;
    res.json({ report: obj });
  } catch (error) {
    next(error);
  }
};

const resolveReport = async (req, res, next) => {
  try {
    const { action, admin_notes } = req.body;
    const validActions = ['dismiss', 'warn', 'suspend', 'ban'];
    if (!validActions.includes(action)) {
      return res.status(400).json({ message: `action must be one of: ${validActions.join(', ')}` });
    }

    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found' });
    if (['action_taken', 'dismissed'].includes(report.status)) {
      return res.status(400).json({ message: 'This report has already been resolved' });
    }

    const reportedUser = await User.findById(report.reported_user);
    if (!reportedUser) return res.status(404).json({ message: 'Reported account no longer exists' });

    let notifTitle = null;
    let notifMessage = null;

    if (action === 'dismiss') {
      report.status = 'dismissed';
      report.action_taken = 'none';
    } else if (action === 'warn') {
      report.status = 'action_taken';
      report.action_taken = 'warning_sent';
      notifTitle = 'Warning from Karyantrix';
      notifMessage =
        admin_notes ||
        'A report was filed against your account and reviewed by our team. Please make sure you follow our community guidelines to avoid further action.';
    } else if (action === 'suspend') {
      reportedUser.account_status = 'suspended';
      reportedUser.is_active = false;
      await reportedUser.save();
      report.status = 'action_taken';
      report.action_taken = 'account_suspended';
      notifTitle = 'Your account has been suspended';
      notifMessage =
        admin_notes || 'Your account has been temporarily suspended following a review of a report filed against you. Contact support for details.';
    } else if (action === 'ban') {
      reportedUser.account_status = 'banned';
      reportedUser.is_active = false;
      reportedUser.tokenVersion = (reportedUser.tokenVersion || 0) + 1;
      await reportedUser.save();
      report.status = 'action_taken';
      report.action_taken = 'account_banned';
      notifTitle = 'Your account has been banned';
      notifMessage = admin_notes || 'Your account has been permanently banned following a review of a report filed against you.';
    }

    report.admin_notes = admin_notes || report.admin_notes;
    report.resolved_by = req.user.id;
    report.resolved_at = new Date();
    await report.save();

    if (notifTitle) {
      await Notification.create({ user: reportedUser.id, title: notifTitle, message: notifMessage, type: 'moderation' });
      emitToUser(reportedUser.id.toString(), 'notification', { title: notifTitle, message: notifMessage });
    }

    await report.populate({ path: 'reported_user', select: 'id name email phone avatar_url role account_status is_active' });
    res.json({ message: `Report ${action === 'dismiss' ? 'dismissed' : 'resolved'}`, report });
  } catch (error) {
    next(error);
  }
};

module.exports = { createReport, getReports, getReportById, resolveReport };
