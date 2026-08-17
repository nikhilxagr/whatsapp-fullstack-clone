const User = require('../models/userModel');
const optGenerator = require('../utils/otpGenerator');

// Step -1 Send OTP

const sendOtp = async (req, res) => {
        const { phoneNumber, phoneSuffix , email } = req.body;
        const otp = optGenerator();
        const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // OTP expires in 5 minutes
        let user;
        try {
            if (email) {
                user = await User.findOne({ email });
            }
            if (!user) {
                user = new User({email});
            }
            user.emailOtp = otp;
            user.emailOtpExpiry = otpExpiry;
            await user.save();
            return res.status(200).json({ message: "OTP sent successfully", otp });
            if(!phoneNumber || !phoneSuffix) {
                return res.status(400).json({ message: "Phone number and country code are required" });
            }
            const fullPhoneNumber = `${phoneSuffix}${phoneNumber}`;
            user = await User.findOne({ phoneNumber: fullPhoneNumber });
            if (!user) {
                user = await new User({ phoneNumber: fullPhoneNumber });
            }
            user.phoneOtp = otp;
            user.phoneOtpExpiry = otpExpiry;
            await user.save();
            return res.status(200).json({ message: "OTP sent successfully", otp });
            
        } catch (error) {
            console.error("Error occurred while fetching user:", error);
            return res.status(500).json({ message: "Internal server error" });
        }
    }