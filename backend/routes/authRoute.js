const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const authController = require("../controllers/authController");
const { multerMiddleware } = require("../config/cloudinaryConfig");

const router = express.Router();

// Registration & email verification
router.post("/register", authController.register);
router.post("/verify-email", authController.verifyEmail);

// Login options
router.post("/login/email", authController.loginWithEmail);
router.post("/login/phone", authController.loginWithPhone);

// Firebase (kept for compatibility)
router.post("/verify-firebase-phone", authController.verifyFirebasePhone);

// Session
router.post("/logout", authController.logout);
router.get("/check-auth", authMiddleware, authController.checkAuthenticated);

// Protected
router.get("/users", authMiddleware, authController.getAllUsers);
router.put("/update-profile", authMiddleware, multerMiddleware, authController.updateProfile);

module.exports = router;