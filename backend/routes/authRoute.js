const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const authController = require("../controllers/authController");
const { multerMiddleware } = require("../config/cloudinaryConfig");

const router = express.Router();

router.post("/register", authController.register);
router.post("/verify-email", authController.verifyEmail);
router.post("/resend-otp", authController.resendOtp);

router.post("/login/email", authController.loginWithEmail);
router.post("/login/phone", authController.loginWithPhone);

router.post("/verify-firebase-phone", authController.verifyFirebasePhone);

router.post("/logout", authController.logout);
router.get("/check-auth", authMiddleware, authController.checkAuthenticated);

router.get("/users", authMiddleware, authController.getAllUsers);
router.put("/update-profile", authMiddleware, multerMiddleware, authController.updateProfile);

module.exports = router;