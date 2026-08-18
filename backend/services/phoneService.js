// Twilio used for phone otp verification 
const twilio = require("twilio");

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const serviceId = process.env.TWILIO_SERVICE_SID;

const client = twilio(accountSid, authToken);

// Send OTP to phone number
const sendOtpToPhoneNumber = async (phoneNumber) => {
  try {
    console.log("Sending OTP to phone number:", phoneNumber);
    if (!phoneNumber) {
      throw new Error("Phone number is required");
    }

    const response = await client.verify.v2
      .services(serviceId)
      .verifications.create({
        to: phoneNumber,
        channel: "sms",
      });
    console.log("Twilio send OTP response:", response);
    return response;
  } catch (error) {
    console.error("Twilio send OTP error:", error);
    throw error;
  }
};

// Verify OTP
const verifyOtp = async (phoneNumber, otp) => {
  try {
    console.log("Verifying OTP for:", phoneNumber);

    const response = await client.verify.v2
      .services(serviceId)
      .verificationChecks.create({
        to: phoneNumber,
        code: otp,
      });
    console.log("Twilio verify OTP response:", response);
    return response;
  } catch (error) {
    console.error("Twilio verify OTP error:", error);
    throw new Error("OTP Verification Failed");
  }
};

module.exports = { sendOtpToPhoneNumber, verifyOtp };