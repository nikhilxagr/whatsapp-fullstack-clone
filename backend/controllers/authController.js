const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Conversation = require("../models/Conversation");
const otpGenerator = require("../utils/otpGenerator");
const { sendOtpToEmail } = require("../services/emailService");
const response = require("../utils/responseHandler");
const generateToken = require("../utils/generateToken");

const issueToken = (res, userId) => {
  const token = generateToken(userId);
  res.cookie("auth_token", token, {
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return token;
};

const register = async (req, res) => {
  const { email, password, phoneNumber, phoneSuffix } = req.body;

  if (!email || !password) {
    return response(res, 400, "Email and password are required");
  }
  if (password.length < 6) {
    return response(res, 400, "Password must be at least 6 characters");
  }

  try {
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing && existing.isVerified) {
      return response(res, 409, "An account with this email already exists. Please sign in.");
    }

    const otp = otpGenerator();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);
    const hashedPassword = await bcrypt.hash(password, 10);

    let user = existing || new User({});
    user.email = email.toLowerCase();
    user.password = hashedPassword;
    user.emailOtp = otp;
    user.emailOtpExpiry = otpExpiry;
    user.isVerified = false;

    if (phoneNumber && phoneSuffix) {
      user.phoneNumber = `${phoneSuffix}${phoneNumber}`;
      user.phoneSuffix = phoneSuffix;
    }

    await user.save();
    await sendOtpToEmail(email.toLowerCase(), otp);

    return response(res, 200, "Verification code sent to your email", { email });
  } catch (err) {
    console.error("Register error:", err.message, err.code);
    if (err.code === 11000) {
      return response(res, 409, "Email or phone already registered");
    }
    return response(res, 500, "Registration failed", { error: err.message });
  }
};

const verifyEmail = async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return response(res, 400, "Email and OTP are required");
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return response(res, 404, "User not found");

    if (!user.emailOtp || String(user.emailOtp) !== String(otp)) {
      return response(res, 400, "Invalid verification code");
    }
    if (new Date() > new Date(user.emailOtpExpiry)) {
      return response(res, 400, "Verification code has expired. Please register again.");
    }

    user.isVerified = true;
    user.emailOtp = null;
    user.emailOtpExpiry = null;
    await user.save();

    const token = issueToken(res, user._id);
    return response(res, 200, "Email verified successfully", { token, user });
  } catch (err) {
    console.error("Verify email error:", err.message);
    return response(res, 500, "Verification failed", { error: err.message });
  }
};

const loginWithEmail = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return response(res, 400, "Email and password are required");
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
    if (!user) return response(res, 401, "No account found with this email");
    if (!user.isVerified) {
      return response(res, 401, "Please verify your email before signing in");
    }
    if (!user.password) {
      return response(res, 401, "This account does not have a password. Please use another login method.");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return response(res, 401, "Incorrect password");

    const token = issueToken(res, user._id);
    const safeUser = await User.findById(user._id);
    return response(res, 200, "Signed in successfully", { token, user: safeUser });
  } catch (err) {
    console.error("Login email error:", err.message);
    return response(res, 500, "Login failed", { error: err.message });
  }
};

const loginWithPhone = async (req, res) => {
  const { phoneNumber, phoneSuffix, password } = req.body;
  if (!phoneNumber || !phoneSuffix || !password) {
    return response(res, 400, "Phone number, country code, and password are required");
  }

  try {
    const fullPhone = `${phoneSuffix}${phoneNumber}`;
    const user = await User.findOne({ phoneNumber: fullPhone }).select("+password");
    if (!user) return response(res, 401, "No account found with this phone number");
    if (!user.isVerified) {
      return response(res, 401, "Please verify your account email first");
    }
    if (!user.password) {
      return response(res, 401, "This account does not have a password set");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return response(res, 401, "Incorrect password");

    const token = issueToken(res, user._id);
    const safeUser = await User.findById(user._id);
    return response(res, 200, "Signed in successfully", { token, user: safeUser });
  } catch (err) {
    console.error("Login phone error:", err.message);
    return response(res, 500, "Login failed", { error: err.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { username, agreed, about, profilePicture: avatarUrl } = req.body;
    const userId = req.user?._id;

    if (!userId) return response(res, 401, "Unauthorized");

    const updates = {};

    if (req.file) {
      try {
        const { uploadOnCloudinary } = require("../config/cloudinaryConfig");
        const uploadResult = await uploadOnCloudinary(req.file);
        if (uploadResult?.secure_url) {
          updates.profilePicture = uploadResult.secure_url;
        }
      } catch (uploadErr) {
        console.error("Profile picture upload failed:", uploadErr.message);
      }
    } else if (avatarUrl !== undefined) {
      updates.profilePicture = avatarUrl || "";
    }

    if (username !== undefined) {
      const trimmedName = username.trim();
      if (!trimmedName) {
        return response(res, 400, "Name cannot be empty");
      }
      if (trimmedName !== req.user.username) {
        updates.username = trimmedName;
      }
    }

    if (agreed !== undefined) updates.agree = agreed;

    if (about !== undefined) {
      updates.about = about.trim();
    }

    if (Object.keys(updates).length === 0) {
      const user = await User.findById(userId);
      return response(res, 200, "No changes made", { user });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true }
    );

    if (!updatedUser) return response(res, 404, "User not found");

    if (req.io) {
      req.io.emit("userUpdated", {
        _id: updatedUser._id,
        username: updatedUser.username,
        profilePicture: updatedUser.profilePicture,
        about: updatedUser.about,
      });
    }

    return response(res, 200, "Profile updated successfully", { user: updatedUser });
  } catch (err) {
    console.error("Update profile error:", err.message, err.code);
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || "field";
      return response(res, 409, `That ${field} is already taken. Please choose another.`);
    }
    return response(res, 500, "Internal server error", { error: err.message });
  }
};

const logout = async (req, res) => {
  try {
    res.cookie("auth_token", "", { httpOnly: true, expires: new Date(0), sameSite: "lax" });
    return response(res, 200, "Logged out successfully");
  } catch (err) {
    return response(res, 500, "Logout failed", { error: err.message });
  }
};

const checkAuthenticated = async (req, res) => {
  try {
    return response(res, 200, "User is authenticated", { user: req.user });
  } catch (err) {
    return response(res, 500, "Internal server error", { error: err.message });
  }
};

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

        return { ...user, conversation: conversation || null };
      })
    );

    return response(res, 200, "Users fetched successfully", { users: usersWithConversation });
  } catch (err) {
    console.error("Get all users error:", err.message);
    return response(res, 500, "Internal server error", { error: err.message });
  }
};

// Firebase phone login — kept for compatibility
const verifyFirebasePhone = async (req, res) => {
  const { idToken, phoneSuffix } = req.body;
  if (!idToken) return response(res, 400, "Firebase ID Token is required");

  try {
    const { verifyFirebaseToken } = require("../services/firebaseService");
    const decoded = await verifyFirebaseToken(idToken);
    const fullPhoneNumber = decoded.phone_number;

    if (!fullPhoneNumber) {
      return response(res, 400, "No phone number associated with this Firebase token");
    }

    let user = await User.findOne({ phoneNumber: fullPhoneNumber });
    if (!user) {
      user = new User({
        phoneNumber: fullPhoneNumber,
        phoneSuffix: phoneSuffix || fullPhoneNumber.slice(0, 3),
        isVerified: true,
      });
      await user.save();
    } else {
      user.isVerified = true;
      await user.save();
    }

    const token = issueToken(res, user._id);
    return response(res, 200, "Phone verified successfully via Firebase", { token, user });
  } catch (err) {
    console.error("Firebase phone verify error:", err.message);
    return response(res, 401, err.message || "Failed to verify phone token", { error: err.message });
  }
};

module.exports = {
  register,
  verifyEmail,
  loginWithEmail,
  loginWithPhone,
  updateProfile,
  logout,
  checkAuthenticated,
  getAllUsers,
  verifyFirebasePhone,
};
