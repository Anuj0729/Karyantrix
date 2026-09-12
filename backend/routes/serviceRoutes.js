const express = require('express');
const {
  getServices,
  getServiceById,
  getMyServices,
  createService,
  bulkCreateServices,
  updateService,
  deleteService,
} = require('../controllers/serviceController');
const { protect, authorizeProviderOrApplicant, optionalAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', optionalAuth, getServices);

router.get('/my/listings', protect, authorizeProviderOrApplicant, getMyServices);

router.post('/bulk', protect, authorizeProviderOrApplicant, bulkCreateServices);
router.post('/', protect, authorizeProviderOrApplicant, createService);
router.put('/:id', protect, authorizeProviderOrApplicant, updateService);
router.delete('/:id', protect, authorizeProviderOrApplicant, deleteService);

router.get('/:id', getServiceById);

module.exports = router;
