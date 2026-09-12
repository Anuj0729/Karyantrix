const { User, ProviderProfile, Report } = require('../models');

const MONTHS_BACK = 6;
const DAY_MS = 24 * 60 * 60 * 1000;

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

const alignToSkeleton = (skeleton, rows) => {
  const byMonth = new Map(rows.map((r) => [r._id, r.count]));
  return skeleton.map((month) => ({ month, count: byMonth.get(month) || 0 }));
};

const monthlyCountPipeline = (match) => [
  { $match: match },
  { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 } } },
];

const getAnalytics = async (req, res, next) => {
  try {
    const skeleton = monthSkeleton();
    const since = monthsAgoDate();
    const thirtyDaysAgo = new Date(Date.now() - 30 * DAY_MS);

    const [
      totalCustomers,
      activeCustomers,
      newCustomers30d,
      customerGrowthRows,
      totalProviders,
      approvedProviders,
      pendingApplications,
      newProviders30d,
      providerGrowthRows,
      topCategoryRows,
      totalReports,
      reportsByStatusRows,
      reportsByReasonRows,
      reportTrendRows,
      openReportsAgainstProviders,
      openReportsAgainstCustomers,
    ] = await Promise.all([
      User.countDocuments({ role: 'customer' }),
      User.countDocuments({ role: 'customer', is_active: true }),
      User.countDocuments({ role: 'customer', createdAt: { $gte: thirtyDaysAgo } }),
      User.aggregate(monthlyCountPipeline({ role: 'customer', createdAt: { $gte: since } })),

      User.countDocuments({ role: 'provider' }),
      ProviderProfile.countDocuments({ is_approved: true }),
      ProviderProfile.countDocuments({ application_status: { $in: ['submitted', 'under_review'] } }),
      User.countDocuments({ role: 'provider', createdAt: { $gte: thirtyDaysAgo } }),
      User.aggregate(monthlyCountPipeline({ role: 'provider', createdAt: { $gte: since } })),
      ProviderProfile.aggregate([
        { $unwind: '$categories' },
        { $group: { _id: '$categories', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 6 },
        { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'category' } },
        { $unwind: '$category' },
        { $project: { _id: 0, category_id: '$_id', name: '$category.name', count: 1 } },
      ]),

      Report.countDocuments(),
      Report.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Report.aggregate([{ $group: { _id: '$reason', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      Report.aggregate(monthlyCountPipeline({ createdAt: { $gte: since } })),
      Report.countDocuments({ reported_role: 'provider', status: { $in: ['pending', 'under_review'] } }),
      Report.countDocuments({ reported_role: 'customer', status: { $in: ['pending', 'under_review'] } }),
    ]);

    const statusMap = Object.fromEntries(reportsByStatusRows.map((r) => [r._id, r.count]));

    res.json({
      customers: {
        total: totalCustomers,
        active: activeCustomers,
        inactive: totalCustomers - activeCustomers,
        new_last_30_days: newCustomers30d,
        monthly_signups: alignToSkeleton(skeleton, customerGrowthRows),
      },
      providers: {
        total: totalProviders,
        approved: approvedProviders,
        pending_applications: pendingApplications,
        new_last_30_days: newProviders30d,
        monthly_signups: alignToSkeleton(skeleton, providerGrowthRows),
        top_categories: topCategoryRows,
      },
      reports: {
        total: totalReports,
        pending: statusMap.pending || 0,
        under_review: statusMap.under_review || 0,
        action_taken: statusMap.action_taken || 0,
        dismissed: statusMap.dismissed || 0,
        open_against_providers: openReportsAgainstProviders,
        open_against_customers: openReportsAgainstCustomers,
        by_reason: reportsByReasonRows.map((r) => ({ reason: r._id, count: r.count })),
        monthly_trend: alignToSkeleton(skeleton, reportTrendRows),
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAnalytics };
