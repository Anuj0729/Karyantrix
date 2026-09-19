// utils/sendgrid.js
const sgMail = require("@sendgrid/mail");
const dotenv = require("dotenv");
dotenv.config();

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY is missing");
}

if (!process.env.SMTP_SENDER_USER) {
  throw new Error("SMTP_SENDER_USER is missing");
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendOTPEmail = (email, otp) => {
  const msg = {
    to: email,
    from: {
      email: process.env.SMTP_SENDER_USER,
      name: "Karyantrix",
    },
    subject: "Your Karyantrix Verification Code",

    text: `
Your Karyantrix verification code is: ${otp}

This verification code will expire in 5 minutes.

If you did not request this code, please ignore this email.

© ${new Date().getFullYear()} Karyantrix. All rights reserved.
    `.trim(),

    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Karyantrix Verification Code</title>
</head>

<body style="
  margin: 0;
  padding: 0;
  background-color: #f4f7fb;
  font-family: Arial, Helvetica, sans-serif;
  color: #1f2937;
">

  <table
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
    style="background-color: #f4f7fb; padding: 40px 16px;"
  >
    <tr>
      <td align="center">

        <!-- Main Container -->
        <table
          width="100%"
          cellpadding="0"
          cellspacing="0"
          border="0"
          style="
            max-width: 560px;
            background-color: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 8px 30px rgba(15, 23, 42, 0.08);
          "
        >

          <!-- Header -->
          <tr>
            <td
              align="center"
              style="
                background-color: #0f766e;
                padding: 28px 24px;
              "
            >
              <h1 style="
                margin: 0;
                color: #ffffff;
                font-size: 28px;
                font-weight: 700;
                letter-spacing: -0.5px;
              ">
                Karyantrix
              </h1>

              <p style="
                margin: 8px 0 0;
                color: #ccfbf1;
                font-size: 14px;
              ">
                Secure. Simple. Reliable.
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 36px;">

              <h2 style="
                margin: 0 0 12px;
                color: #111827;
                font-size: 24px;
                font-weight: 700;
              ">
                Verify your account
              </h2>

              <p style="
                margin: 0 0 28px;
                color: #6b7280;
                font-size: 15px;
                line-height: 1.7;
              ">
                Use the verification code below to complete your
                Karyantrix account verification.
              </p>

              <!-- OTP Card -->
              <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
                style="
                  background-color: #f0fdfa;
                  border: 1px solid #99f6e4;
                  border-radius: 12px;
                "
              >
                <tr>
                  <td align="center" style="padding: 24px;">

                    <p style="
                      margin: 0 0 10px;
                      color: #0f766e;
                      font-size: 12px;
                      font-weight: 700;
                      text-transform: uppercase;
                      letter-spacing: 1.5px;
                    ">
                      Verification Code
                    </p>

                    <p style="
                      margin: 0;
                      color: #111827;
                      font-size: 36px;
                      font-weight: 800;
                      letter-spacing: 8px;
                      font-family: 'Courier New', monospace;
                    ">
                      ${otp}
                    </p>

                  </td>
                </tr>
              </table>

              <!-- Expiration -->
              <p style="
                margin: 24px 0 0;
                color: #4b5563;
                font-size: 14px;
                line-height: 1.6;
                text-align: center;
              ">
                ⏱ This code expires in
                <strong style="color: #111827;">
                  5 minutes
                </strong>.
              </p>

              <!-- Security Notice -->
              <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
                style="
                  margin-top: 28px;
                  background-color: #f9fafb;
                  border-radius: 10px;
                "
              >
                <tr>
                  <td style="padding: 16px 18px;">

                    <p style="
                      margin: 0;
                      color: #6b7280;
                      font-size: 13px;
                      line-height: 1.6;
                    ">
                      <strong style="color: #374151;">
                        Security notice:
                      </strong>
                      Never share this verification code with anyone.
                      Karyantrix will never ask you for your OTP.
                    </p>

                  </td>
                </tr>
              </table>

              <p style="
                margin: 28px 0 0;
                color: #9ca3af;
                font-size: 13px;
                line-height: 1.6;
              ">
                If you did not request this verification code, you can
                safely ignore this email.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td
              align="center"
              style="
                background-color: #f9fafb;
                border-top: 1px solid #e5e7eb;
                padding: 22px 24px;
              "
            >
              <p style="
                margin: 0 0 6px;
                color: #6b7280;
                font-size: 12px;
              ">
                © ${new Date().getFullYear()} Karyantrix
              </p>

              <p style="
                margin: 0;
                color: #9ca3af;
                font-size: 11px;
              ">
                This is an automated email. Please do not reply.
              </p>

            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
    `.trim(),
  };

  return sgMail
    .send(msg)
    .then((response) => {
      console.log("OTP has been sended into your email");
      console.log("Status Code : ", response[0].statusCode);
      console.log("Header : ", response[0].headers);
    })
    .catch((error) => console.error("Error sending email:", error));
};

module.exports = { sendOTPEmail };
