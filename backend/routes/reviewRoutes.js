const express = require('express');
const { createReview, getProviderReviews, getMyReviewForRequirement, updateReview } = require('../controllers/reviewController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/', protect, authorize('customer'), createReview);
router.get('/provider/:providerId', getProviderReviews);
router.get('/mine/:requirementId', protect, authorize('customer'), getMyReviewForRequirement);
router.patch('/:id', protect, authorize('customer'), updateReview);

module.exports = router;
