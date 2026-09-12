const { sendOTPEmail } = require('./email');
const { sendOTPSms } = require('./sms');

const generateOTP = () => String(Math.floor(100000 + Math.random() * 900000));

const sendOtp = async (method, destination, otp) => {
  if (method === 'email') return sendOTPEmail(destination, otp);
  return sendOTPSms(destination, otp);
};

module.exports = { generateOTP, sendOtp };
