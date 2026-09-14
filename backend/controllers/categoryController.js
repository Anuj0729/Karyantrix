const { Category, ServiceCatalog, Service } = require('../models');

const getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({ is_active: true }).sort({ name: 1 });
    res.json({ categories });
  } catch (error) {
    next(error);
  }
};

const getAllCategoriesAdmin = async (req, res, next) => {
  try {
    const categories = await Category.find({}).sort({ name: 1 });
    res.json({ categories });
  } catch (error) {
    next(error);
  }
};

const cascadeCategoryStatus = async (categoryId, isActive) => {
  if (isActive) {
    await Promise.all([
      ServiceCatalog.updateMany(
        { category: categoryId, is_active: false, deactivated_by_category: true },
        { $set: { is_active: true, deactivated_by_category: false } }
      ),
      Service.updateMany(
        { category: categoryId, is_active: false, deactivated_by_category: true },
        { $set: { is_active: true, deactivated_by_category: false } }
      ),
    ]);
  } else {
    await Promise.all([
      ServiceCatalog.updateMany(
        { category: categoryId, is_active: true },
        { $set: { is_active: false, deactivated_by_category: true } }
      ),
      Service.updateMany(
        { category: categoryId, is_active: true },
        { $set: { is_active: false, deactivated_by_category: true } }
      ),
    ]);
  }
};

const getCategoryById = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });
    res.json({ category });
  } catch (error) {
    next(error);
  }
};

const getCategoryBySlug = async (req, res, next) => {
  try {
    const category = await Category.findOne({ slug: req.params.slug });
    if (!category) return res.status(404).json({ message: 'Category not found' });
    res.json({ category });
  } catch (error) {
    next(error);
  }
};

const createCategory = async (req, res, next) => {
  try {
    const { name, slug, description, icon } = req.body;
    if (!name || !slug) {
      return res.status(400).json({ message: 'Name and slug are required' });
    }
    const category = await Category.create({ name, slug, description, icon });
    res.status(201).json({ message: 'Category created', category });
  } catch (error) {
    next(error);
  }
};

const updateCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });

    const { name, slug, description, icon, is_active } = req.body;
    if (name !== undefined) category.name = name;
    if (slug !== undefined) category.slug = slug;
    if (description !== undefined) category.description = description;
    if (icon !== undefined) category.icon = icon;

    const statusChanged = is_active !== undefined && is_active !== category.is_active;
    if (is_active !== undefined) category.is_active = is_active;
    await category.save();

    if (statusChanged) {
      await cascadeCategoryStatus(category.id, category.is_active);
    }

    res.json({ message: 'Category updated', category });
  } catch (error) {
    next(error);
  }
};

const deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });
    category.is_active = false;
    await category.save();
    await cascadeCategoryStatus(category.id, false);
    res.json({ message: 'Category deactivated' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCategories,
  getAllCategoriesAdmin,
  getCategoryById,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
};
