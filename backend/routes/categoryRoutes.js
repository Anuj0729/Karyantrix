const express = require('express');
const {
  getCategories,
  getCategoryById,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../controllers/categoryController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', getCategories);

router.get('/id/:id', getCategoryById);
router.get('/:slug', getCategoryBySlug);

router.post('/', protect, authorize('admin', 'staff'), createCategory);
router.put('/:id', protect, authorize('admin', 'staff'), updateCategory);
router.delete('/:id', protect, authorize('admin', 'staff'), deleteCategory);

module.exports = router;
