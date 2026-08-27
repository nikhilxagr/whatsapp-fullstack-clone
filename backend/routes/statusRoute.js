const express = require("express");
const statusController = require("../controllers/statusController");
const authMiddleware = require("../middleware/authMiddleware");
const { multerMiddleware } = require("../config/cloudinaryConfig");

const router = express.Router();

// Protected Status Routes
router.post("/", authMiddleware, multerMiddleware, statusController.createStatus);
router.get("/", authMiddleware, statusController.getStatuses);
router.get("/my-status", authMiddleware, statusController.getUserStatus);
router.put("/:statusId/view", authMiddleware, statusController.viewStatus);
router.delete("/:statusId", authMiddleware, statusController.deleteStatus);

module.exports = router;