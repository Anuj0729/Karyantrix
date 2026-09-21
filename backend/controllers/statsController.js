const { User, ProviderProfile, Category, ServiceCatalog } = require('../models');

// Public, live platform numbers for the home page. Everything is counted from the
// database on every request, so new categories, services, customers and providers
// show up automatically without any manual change.
const getPublicStats = async (req, res, next) => {
  try {
    // A provider stays a provider even while switched to their customer account,
    // so providers are identified by an approved profile, not by the current role.
    const providerUserIds = await ProviderProfile.find({ is_approved: true }).distinct('user');
    const activeUser = { account_status: 'active', is_active: { $ne: false } };

    const [categories, services, providers, customers, categoryList] = await Promise.all([
      Category.countDocuments({ is_active: true }),
      ServiceCatalog.countDocuments({ is_active: true }),
      User.countDocuments({ ...activeUser, role: { $ne: 'admin' }, _id: { $in: providerUserIds } }),
      User.countDocuments({ ...activeUser, role: 'customer', _id: { $nin: providerUserIds } }),
      Category.find({ is_active: true }).sort({ name: 1 }).limit(12).select('name').lean(),
    ]);

    res.json({
      stats: { categories, services, customers, providers },
      categoryNames: categoryList.map((c) => c.name),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getPublicStats };