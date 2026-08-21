const jwt = require("jsonwebtoken");
const User = require("../models/User");
const response = require("../utils/responseHandler");

const authMiddleware = async (req, res, next) => {
  const authToken = req.cookies?.auth_token;
  if (!authToken) {
    return response(res, 401, "Unauthorized: No authentication token provided");
  }

  try {
    const decoded = jwt.verify(
      authToken,
      process.env.JWT_SECRET || "default_jwt_secret_key"
    );
    const user = await User.findById(decoded.userId).select(
      "-emailOtp -emailOtpExpiry -phoneOtp -phoneOtpExpiry"
    );

    if (!user) {
      return response(res, 401, "Unauthorized: User not found");
    }

    req.user = user;
    next();
  } catch (error) {
    return response(res, 401, "Unauthorized: Invalid or expired token");
  }
};

module.exports = authMiddleware;