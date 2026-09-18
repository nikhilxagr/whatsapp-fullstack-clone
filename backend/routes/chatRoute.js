const express = require("express");
const chatController = require("../controllers/chatController");
const authMiddleware = require("../middleware/authMiddleware");
const { multerMiddleware } = require("../config/cloudinaryConfig");
const router = express.Router();

// Protected chat routes
router.get("/conversations", authMiddleware, chatController.getConversations);
router.get("/conversations/:conversationId/messages", authMiddleware, chatController.getMessages);
router.put("/messages/read", authMiddleware, chatController.markMessagesAsRead);
router.delete("/messages/:messageId", authMiddleware, chatController.deleteMessage);

// Existing route endpoints (for backwards compatibility)
router.post("/send-message", authMiddleware, multerMiddleware, chatController.sendMessage);
router.get("/get-conversations", authMiddleware, chatController.getConversations);
router.get("/get-messages/:conversationId", authMiddleware, chatController.getMessages);
router.put("/mark-as-read", authMiddleware, chatController.markAsRead);
router.delete("/delete-message/:messageId", authMiddleware, chatController.deleteMessage);

router.put("/update-message/:messageId", authMiddleware, multerMiddleware, chatController.updateMessage);
router.delete("/delete-conversation/:conversationId", authMiddleware, chatController.deleteConversation);

module.exports = router; 