const Razorpay = require('razorpay');

let instance = null;

const getRazorpay = () => {
  if (!instance) {
    const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      const err = new Error('Payments are not configured on this server. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
      err.statusCode = 503;
      throw err;
    }
    instance = new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });
  }
  return instance;
};

module.exports = { getRazorpay };
