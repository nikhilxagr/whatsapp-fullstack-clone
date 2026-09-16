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
        currentUserId = connectingUserId;
        onlineUsers.set(currentUserId, socket.id);
        console.log(`User ${currentUserId} connected with socket ID: ${socket.id}`);
        socket.join(currentUserId);

        await User.findByIdAndUpdate(currentUserId, {
          isOnline: true,
          lastSeen: new Date(),
        });

        io.emit("userStatusChanged", { userId: currentUserId, isOnline: true });
      } catch (error) {
        console.error("Error updating user online status:", error);
      }
    });

    socket.on("getUserStatus", (requestingUserId, callback) => {
      if (typeof callback !== "function") return;
      const isOnline = onlineUsers.has(requestingUserId);
      callback({
        userId: requestingUserId,
        isOnline,
        lastSeen: isOnline ? new Date() : null,
      });
    });

    socket.on("sendMessage", async (messageData) => {
      try {
        const { receiver, receiverId } = messageData;
        const targetUserId = receiverId || receiver?._id || receiver;
        const recipientSocketId = onlineUsers.get(targetUserId?.toString());

        if (recipientSocketId) {
          io.to(recipientSocketId).emit("receiveMessage", messageData);
        }
      } catch (error) {
        console.error("Error sending message via socket:", error);
        socket.emit("error", "Failed to send message");
      }
    });

    socket.on("messageRead", async ({ messageId }) => {
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
          if (senderSocketId) {
            io.to(senderSocketId).emit("messageRead", updatedMessage);
          }
          socket.emit("messageRead", updatedMessage);
        }
      } catch (error) {
        console.error("Error updating message status:", error);
        socket.emit("error", "Failed to update message status");
      }
    });

    socket.on("typing start", ({ conversationId, receiverId }) => {
      if (!currentUserId || !conversationId || !receiverId) return;

      if (!typingUsers.has(currentUserId)) {
        typingUsers.set(currentUserId, {});
      }
      const userTyping = typingUsers.get(currentUserId);
      userTyping[conversationId] = true;

      // Clear existing timeout if present
      if (userTyping[`${conversationId}_timeout`]) {
        clearTimeout(userTyping[`${conversationId}_timeout`]);
      }

      userTyping[`${conversationId}_timeout`] = setTimeout(() => {
        userTyping[conversationId] = false;
        const receiverSocketId = onlineUsers.get(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("typing stop", {
            conversationId,
            senderId: currentUserId,
            isTyping: false,
          });
        }
      }, 3000);

      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("typing start", {
          conversationId,
          senderId: currentUserId,
          isTyping: true,
        });
      }
    });

    socket.on("typing stop", ({ conversationId, receiverId }) => {
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
        io.to(receiverSocketId).emit("typing stop", {
          conversationId,
          senderId: currentUserId,
          isTyping: false,
        });
      }
    });

    socket.on("addReaction", async ({ messageId, emoji, reactionUserId }) => {
      try {
        const messageDoc = await Message.findById(messageId);
        if (!messageDoc) {
          socket.emit("error", "Message not found");
          return;
        }

        const effectiveUserId = reactionUserId || currentUserId;
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

        if (senderSocketId) io.to(senderSocketId).emit("reactionUpdated", reactionUpdatedPayload);
        if (receiverSocketId) io.to(receiverSocketId).emit("reactionUpdated", reactionUpdatedPayload);
      } catch (error) {
        console.error("Error adding reaction:", error);
        socket.emit("error", "Failed to add reaction");
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

        await User.findByIdAndUpdate(currentUserId, {
          isOnline: false,
          lastSeen: new Date(),
        });

        io.emit("userStatusChanged", { userId: currentUserId, isOnline: false });
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