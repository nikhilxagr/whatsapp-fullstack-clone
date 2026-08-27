const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const { uploadOnCloudinary } = require("../config/cloudinaryConfig");
const response = require("../utils/responseHandler");

// 1. Send Message (REST API + Real-time Socket.io broadcast)
exports.sendMessage = async (req, res) => {
  try {
    const { senderId, receiverId, content, messageStatus } = req.body;
    const effectiveSenderId = senderId || req.user?._id;
    const file = req.file;

    if (!effectiveSenderId || !receiverId) {
      return response(res, 400, "Sender and receiver IDs are required");
    }

    // Check if a conversation already exists between the participants
    let conversation = await Conversation.findOne({
      participants: { $all: [effectiveSenderId, receiverId] },
    });

    if (!conversation) {
      conversation = new Conversation({
        participants: [effectiveSenderId, receiverId],
        lastMessage: null,
        unreadCount: 0,
      });
      await conversation.save();
    }

    let imageOrVideoUrl = null;
    let contentType = "text";

    if (file) {
      const uploadResult = await uploadOnCloudinary(file);
      if (!uploadResult?.secure_url) {
        return response(res, 400, "File upload failed");
      }
      imageOrVideoUrl = uploadResult.secure_url;

      if (file.mimetype?.startsWith("image/")) {
        contentType = "image";
      } else if (file.mimetype?.startsWith("video/")) {
        contentType = "video";
      } else {
        return response(res, 400, "Invalid file type. Only images and videos are allowed.");
      }
    } else if (!content?.trim()) {
      return response(res, 400, "Message content or file is required");
    }

    const message = new Message({
      conversation: conversation._id,
      sender: effectiveSenderId,
      receiver: receiverId,
      content: content || null,
      contentType: contentType,
      imageOrVideoUrl: imageOrVideoUrl,
      messageStatus: messageStatus || "sent",
    });
    await message.save();

    conversation.lastMessage = message._id;
    conversation.unreadCount += 1;
    await conversation.save();

    const populatedMessage = await Message.findById(message._id)
      .populate("sender", "username profilePicture")
      .populate("receiver", "username profilePicture");

    // Broadcast in real-time via Socket.io if available
    if (req.io && req.socketUserMap) {
      const receiverSocketId = req.socketUserMap.get(receiverId?.toString());
      if (receiverSocketId) {
        req.io.to(receiverSocketId).emit("receiveMessage", populatedMessage);
      }
    }

    return response(res, 201, "Message sent successfully", populatedMessage);
  } catch (error) {
    console.error("Error sending message:", error);
    return response(res, 500, "Failed to send message", { error: error.message });
  }
};

// 2. Get all conversations for logged-in user
exports.getConversations = async (req, res) => {
  const userId = req.user?._id || req.user?.userId;
  try {
    const conversations = await Conversation.find({
      participants: userId,
    })
      .populate("participants", "username profilePicture isOnline lastSeen")
      .populate({
        path: "lastMessage",
        populate: {
          path: "sender receiver",
          select: "username profilePicture",
        },
      })
      .sort({ updatedAt: -1 });

    return response(res, 200, "Conversations fetched successfully", conversations);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return response(res, 500, "Failed to fetch conversations", { error: error.message });
  }
};

// 3. Get messages for a specific conversation
exports.getMessages = async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user?._id || req.user?.userId;
  try {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return response(res, 404, "Conversation not found");
    }
    if (!conversation.participants.map((p) => p.toString()).includes(userId.toString())) {
      return response(res, 403, "You are not a participant in this conversation");
    }

    const messages = await Message.find({ conversation: conversationId })
      .populate("sender", "username profilePicture")
      .populate("receiver", "username profilePicture")
      .populate("reactions.user", "username profilePicture")
      .sort({ createdAt: 1 });

    await Message.updateMany(
      { conversation: conversationId, receiver: userId, messageStatus: "sent" },
      { $set: { messageStatus: "read" } }
    );

    conversation.unreadCount = 0;
    await conversation.save();

    return response(res, 200, "Messages fetched successfully", messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    return response(res, 500, "Failed to fetch messages", { error: error.message });
  }
};

// 4. Mark message as read
exports.markAsRead = async (req, res) => {
  const { messageId } = req.body;
  const userId = req.user?._id || req.user?.userId;
  try {
    const message = await Message.findById(messageId);
    if (!message) {
      return response(res, 404, "Message not found");
    }
    if (message.receiver.toString() !== userId.toString()) {
      return response(res, 403, "You are not the receiver of this message");
    }

    message.messageStatus = "read";
    await message.save();

    return response(res, 200, "Message marked as read successfully", message);
  } catch (error) {
    console.error("Error marking message as read:", error);
    return response(res, 500, "Failed to mark message as read", { error: error.message });
  }
};

// 5. Delete message
exports.deleteMessage = async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user?._id || req.user?.userId;
  try {
    const message = await Message.findById(messageId);
    if (!message) {
      return response(res, 404, "Message not found");
    }
    if (message.sender.toString() !== userId.toString()) {
      return response(res, 403, "You are not the sender of this message");
    }

    await message.deleteOne();
    return response(res, 200, "Message deleted successfully", message);
  } catch (error) {
    console.error("Error deleting message:", error);
    return response(res, 500, "Failed to delete message", { error: error.message });
  }
};

// 6. Update message
exports.updateMessage = async (req, res) => {
  const { messageId } = req.params;
  const { content } = req.body;
  const userId = req.user?._id || req.user?.userId;
  const file = req.file;

  try {
    const message = await Message.findById(messageId);
    if (!message) {
      return response(res, 404, "Message not found");
    }
    if (message.sender.toString() !== userId.toString()) {
      return response(res, 403, "You can only edit your own messages");
    }

    if (file) {
      const uploadResult = await uploadOnCloudinary(file);
      if (uploadResult?.secure_url) {
        message.imageOrVideoUrl = uploadResult.secure_url;
      }
    }

    if (content !== undefined) {
      message.content = content;
    }

    await message.save();

    const updatedMessage = await Message.findById(message._id)
      .populate("sender", "username profilePicture")
      .populate("receiver", "username profilePicture");

    return response(res, 200, "Message updated successfully", updatedMessage);
  } catch (error) {
    console.error("Error updating message:", error);
    return response(res, 500, "Failed to update message", { error: error.message });
  }
};

// 7. Delete conversation
exports.deleteConversation = async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user?._id || req.user?.userId;

  try {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return response(res, 404, "Conversation not found");
    }
    if (!conversation.participants.map((p) => p.toString()).includes(userId.toString())) {
      return response(res, 403, "You are not a participant in this conversation");
    }

    await Message.deleteMany({ conversation: conversationId });
    await conversation.deleteOne();

    return response(res, 200, "Conversation deleted successfully");
  } catch (error) {
    console.error("Error deleting conversation:", error);
    return response(res, 500, "Failed to delete conversation", { error: error.message });
  }
};