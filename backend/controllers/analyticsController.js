const { User, ProviderProfile, Report, Booking, Requirement } = require('../models');

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


/* ------------------------------------------------------------------ */
/* Filterable chart endpoints (line / bar / pie)                       */
/* ------------------------------------------------------------------ */

const RANGE_MONTHS = [0, 1, 3, 6, 12]; // 0 = all time
const LINE_RANGE_MONTHS = [1, 3, 6, 12];
const GRANULARITIES = ['day', 'week', 'month'];

const parseMonths = (value, fallback, allowed = RANGE_MONTHS) => {
  const n = Number(value);
  return allowed.includes(n) ? n : fallback;
};

const parseLimit = (value, fallback = 6) => {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? Math.min(Math.max(n, 3), 12) : fallback;
};

const rangeMatch = (months) => {
  if (!months) return {};
  const now = new Date();
  return { createdAt: { $gte: new Date(now.getFullYear(), now.getMonth() - months, now.getDate()) } };
};

const pad = (n) => String(n).padStart(2, '0');
const localDateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const buildBuckets = (months, granularity) => {
  if (granularity === 'month') {
    const keys = monthSkeleton(months);
    return {
      since: monthsAgoDate(months),
      keys,
      labels: keys,
      groupExpr: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
    };
  }

  const stepMs = granularity === 'day' ? DAY_MS : 7 * DAY_MS;
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - months, now.getDate());
  const count = Math.floor((now.getTime() - start.getTime()) / stepMs) + 1;
  const keys = Array.from({ length: count }, (_, i) => i);
  const labels = keys.map((i) => localDateKey(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i * (stepMs / DAY_MS))));

  return {
    since: start,
    keys,
    labels,
    groupExpr: { $floor: { $divide: [{ $subtract: ['$createdAt', start] }, stepMs] } },
  };
};

const LINE_SERIES = {
  customers: { label: 'Customer sign-ups', model: User, match: { role: 'customer' } },
  providers: { label: 'Provider sign-ups', model: User, match: { role: 'provider' } },
  bookings: { label: 'Bookings', model: Booking, match: {} },
  requirements: { label: 'Requirements posted', model: Requirement, match: {} },
  reports: { label: 'Reports filed', model: Report, match: {} },
};

const getLineChart = async (req, res, next) => {
  try {
    const months = parseMonths(req.query.months, 6, LINE_RANGE_MONTHS);
    let granularity = GRANULARITIES.includes(req.query.granularity) ? req.query.granularity : 'month';
    if (granularity === 'day' && months > 3) granularity = 'week';
    if (granularity === 'month' && months < 3) granularity = 'week';

    let selected = [
      ...new Set(
        String(req.query.series || 'customers,providers')
          .split(',')
          .map((k) => k.trim())
          .filter((k) => LINE_SERIES[k])
      ),
    ];
    if (selected.length === 0) selected = ['customers', 'providers'];

    const buckets = buildBuckets(months, granularity);

    const results = await Promise.all(
      selected.map((key) =>
        LINE_SERIES[key].model.aggregate([
          { $match: { ...LINE_SERIES[key].match, createdAt: { $gte: buckets.since } } },
          { $group: { _id: buckets.groupExpr, count: { $sum: 1 } } },
        ])
      )
    );

    const series = selected.map((key, i) => {
      const byKey = new Map(results[i].map((r) => [r._id, r.count]));
      const points = buckets.keys.map((k) => byKey.get(k) || 0);
      return { key, label: LINE_SERIES[key].label, total: points.reduce((a, b) => a + b, 0), points };
    });

    res.json({ months, granularity, labels: buckets.labels, series });
  } catch (error) {
    next(error);
  }
};

const groupCount = (Model, field, match = {}) =>
  Model.aggregate([
    { $match: match },
    { $group: { _id: `$${field}`, count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

const categoryCoverage = (Model, match, limit) =>
  Model.aggregate([
    { $match: match },
    { $unwind: '$categories' },
    { $group: { _id: '$categories', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limit },
    { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'category' } },
    { $unwind: '$category' },
    { $project: { _id: 0, key: { $toString: '$_id' }, label: '$category.name', count: 1 } },
  ]);

const BAR_DATASETS = {
  provider_categories: (match, limit) => categoryCoverage(ProviderProfile, match, limit),
  requirement_categories: (match, limit) => categoryCoverage(Requirement, match, limit),
  report_reasons: async (match, limit) => {
    const rows = await groupCount(Report, 'reason', match);
    return rows.slice(0, limit).map((r) => ({ key: r._id, count: r.count }));
  },
};

const getBarChart = async (req, res, next) => {
  try {
    const dataset = req.query.dataset || 'provider_categories';
    const build = BAR_DATASETS[dataset];
    if (!build) return res.status(400).json({ message: 'Unknown bar chart dataset' });

    const months = parseMonths(req.query.months, 0);
    const limit = parseLimit(req.query.limit, 6);
    const items = await build(rangeMatch(months), limit);

    res.json({
      dataset,
      months,
      limit,
      total: items.reduce((sum, i) => sum + i.count, 0),
      items,
    });
  } catch (error) {
    next(error);
  }
};

const fromGroups = (rows) => rows.filter((r) => r._id).map((r) => ({ key: r._id, count: r.count }));

const PIE_DATASETS = {
  user_split: async (match) => {
    const [customers, providers] = await Promise.all([
      User.countDocuments({ ...match, role: 'customer' }),
      User.countDocuments({ ...match, role: 'provider' }),
    ]);
    return [
      { key: 'customer', count: customers },
      { key: 'provider', count: providers },
    ];
  },
  application_status: async (match) => fromGroups(await groupCount(ProviderProfile, 'application_status', match)),
  booking_status: async (match) => fromGroups(await groupCount(Booking, 'status', match)),
  requirement_status: async (match) => fromGroups(await groupCount(Requirement, 'status', match)),
  report_status: async (match) => fromGroups(await groupCount(Report, 'status', match)),
};

const getPieChart = async (req, res, next) => {
  try {
    const dataset = req.query.dataset || 'user_split';
    const build = PIE_DATASETS[dataset];
    if (!build) return res.status(400).json({ message: 'Unknown pie chart dataset' });

    const months = parseMonths(req.query.months, 0);
    const items = (await build(rangeMatch(months))).filter((i) => i.count > 0);

    res.json({
      dataset,
      months,
      total: items.reduce((sum, i) => sum + i.count, 0),
      items,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAnalytics, getLineChart, getBarChart, getPieChart };