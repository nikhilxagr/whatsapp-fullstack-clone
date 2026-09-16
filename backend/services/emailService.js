const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD,
  },
});

transporter.verify((error) => {
  if (error) {
    console.log("Email service error:", error);
  } else {
    console.log("Email Service is ready");
  }
});

const sendOtpToEmail = async (email, otp) => {
  const digits = String(otp).split("");

  // Each digit rendered as its own table cell for email-client compatibility
  const digitCells = digits.map(d => `
    <td style="padding:0 5px;">
      <table cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border-radius:8px;border:2px solid #e9edef;width:44px;height:56px;">
        <tr>
          <td align="center" valign="middle" style="font-size:28px;font-weight:700;color:#111b21;font-family:Courier,monospace;text-align:center;width:44px;height:56px;">
            ${d}
          </td>
        </tr>
      </table>
    </td>`).join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>WhatsApp Verification</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f2f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0f2f5;padding:40px 16px;">
    <tr>
      <td align="center">

        <table width="480" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);max-width:480px;width:100%;">

          <!-- Green header -->
          <tr>
            <td align="center" style="background:linear-gradient(135deg,#00a884 0%,#075e54 100%);padding:32px 40px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding-bottom:14px;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" valign="middle" width="76" height="76" style="background:rgba(255,255,255,0.18);border-radius:50%;width:76px;height:76px;">
                          <img
                            src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/WhatsApp.svg/120px-WhatsApp.svg.png"
                            alt="WhatsApp"
                            width="46"
                            height="46"
                            style="display:block;margin:0 auto;"
                          />
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;padding-bottom:4px;">WhatsApp Web</td>
                </tr>
                <tr>
                  <td align="center" style="color:rgba(255,255,255,0.80);font-size:13px;">Verification Code</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 28px;">
              <p style="margin:0 0 8px;font-size:15px;color:#111b21;font-weight:600;">Hi there,</p>
              <p style="margin:0 0 28px;font-size:14px;color:#54656f;line-height:1.6;">
                Use the verification code below to confirm your email address.
                This code will expire in <strong style="color:#111b21;">5 minutes</strong>.
              </p>

              <!-- OTP digits -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
                <tr>
                  <td align="center">
                    <table cellpadding="0" cellspacing="0" border="0" style="background:#f0f2f5;border-radius:12px;padding:20px 24px;">
                      <tr>
                        <td align="center" style="padding-bottom:14px;">
                          <span style="font-size:11px;font-weight:600;color:#8696a0;letter-spacing:2px;text-transform:uppercase;">Your Verification Code</span>
                        </td>
                      </tr>
                      <tr>
                        <td align="center">
                          <table cellpadding="0" cellspacing="0" border="0">
                            <tr>${digitCells}</tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Warning -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
                <tr>
                  <td style="background:#fff8e1;border-left:4px solid #f59e0b;border-radius:0 8px 8px 0;padding:12px 16px;">
                    <p style="margin:0;font-size:13px;color:#92400e;line-height:1.5;">
                      🔒 <strong>Never share this code</strong> with anyone. WhatsApp will never ask for your code.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:13px;color:#8696a0;line-height:1.6;">
                If you didn't request this code, you can safely ignore this email.
                Someone may have entered your email address by mistake.
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr><td style="height:1px;background:#e9edef;font-size:0;line-height:0;">&nbsp;</td></tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px 28px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td valign="middle">
                    <p style="margin:0 0 4px;font-size:12px;color:#8696a0;">
                      Automated message from <strong style="color:#00a884;">WhatsApp Web</strong>.
                    </p>
                    <p style="margin:0;font-size:12px;color:#aebac1;">Please do not reply to this email.</p>
                  </td>
                  <td valign="middle" align="right" width="42">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" valign="middle" width="36" height="36" style="background:#00a884;border-radius:50%;width:36px;height:36px;">
                          <img
                            src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/WhatsApp.svg/120px-WhatsApp.svg.png"
                            width="22"
                            height="22"
                            style="display:block;margin:0 auto;"
                            alt="WA"
                          />
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>

        <p style="margin-top:20px;font-size:11px;color:#aebac1;text-align:center;">
          © 2025 WhatsApp Web Clone &middot; End-to-end encrypted
        </p>

      </td>
    </tr>
  </table>

</body>
</html>`;

  await transporter.sendMail({
    from: `"WhatsApp Web" <${process.env.EMAIL}>`,
    to: email,
    subject: `${otp} is your WhatsApp verification code`,
    html,
  });
};

module.exports = { sendOtpToEmail };