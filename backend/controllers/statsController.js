const { User, ProviderProfile, Category, ServiceCatalog } = require('../models');
const { ADMIN_ROLES } = require('../utils/roles');

const getPublicStats = async (req, res, next) => {
  try {
    const providerUserIds = await ProviderProfile.find({ is_approved: true }).distinct('user');
    const activeUser = { account_status: 'active', is_active: { $ne: false } };

    const [categories, services, providers, customers, categoryList] = await Promise.all([
      Category.countDocuments({ is_active: true }),
      ServiceCatalog.countDocuments({ is_active: true }),
      User.countDocuments({ ...activeUser, role: { $nin: ADMIN_ROLES }, _id: { $in: providerUserIds } }),
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