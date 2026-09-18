const { sendOTPEmail } = require('./email');
const { sendOTPSms } = require('./sms');
const { enqueueOtp } = require('../jobs/otpQueue');

const REDIS_ENABLED = (process.env.REDIS_ENABLED || 'true').toLowerCase() !== 'false';

const generateOTP = () => String(Math.floor(100000 + Math.random() * 900000));

const sendOtp = async (method, destination, otp) => {
  if (!REDIS_ENABLED) {
    if (method === 'email') return sendOTPEmail(destination, otp);
    return sendOTPSms(destination, otp);
  }
  return enqueueOtp(method, destination, otp);
};

module.exports = { generateOTP, sendOtp };
