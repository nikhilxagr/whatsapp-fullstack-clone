const User = require("../models/User");
const Conversation = require("../models/Conversation");
const optGenerator = require("../utils/otpGenerator");
const { sendOtpToEmail } = require("../services/emailService");
const { sendOtpToPhoneNumber, verifyOtp: verifyPhoneOtp } = require("../services/phoneService");
const response = require("../utils/responseHandler");
const generateToken = require("../utils/generateToken");


// Step - 1: Send OTP (Email or Phone)
const sendOtp = async (req, res) => {
  const { phoneNumber, phoneSuffix, email } = req.body;
  const otp = optGenerator();
  const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // OTP expires in 5 minutes

  try {
    // 1. Email OTP Flow
    if (email) {
      let user = await User.findOne({ email });
      if (!user) {
        user = new User({ email });
      }
      user.emailOtp = otp;
      user.emailOtpExpiry = otpExpiry;
      await user.save();

      await sendOtpToEmail(email, otp);
      return response(res, 200, "OTP sent successfully to email", { otp });
    }

    // 2. Phone OTP Flow
    if (phoneNumber && phoneSuffix) {
      const fullPhoneNumber = `${phoneSuffix}${phoneNumber}`;
      let user = await User.findOne({ phoneNumber: fullPhoneNumber });
      if (!user) {
        user = new User({ phoneNumber: fullPhoneNumber, phoneSuffix });
      }
      user.phoneOtp = otp;
      user.phoneOtpExpiry = otpExpiry;
      await user.save();

      // Attempt SMS delivery via Twilio if configured, fallback gracefully
      try {
        await sendOtpToPhoneNumber(fullPhoneNumber);
      } catch (smsError) {
        console.log(`ℹ️ [SMS Service Info] Real SMS skipped (${smsError.message}). Using database OTP: ${otp}`);
      }

      // Returned in response for frontend testing & instant preview
      return response(res, 200, "OTP sent successfully to phone", { otp, phoneNumber: fullPhoneNumber });
    }

    // 3. Neither provided
    return response(
      res,
      400,
      "Please provide an email or a valid phone number and country code"
    );
  } catch (error) {
    console.error("Error occurred while sending OTP:", error);
    return response(res, 500, "Internal server error", {
      error: error.message,
    });
  }
};

// Step - 2: Verify OTP
const verifyOtp = async (req, res) => {
  const { email, phoneNumber, phoneSuffix, otp } = req.body;
  try {
    let user;
    const now = new Date();

    // 1. Verify Email OTP
    if (email) {
      user = await User.findOne({ email });
      if (!user) {
        return response(res, 404, "User not found");
      }
      if (
        !user.emailOtp ||
        String(user.emailOtp) !== String(otp) ||
        now > new Date(user.emailOtpExpiry)
      ) {
        return response(res, 400, "Invalid or expired OTP");
      }
      user.isVerified = true;
      user.emailOtp = null;
      user.emailOtpExpiry = null;
      await user.save();
    } 
    // 2. Verify Phone OTP
    else {
      if (!phoneNumber || !phoneSuffix) {
        return response(res, 400, "Phone number and phone suffix are required");
      }
      const fullPhoneNumber = `${phoneSuffix}${phoneNumber}`;
      user = await User.findOne({ phoneNumber: fullPhoneNumber });
      if (!user) {
        return response(res, 404, "User not found");
      }
      if (
        !user.phoneOtp ||
        String(user.phoneOtp) !== String(otp) ||
        now > new Date(user.phoneOtpExpiry)
      ) {
        return response(res, 400, "Invalid or expired OTP");
      }
      user.isVerified = true;
      user.phoneOtp = null;
      user.phoneOtpExpiry = null;
      await user.save();
    }

    const token = generateToken(user?._id);
    res.cookie("auth_token", token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 365, // 1 year
      sameSite: "lax",
    });

    return response(res, 200, "OTP verified successfully", { token, user });
  } catch (error) {
    console.error("Error occurred while verifying OTP:", error);
    return response(res, 500, "Internal server error", {
      error: error.message,
    });
  }
};

const updateProfile = async (req, res) => {
  const { username, agreed, about } = req.body;
  const userId = req.user?._id;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return response(res, 404, "User not found");
    }

    const file = req.file;
    if (file) {
      const { uploadOnCloudinary } = require("../config/cloudinaryConfig");
      const uploadResult = await uploadOnCloudinary(file);
      console.log("Upload Result:", uploadResult);
      user.profilePicture = uploadResult?.secure_url;
    }

    if (username) user.username = username;
    if (agreed !== undefined) user.agree = agreed;
    if (about) user.about = about;
    await user.save();

    return response(res, 200, "Profile updated successfully", { user });
  } catch (error) {
    console.error("Error occurred while updating profile:", error);
    return response(res, 500, "Internal server error", {
      error: error.message,
    });
  }
};

// Step - 4: Logout
const logout = async (req, res) => {
  try {
    res.cookie("auth_token", "", {
      httpOnly: true,
      expires: new Date(0),
      sameSite: "lax",
    });
    return response(res, 200, "Logged out successfully");
  } catch (error) {
    console.error("Error occurred while logging out:", error);
    return response(res, 500, "Internal server error", {
      error: error.message,
    });
  }
};

// Step - 5: Check Authentication Status
const checkAuthenticated = async (req, res) => {
  try {
    const user = req.user;
    return response(res, 200, "User is authenticated", { user });
  } catch (error) {
    console.error("Error occurred while checking authentication:", error);
    return response(res, 500, "Internal server error", {
      error: error.message,
    });
  }
};

// Step - 6: Get All Users with existing conversations (excluding logged-in user)
const getAllUsers = async (req, res) => {
  const loggedInUser = req.user?._id || req.user?.userId;

  try {
    const users = await User.find({ _id: { $ne: loggedInUser } })
      .select("username profilePicture lastSeen isOnline about phoneNumber phoneSuffix")
      .lean();

    const usersWithConversation = await Promise.all(
      users.map(async (user) => {
        const conversation = await Conversation.findOne({
          participants: { $all: [loggedInUser, user?._id] },
        })
          .populate({
            path: "lastMessage",
            select: "content contentType imageOrVideoUrl messageStatus createdAt sender receiver",
          })
          .lean();

        return {
          ...user,
          conversation: conversation || null,
        };
      })
    );

    return response(res, 200, "Users fetched successfully", {
      users: usersWithConversation,
    });
  } catch (error) {
    console.error("Error occurred while fetching all users:", error);
    return response(res, 500, "Internal server error", {
      error: error.message,
    });
  }
};


module.exports = {
  sendOtp,
  verifyOtp,
  updateProfile,
  logout,
  checkAuthenticated,
  getAllUsers,
};


