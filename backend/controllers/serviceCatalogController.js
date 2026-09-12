const { ServiceCatalog } = require('../models');

const getServiceCatalog = async (req, res, next) => {
  try {
    const { category_id, id } = req.query;
    const where = { is_active: true };
    if (category_id) where.category = category_id;
    if (id) where._id = id;

    const services = await ServiceCatalog.find(where)
      .populate({ path: 'category', select: 'id name slug' })
      .sort({ name: 1 });
    res.json({ services });
  } catch (error) {
    next(error);
  }
};

// Admin-only: unlike getServiceCatalog, this includes inactive entries (e.g.
// ones auto-deactivated because their category was turned off) so the admin
// panel can see and manage them.
const getServiceCatalogAdmin = async (req, res, next) => {
  try {
    const { category_id, id } = req.query;
    const where = {};
    if (category_id) where.category = category_id;
    if (id) where._id = id;

    const services = await ServiceCatalog.find(where)
      .populate({ path: 'category', select: 'id name slug is_active' })
      .sort({ name: 1 });
    res.json({ services });
  } catch (error) {
    next(error);
  }
};

const createServiceCatalog = async (req, res, next) => {
  try {
    const { category_id, name, description } = req.body;
    if (!category_id || !name) {
      return res.status(400).json({ message: 'Category and name are required' });
    }
    const service = await ServiceCatalog.create({ category: category_id, name, description: description || null });
    await service.populate({ path: 'category', select: 'id name slug' });
    res.status(201).json({ message: 'Service created', service });
  } catch (error) {
    next(error);
  }
};

const updateServiceCatalog = async (req, res, next) => {
  try {
    const service = await ServiceCatalog.findById(req.params.id);
    if (!service) return res.status(404).json({ message: 'Service not found' });

    const { category_id, name, description, is_active } = req.body;
    if (category_id !== undefined) service.category = category_id;
    if (name !== undefined) service.name = name;
    if (description !== undefined) service.description = description;
    if (is_active !== undefined) {
      service.is_active = is_active;
      // This is now an explicit, direct status change on this one catalog
      // entry, so it should no longer be treated as something a category
      // reactivation should sweep up automatically.
      service.deactivated_by_category = false;
    }
    await service.save();
    await service.populate({ path: 'category', select: 'id name slug' });

    res.json({ message: 'Service updated', service });
  } catch (error) {
    next(error);
  }
};

const deleteServiceCatalog = async (req, res, next) => {
  try {
    const service = await ServiceCatalog.findById(req.params.id);
    if (!service) return res.status(404).json({ message: 'Service not found' });
    service.is_active = false;
    service.deactivated_by_category = false;
    await service.save();
    res.json({ message: 'Service deactivated' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getServiceCatalog,
  getServiceCatalogAdmin,
  createServiceCatalog,
  updateServiceCatalog,
  deleteServiceCatalog,
};
