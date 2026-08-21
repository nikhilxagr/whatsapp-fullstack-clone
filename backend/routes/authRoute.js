const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const authController = require("../controllers/authController");
const { multerMiddleware } = require("../config/cloudinaryConfig");

const router = express.Router();

// Public auth routes
router.post("/send-otp", authController.sendOtp);
router.post("/verify-otp", authController.verifyOtp);
router.post("/logout", authController.logout);

// Protected auth routes
router.get("/check-auth", authMiddleware, authController.checkAuthenticated);
router.get("/users", authMiddleware, authController.getAllUsers);
router.put(
  "/update-profile",
  authMiddleware,
  multerMiddleware,
  authController.updateProfile
);

module.exports = router;
