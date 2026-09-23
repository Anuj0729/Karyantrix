const express = require('express');
const {
  getMyProfile,
  updateMyProfile,
  becomeProvider,
  switchToCustomer,
  switchToProvider,
  getMyApplication,
  saveApplicationStep,
  submitApplication,
  getProviders,
  getProviderProfile,
} = require('../controllers/providerController');
const { protect, authorize, optionalAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', optionalAuth, getProviders);
router.get('/me', protect, authorize('provider'), getMyProfile);
router.put('/me', protect, authorize('provider'), updateMyProfile);

router.post('/become', protect, becomeProvider);
router.post('/switch-to-customer', protect, authorize('provider'), switchToCustomer);
router.post('/switch-to-provider', protect, authorize('customer'), switchToProvider);
router.get('/application/me', protect, getMyApplication);
router.put('/application/me', protect, saveApplicationStep);
router.post('/application/submit', protect, submitApplication);

router.get('/:id', optionalAuth, getProviderProfile);

module.exports = router;
