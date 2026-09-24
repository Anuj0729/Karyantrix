const { ServiceCatalog, Service } = require('../models');

const cascadeCatalogServiceStatus = async (catalogServiceId, isActive) => {
  if (isActive) {
    await Service.updateMany(
      { catalog_service: catalogServiceId, is_active: false, deactivated_by_catalog_service: true },
      { $set: { is_active: true, deactivated_by_catalog_service: false } }
    );
  } else {
    await Service.updateMany(
      { catalog_service: catalogServiceId, is_active: true },
      { $set: { is_active: false, deactivated_by_catalog_service: true } }
    );
  }
};

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
    const statusChanged = is_active !== undefined && is_active !== service.is_active;
    if (is_active !== undefined) {
      service.is_active = is_active;
      service.deactivated_by_category = false;
    }
    await service.save();
    await service.populate({ path: 'category', select: 'id name slug' });

    if (statusChanged) {
      await cascadeCatalogServiceStatus(service.id, service.is_active);
    }

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
    await cascadeCatalogServiceStatus(service.id, false);
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
