const express = require('express');
const {
  initiateRegister,
  resendRegisterOtp,
  verifyRegister,
  login,
  googleAuth,
  requestLoginOtp,
  verifyLoginOtp,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  changePassword,
  getMe,
  updateProfile,
  updateAvatar,
  removeAvatar,
  updateCoverPhoto,
  removeCoverPhoto,
  requestContactUpdateOtp,
  verifyContactUpdateOtp,
  refresh,
  logout,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { uploadAvatar } = require('../middleware/upload');
const { authLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.post('/register/initiate', authLimiter, initiateRegister);
router.post('/register/resend-otp', authLimiter, resendRegisterOtp);
router.post('/register/verify', authLimiter, verifyRegister);

router.post('/login', authLimiter, login);
router.post('/google', googleAuth);
router.post('/login/otp/request', authLimiter, requestLoginOtp);
router.post('/login/otp/verify', authLimiter, verifyLoginOtp);

router.post('/password/forgot', authLimiter, forgotPassword);
router.post('/password/verify-reset-otp', authLimiter, verifyResetOtp);
router.post('/password/reset', authLimiter, resetPassword);

router.post('/password/change', protect, changePassword);

router.get('/me', protect, getMe);
router.put('/me', protect, updateProfile);
router.post('/me/avatar', protect, uploadAvatar.single('avatar'), updateAvatar);
router.delete('/me/avatar', protect, removeAvatar);

router.post('/me/cover', protect, uploadAvatar.single('cover'), updateCoverPhoto);
router.delete('/me/cover', protect, removeCoverPhoto);

router.post('/me/contact/request-otp', protect, authLimiter, requestContactUpdateOtp);
router.post('/me/contact/verify-otp', protect, authLimiter, verifyContactUpdateOtp);

router.post('/refresh', refresh);

router.post('/logout', protect, logout);

module.exports = router;
