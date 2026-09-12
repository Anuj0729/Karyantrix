const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { uploadBookingProgressMedia } = require('../middleware/upload');
const {
  getMyBookings,
  getBooking,
  createAdvanceOrder,
  verifyAdvancePayment,
  addProgressUpdate,
  respondToProgressUpdate,
  markWorkCompleted,
  createBalanceOrder,
  verifyBalancePayment,
  cancelBooking,
} = require('../controllers/bookingController');
const { getMyEarnings, getMyWallet } = require('../controllers/walletController');

const router = express.Router();

router.get('/mine', protect, authorize('customer', 'provider'), getMyBookings);
router.get('/wallet/my-earnings', protect, authorize('provider'), getMyEarnings);
router.get('/wallet/my-wallet', protect, authorize('provider'), getMyWallet);
router.get('/:id', protect, getBooking);

router.post('/:id/advance/order', protect, authorize('customer'), createAdvanceOrder);
router.post('/:id/advance/verify', protect, authorize('customer'), verifyAdvancePayment);

router.post(
  '/:id/progress',
  protect,
  authorize('provider'),
  uploadBookingProgressMedia.array('media', 10),
  addProgressUpdate
);
router.patch('/:id/progress/:updateId/respond', protect, authorize('customer'), respondToProgressUpdate);

router.patch('/:id/complete-work', protect, authorize('provider'), markWorkCompleted);

router.post('/:id/balance/order', protect, authorize('customer'), createBalanceOrder);
router.post('/:id/balance/verify', protect, authorize('customer'), verifyBalancePayment);

router.post('/:id/cancel', protect, authorize('customer', 'provider'), cancelBooking);

module.exports = router;
