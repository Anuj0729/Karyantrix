const express = require('express');
const {
  createReview,
  getProviderReviews,
  getCustomerReviews,
  getMyReviewForRequirement,
  updateReview,
} = require('../controllers/reviewController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/', protect, authorize('customer', 'provider'), createReview);
router.get('/provider/:providerId', getProviderReviews);
router.get('/customer/:customerId', protect, getCustomerReviews);
router.get('/mine/:requirementId', protect, authorize('customer', 'provider'), getMyReviewForRequirement);
router.patch('/:id', protect, authorize('customer', 'provider'), updateReview);

module.exports = router;
