const Status = require("../models/Status");
const Message = require("../models/Message");
const { uploadFileToCloudinary } = require("../utils/cloudinary");
const response = require("../utils/responseHandler");

exports.createStatus = async (req, res) => {
  try {
    const { content, contentType } = req.body;
    const userId = req.user.userId;
    const file = req.file;

    // check if a status already exists for the user
    let status = await Status.findOne({ user: req.user.userId });

    if (status) {
      // update the existing status
      status.content = content;
      status.contentType = contentType;
      if (file) {
        const uploadFile = await uploadFileToCloudinary(file);
        if (uploadFile?.secure_url) {
          status.imageOrVideoUrl = uploadFile.secure_url;
        }
      }
      await status.save();
    } else {
      // create a new status
      status = new Status({
        user: req.user.userId,
        content: content,
        messageType: messageType,
        imageOrVideoUrl: file ? (await uploadFileToCloudinary(file))?.secure_url : null,
      });
      await status.save();
    }

    res.status(201).json({ message: "Status created/updated successfully", data: status });
  } catch (error) {
    console.error("Error creating/updating status:", error);
    res.status(500).json({ error: "Failed to create/update status" });
  }
};

    let conversation = await Conversation.findOne({
      participants: [senderId, receiverId],
    });

    if (!conversation) {
      // create a new conversation if it doesn't exist
      conversation = new Conversation({
        participants: [senderId, receiverId],
        lastMessage: null,
        unreadCount: 0,
      });
      await conversation.save();
    }

    let imageOrVideoUrl = null;
    let contentType = null;

    if (file) {
      const uploadFile = await uploadFileToCloudinary(file);
      if (uploadFile?.secure_url) {
        return res.status(400).json({ error: "File upload failed" });
      }
      imageOrVideoUrl = uploadFile?.secure_url;

      if (file.mimetype.startsWith("image/")) {
        contentType = "image";
      } else if (file.mimetype.startsWith("video/")) {
        contentType = "video";
      } else {
        return res
          .status(400)
          .json({
            error: "Invalid file type. Only images and videos are allowed.",
          });
      }
    } else if (!content?.trim()) {
      contentType = "text";
    } else {
      return res.status(400).json({ error: "Message content is required" });
    }

    const message = new Message({
      conversation: conversation._id,
      sender: senderId,
      receiver: receiverId,
      content: content || null,
      contentType: contentType,
      imageOrVideoUrl: imageOrVideoUrl || null,
      messageStatus: messageStatus || "sent",
    });
    await message.save();

    if (message?.content) {
      conversation.lastMessage = message?.id;
    }
    conversation.unreadCount += 1;
    await conversation.save();

    const populatedMessage = await Message.findById(message._id)
      .populate("sender", "username profilePicture")
      .populate("receiver", "username profilePicture");
    res
      .status(201)
      .json({ message: "Message sent successfully", data: populatedMessage });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ error: "Failed to send message" });
  }
};

// get all conversations

exports.getConversations = async (req, res) => {
  const userId = req.user.userId;
  try {
    let conversations = await Conversation.find({
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
    return response.success(
      res,
      200,
      "Conversations fetched successfully",
      conversations,
    );
  } catch (error) {
    console.error("Error fetching conversations:", error);
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
};

// get messages for a specific conversation

exports.getMessages = async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user.userId;
  try {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }
    if (!conversation.participants.includes(userId)) {
      return res
        .status(403)
        .json({ error: "You are not a participant in this conversation" });
    }
    const messages = await Message.find({ conversation: conversationId })
      .populate("sender", "username profilePicture")
      .populate("receiver", "username profilePicture")
      .sort({ createdAt: 1 });

    await Message.updateMany(
      { conversation: conversationId, receiver: userId, messageStatus: "sent" },
      { $set: { messageStatus: "read" } },
    );

    conversation.unreadCount = 0;
    await conversation.save();
    return response.success(
      res,
      200,
      "Messages fetched successfully",
      messages,
    );
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
};

exports.markAsRead = async (req, res) => {
  const { messageId } = req.body;
  const userId = req.user.userId;
  try {
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }
    if (message.receiver.toString() !== userId) {
      return res
        .status(403)
        .json({ error: "You are not the receiver of this message" });
    }
    message.messageStatus = "read";
    await message.save();
    return response.success(
      res,
      200,
      "Message marked as read successfully",
      message,
    );
  } catch (error) {
    console.error("Error marking message as read:", error);
    res.status(500).json({ error: "Failed to mark message as read" });
  }
};

exports.deleteMessage = async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user.userId;
  try {
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }
    if (message.sender.toString() !== userId) {
      return res
        .status(403)
        .json({ error: "You are not the sender of this message" });
    }
    await message.deleteOne();
    return response.success(res, 200, "Message deleted successfully", message);
  } catch (error) {
    console.error("Error deleting message:", error);
    res.status(500).json({ error: "Failed to delete message" });
  }
};
