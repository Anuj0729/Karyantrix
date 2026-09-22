const express = require('express');
const {
  getServiceCatalog,
  createServiceCatalog,
  updateServiceCatalog,
  deleteServiceCatalog,
} = require('../controllers/serviceCatalogController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', getServiceCatalog);

router.post('/', protect, authorize('admin', 'staff'), createServiceCatalog);
router.put('/:id', protect, authorize('admin', 'staff'), updateServiceCatalog);
router.delete('/:id', protect, authorize('admin', 'staff'), deleteServiceCatalog);

module.exports = router;
