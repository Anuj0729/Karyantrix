// utils/sendgrid.js
const sgMail = require('@sendgrid/mail');
const dotenv = require('dotenv');
dotenv.config();

sgMail.setApiKey(process.env.SENDGRID_API_KEY)

const sendOTPEmail = (email, otp) => {
  const msg = {
    to: email,
    from: {
      email: 'indanyana1@gmail.com',
      name: 'Adrore Support',
    },
    subject: 'Your OTP Code',
    text: `Your One-Time Password (OTP) is: ${otp}`,
    html: `
      <div style="font-family: Arial, sans-serif; font-size: 16px;">
        <p>Hello,</p>
        <p>Your One-Time Password (OTP) is:</p>
        <h2>${otp}</h2>
        <p>This code is valid for the next 5 minutes. Please do not share it with anyone.</p>
        <p>Best regards,<br>Adrore Team</p>
      </div>
    `,
  };

  return sgMail
    .send(msg)
    .then((response) => {
      console.log('OTP has been sended into your email')
      console.log("Status Code : ",response[0].statusCode)
      console.log("Header : ",response[0].headers)
    })
    .catch((error) => console.error('Error sending email:', error));
};


module.exports = { sendOTPEmail };