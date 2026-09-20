const express = require('express');
const {
  createRequirement,
  getRequirementById,
  getFeed,
  getMyRequirements,
  expressInterest,
  getInterestedProviders,
  closeRequirement,
  updateRequirement,
  deleteRequirement,
} = require('../controllers/requirementController');
const { protect, authorize, optionalAuth } = require('../middleware/auth');
const { placeBid, getBids, getMyBids, acceptBid, hireInterestedProvider } = require('../controllers/bidController');

const router = express.Router();

router.get('/', optionalAuth, getFeed);
router.get('/mine', protect, authorize('customer'), getMyRequirements);
router.get('/:id', optionalAuth, getRequirementById);

router.post('/', protect, authorize('customer'), createRequirement);
router.put('/:id', protect, authorize('customer'), updateRequirement);
router.delete('/:id', protect, authorize('customer'), deleteRequirement);
router.post('/:id/interest', protect, authorize('provider'), expressInterest);
router.get('/:id/interested', protect, authorize('customer'), getInterestedProviders);
router.patch('/:id/interested/:providerId/hire', protect, authorize('customer'), hireInterestedProvider);
router.patch('/:id/close', protect, authorize('customer'), closeRequirement);

router.get('/bids/mine', protect, authorize('provider'), getMyBids);
router.post('/:id/bids', protect, authorize('provider'), placeBid);
router.get('/:id/bids', protect, authorize('customer', 'provider'), getBids);
router.patch('/:id/bids/:bidId/accept', protect, authorize('customer'), acceptBid);

module.exports = router;
