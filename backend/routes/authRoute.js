const express = require("express");
const authMiddleware = require("../middleware/authmiddleware");
const authController = require("../controllers/authController");
const { multerMiddleware } = require("../config/cloudinaryConfig");

const router = express.Router();

router.post("/send-otp", authController.sendOtp);
router.post("/verify-otp",authController.verifyOtp);


// protected route for updating user profile
router.put("/update-profile", authMiddleware, multerMiddleware, authController.updateProfile);

module.exports = router;