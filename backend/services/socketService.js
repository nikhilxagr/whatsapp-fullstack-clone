const { Server } = require("socket.io");
const User = require("../models/User");
const Message = require("../models/Message");

const onlineUsers = new Map();
const typingUsers = new Map();

const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE"],
    },
    pingTimeout: 60000,
  });

  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);
    let currentUserId = null;

    socket.on("userConnected", async (connectingUserId) => {
      try {
        if (!connectingUserId) return;
        currentUserId = connectingUserId.toString();
        onlineUsers.set(currentUserId, socket.id);
        console.log(`User ${currentUserId} connected with socket ID: ${socket.id}`);
        socket.join(currentUserId);

        const now = new Date();
        await User.findByIdAndUpdate(currentUserId, {
          isOnline: true,
          lastSeen: now,
        });

        const statusPayload = { userId: currentUserId, isOnline: true, lastSeen: now };
        io.emit("userStatusChanged", statusPayload);
        io.emit("user_status", statusPayload);
      } catch (error) {
        console.error("Error updating user online status:", error);
      }
    });

    const handleGetUserStatus = (payload, callback) => {
      if (typeof callback !== "function") return;
      const targetId = typeof payload === "object" ? payload?.userId : payload;
      const isOnline = onlineUsers.has(targetId?.toString());
      callback({
        userId: targetId,
        isOnline,
        lastSeen: isOnline ? new Date() : null,
      });
    };

    socket.on("getUserStatus", handleGetUserStatus);
    socket.on("get_user_status", handleGetUserStatus);

    socket.on("sendMessage", async (messageData) => {
      try {
        const { receiver, receiverId } = messageData;
        const targetUserId = receiverId || receiver?._id || receiver;
        const recipientSocketId = onlineUsers.get(targetUserId?.toString());

        if (recipientSocketId) {
          io.to(recipientSocketId).emit("receiveMessage", messageData);
          io.to(recipientSocketId).emit("receive_message", messageData);
        }

        socket.emit("message_send", messageData);
      } catch (error) {
        console.error("Error sending message via socket:", error);
        socket.emit("message_error", "Failed to send message");
        socket.emit("error", "Failed to send message");
      }
    });

    const handleMessageRead = async ({ messageId }) => {
      try {
        const updatedMessage = await Message.findByIdAndUpdate(
          messageId,
          { messageStatus: "read" },
          { new: true }
        )
          .populate("sender", "username profilePicture")
          .populate("receiver", "username profilePicture");

        if (updatedMessage) {
          const senderSocketId = onlineUsers.get(updatedMessage.sender?._id?.toString());
          const payload = {
            messageId: updatedMessage._id,
            _id: updatedMessage._id,
            conversationId: updatedMessage.conversation,
            messageStatus: "read",
          };
          if (senderSocketId) {
            io.to(senderSocketId).emit("messageRead", updatedMessage);
            io.to(senderSocketId).emit("message_status_update", payload);
          }
          socket.emit("messageRead", updatedMessage);
          socket.emit("message_status_update", payload);
        }
      } catch (error) {
        console.error("Error updating message status:", error);
        socket.emit("message_error", "Failed to update message status");
      }
    };

    socket.on("messageRead", handleMessageRead);
    socket.on("message_read", handleMessageRead);

    const handleTypingStart = ({ conversationId, receiverId }) => {
      if (!currentUserId || !conversationId || !receiverId) return;

      if (!typingUsers.has(currentUserId)) {
        typingUsers.set(currentUserId, {});
      }
      const userTyping = typingUsers.get(currentUserId);
      userTyping[conversationId] = true;

      if (userTyping[`${conversationId}_timeout`]) {
        clearTimeout(userTyping[`${conversationId}_timeout`]);
      }

      userTyping[`${conversationId}_timeout`] = setTimeout(() => {
        userTyping[conversationId] = false;
        const receiverSocketId = onlineUsers.get(receiverId);
        if (receiverSocketId) {
          const stopPayload = {
            conversationId,
            senderId: currentUserId,
            userId: currentUserId,
            isTyping: false,
          };
          io.to(receiverSocketId).emit("typing stop", stopPayload);
          io.to(receiverSocketId).emit("user_typing", stopPayload);
        }
      }, 3000);

      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
        const startPayload = {
          conversationId,
          senderId: currentUserId,
          userId: currentUserId,
          isTyping: true,
        };
        io.to(receiverSocketId).emit("typing start", startPayload);
        io.to(receiverSocketId).emit("user_typing", startPayload);
      }
    };

    const handleTypingStop = ({ conversationId, receiverId }) => {
      if (!currentUserId || !conversationId || !receiverId) return;

      if (typingUsers.has(currentUserId)) {
        const userTyping = typingUsers.get(currentUserId);
        userTyping[conversationId] = false;

        if (userTyping[`${conversationId}_timeout`]) {
          clearTimeout(userTyping[`${conversationId}_timeout`]);
          delete userTyping[`${conversationId}_timeout`];
        }
      }

      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
        const stopPayload = {
          conversationId,
          senderId: currentUserId,
          userId: currentUserId,
          isTyping: false,
        };
        io.to(receiverSocketId).emit("typing stop", stopPayload);
        io.to(receiverSocketId).emit("user_typing", stopPayload);
      }
    };

    socket.on("typing start", handleTypingStart);
    socket.on("typing_start", handleTypingStart);
    socket.on("typing stop", handleTypingStop);
    socket.on("typing_stop", handleTypingStop);

    const handleAddReaction = async ({ messageId, emoji, reactionUserId, userId }) => {
      try {
        const messageDoc = await Message.findById(messageId);
        if (!messageDoc) {
          socket.emit("message_error", "Message not found");
          return;
        }

        const effectiveUserId = reactionUserId || userId || currentUserId;
        const existingIndex = messageDoc.reactions.findIndex(
          (r) => r.user?.toString() === effectiveUserId?.toString()
        );

        if (existingIndex > -1) {
          const existing = messageDoc.reactions[existingIndex];
          if (existing.emoji === emoji) {
            messageDoc.reactions.splice(existingIndex, 1);
          } else {
            messageDoc.reactions[existingIndex].emoji = emoji;
          }
        } else {
          messageDoc.reactions.push({ user: effectiveUserId, emoji });
        }

        await messageDoc.save();

        const populatedMessage = await Message.findById(messageId)
          .populate("sender", "username profilePicture")
          .populate("receiver", "username profilePicture")
          .populate("reactions.user", "username profilePicture");

        const reactionUpdatedPayload = {
          messageId,
          reactions: populatedMessage.reactions,
        };

        const senderSocketId = onlineUsers.get(populatedMessage.sender?._id?.toString());
        const receiverSocketId = onlineUsers.get(populatedMessage.receiver?._id?.toString());

        if (senderSocketId) {
          io.to(senderSocketId).emit("reactionUpdated", reactionUpdatedPayload);
          io.to(senderSocketId).emit("reaction_update", reactionUpdatedPayload);
        }
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("reactionUpdated", reactionUpdatedPayload);
          io.to(receiverSocketId).emit("reaction_update", reactionUpdatedPayload);
        }
      } catch (error) {
        console.error("Error adding reaction:", error);
        socket.emit("message_error", "Failed to add reaction");
      }
    };

    socket.on("addReaction", handleAddReaction);
    socket.on("add_reaction", handleAddReaction);

    socket.on("delete_message", ({ messageId, deletedMessageId, receiverId }) => {
      const targetMessageId = messageId || deletedMessageId;
      if (receiverId) {
        const receiverSocketId = onlineUsers.get(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("message_deleted", { deletedMessageId: targetMessageId });
          io.to(receiverSocketId).emit("messageDeleted", { deletedMessageId: targetMessageId });
        }
      }
    });

    const handleDisconnect = async () => {
      if (!currentUserId) return;

      try {
        onlineUsers.delete(currentUserId);

        if (typingUsers.has(currentUserId)) {
          const userTyping = typingUsers.get(currentUserId);
          Object.keys(userTyping).forEach((key) => {
            if (key.endsWith("_timeout")) {
              clearTimeout(userTyping[key]);
            }
          });
          typingUsers.delete(currentUserId);
        }

        const now = new Date();
        await User.findByIdAndUpdate(currentUserId, {
          isOnline: false,
          lastSeen: now,
        });

        const statusPayload = { userId: currentUserId, isOnline: false, lastSeen: now };
        io.emit("userStatusChanged", statusPayload);
        io.emit("user_status", statusPayload);
        socket.leave(currentUserId);
        console.log(`User ${currentUserId} disconnected and marked offline`);
      } catch (error) {
        console.error("Error handling disconnect:", error);
      }
    };

    socket.on("disconnect", async () => {
      console.log("A user disconnected:", socket.id);
      await handleDisconnect();
    });
  });

  io.socketUserMap = onlineUsers;
  return io;
};

module.exports = { initializeSocket };