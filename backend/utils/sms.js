const twilio = require('twilio');

const isConfigured =
  process.env.TWILIO_ACCOUNT_SID &&
  process.env.TWILIO_AUTH_TOKEN &&
  process.env.TWILIO_PHONE_NUMBER &&
  !process.env.TWILIO_ACCOUNT_SID.includes('your_');

const client = isConfigured ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN) : null;

const sendOTPSms = async (toPhone, otp) => {
  if (!client) {
    return { simulated: true };
  }

  const message = [
    `Karyantrix: Your verification code is ${otp}.`,
    `It expires in 5 minutes.`,
    `Do not share this code with anyone.`,
  ].join(" ");

  return client.messages.create({
    body: message,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: toPhone,
  });
};

module.exports = { sendOTPSms };
