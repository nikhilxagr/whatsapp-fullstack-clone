const { Server } = require("socket.io");
const User = require("../models/User");
const Message = require("../models/Message");

// Track all active sockets per user: userId -> Set<socketId>
const userSocketsMap = new Map();
const typingUsers = new Map();

// Map-like helper object for onlineUsers providing full backward compatibility
const onlineUsers = {
  has(userId) {
    if (!userId) return false;
    const s = userSocketsMap.get(userId.toString());
    return Boolean(s && s.size > 0);
  },
  get(userId) {
    if (!userId) return null;
    const s = userSocketsMap.get(userId.toString());
    if (!s || s.size === 0) return null;
    return Array.from(s)[0]; // primary socket id
  },
  getAll(userId) {
    if (!userId) return [];
    const s = userSocketsMap.get(userId.toString());
    return s ? Array.from(s) : [];
  },
  set(userId, socketId) {
    if (!userId || !socketId) return;
    const uid = userId.toString();
    if (!userSocketsMap.has(uid)) {
      userSocketsMap.set(uid, new Set());
    }
    userSocketsMap.get(uid).add(socketId);
  },
  delete(userId, socketId) {
    if (!userId) return true;
    const uid = userId.toString();
    if (!userSocketsMap.has(uid)) return true;
    if (socketId) {
      const s = userSocketsMap.get(uid);
      s.delete(socketId);
      if (s.size === 0) {
        userSocketsMap.delete(uid);
        return true; // user is now fully offline
      }
      return false; // user still has other active sockets
    } else {
      userSocketsMap.delete(uid);
      return true;
    }
  },
  get size() {
    return userSocketsMap.size;
  }
};

const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const allowed = [
          process.env.FRONTEND_URL,
          process.env.FRONTEND_URL?.replace(/\/$/, ""),
          "http://localhost:3000",
          "http://localhost:3001",
          "http://localhost:5173",
        ].filter(Boolean);
        if (allowed.includes(origin) || origin.endsWith(".vercel.app") || process.env.NODE_ENV !== "production") {
          return callback(null, true);
        }
        return callback(null, true);
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE"],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);
    let currentUserId = null;

    socket.on("userConnected", async (connectingUserId) => {
      try {
        if (!connectingUserId) return;
        const targetId = typeof connectingUserId === "object"
          ? (connectingUserId?._id || connectingUserId?.userId || connectingUserId?.id)
          : connectingUserId;
        if (!targetId) return;

        currentUserId = targetId.toString();
        onlineUsers.set(currentUserId, socket.id);
        socket.join(currentUserId);

        console.log(`User ${currentUserId} connected with socket ID: ${socket.id} (active sockets: ${onlineUsers.getAll(currentUserId).length})`);

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
      const targetId = typeof payload === "object" ? (payload?.userId || payload?._id) : payload;
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
        const { receiver, receiverId } = messageData || {};
        const targetUserId = (receiverId || receiver?._id || receiver?.id || receiver)?.toString();

        if (targetUserId) {
          // 1. Emit to user room (reaches all active sockets for this user)
          io.to(targetUserId).emit("receiveMessage", messageData);
          io.to(targetUserId).emit("receive_message", messageData);

          // 2. Also emit to individual socket IDs if tracked
          const sids = onlineUsers.getAll(targetUserId);
          sids.forEach((sid) => {
            io.to(sid).emit("receiveMessage", messageData);
            io.to(sid).emit("receive_message", messageData);
          });
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
          const senderIdStr = (updatedMessage.sender?._id || updatedMessage.sender)?.toString();
          const payload = {
            messageId: updatedMessage._id,
            _id: updatedMessage._id,
            conversationId: updatedMessage.conversation,
            messageStatus: "read",
          };

          if (senderIdStr) {
            io.to(senderIdStr).emit("messageRead", updatedMessage);
            io.to(senderIdStr).emit("message_status_update", payload);
            const sids = onlineUsers.getAll(senderIdStr);
            sids.forEach((sid) => {
              io.to(sid).emit("messageRead", updatedMessage);
              io.to(sid).emit("message_status_update", payload);
            });
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
      const receiverIdStr = receiverId.toString();

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
        const stopPayload = {
          conversationId,
          senderId: currentUserId,
          userId: currentUserId,
          isTyping: false,
        };
        io.to(receiverIdStr).emit("typing stop", stopPayload);
        io.to(receiverIdStr).emit("user_typing", stopPayload);
      }, 3000);

      const startPayload = {
        conversationId,
        senderId: currentUserId,
        userId: currentUserId,
        isTyping: true,
      };
      io.to(receiverIdStr).emit("typing start", startPayload);
      io.to(receiverIdStr).emit("user_typing", startPayload);
    };

    const handleTypingStop = ({ conversationId, receiverId }) => {
      if (!currentUserId || !conversationId || !receiverId) return;
      const receiverIdStr = receiverId.toString();

      if (typingUsers.has(currentUserId)) {
        const userTyping = typingUsers.get(currentUserId);
        userTyping[conversationId] = false;

        if (userTyping[`${conversationId}_timeout`]) {
          clearTimeout(userTyping[`${conversationId}_timeout`]);
          delete userTyping[`${conversationId}_timeout`];
        }
      }

      const stopPayload = {
        conversationId,
        senderId: currentUserId,
        userId: currentUserId,
        isTyping: false,
      };
      io.to(receiverIdStr).emit("typing stop", stopPayload);
      io.to(receiverIdStr).emit("user_typing", stopPayload);
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

        const senderIdStr = populatedMessage.sender?._id?.toString();
        const receiverIdStr = populatedMessage.receiver?._id?.toString();

        if (senderIdStr) {
          io.to(senderIdStr).emit("reactionUpdated", reactionUpdatedPayload);
          io.to(senderIdStr).emit("reaction_update", reactionUpdatedPayload);
        }
        if (receiverIdStr) {
          io.to(receiverIdStr).emit("reactionUpdated", reactionUpdatedPayload);
          io.to(receiverIdStr).emit("reaction_update", reactionUpdatedPayload);
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
        const receiverIdStr = receiverId.toString();
        const payload = { deletedMessageId: targetMessageId, messageId: targetMessageId };
        io.to(receiverIdStr).emit("message_deleted", payload);
        io.to(receiverIdStr).emit("messageDeleted", payload);
      }
    });

    const handleDisconnect = async () => {
      if (!currentUserId) return;

      try {
        const isFullyOffline = onlineUsers.delete(currentUserId, socket.id);
        socket.leave(currentUserId);

        if (isFullyOffline) {
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
          console.log(`User ${currentUserId} disconnected all sockets and is marked offline`);
        } else {
          console.log(`User ${currentUserId} closed socket ${socket.id}, but other sockets remain active`);
        }
      } catch (error) {
        console.error("Error handling disconnect:", error);
      }
    };

    socket.on("disconnect", async () => {
      console.log("A user disconnected:", socket.id);
      await handleDisconnect();
    });

    // Call signaling
    const getRecipientTarget = (to) => {
      if (!to) return null;
      return to.toString();
    };

    socket.on("call:offer", ({ to, offer, callType, from, callerName, callerAvatar }) => {
      const target = getRecipientTarget(to);
      console.log(`[Socket] call:offer from ${from} (${callerName}) to ${to} -> target: ${target}`);
      if (target) {
        io.to(target).emit("call:incoming", { from, offer, callType, callerName, callerAvatar });
      } else {
        console.warn(`[Socket] call:offer recipient not found for: ${to}`);
      }
    });

    socket.on("call:answer", ({ to, answer }) => {
      const target = getRecipientTarget(to);
      console.log(`[Socket] call:answer to ${to} -> target: ${target}`);
      if (target) {
        io.to(target).emit("call:answered", { answer });
      } else {
        console.warn(`[Socket] call:answer recipient not found for: ${to}`);
      }
    });

    socket.on("call:ice-candidate", ({ to, candidate }) => {
      const target = getRecipientTarget(to);
      if (target) {
        io.to(target).emit("call:ice-candidate", { candidate });
      }
    });

    socket.on("call:reject", ({ to }) => {
      const target = getRecipientTarget(to);
      console.log(`[Socket] call:reject to ${to} -> target: ${target}`);
      if (target) {
        io.to(target).emit("call:rejected");
      }
    });

    socket.on("call:end", ({ to }) => {
      const target = getRecipientTarget(to);
      console.log(`[Socket] call:end to ${to} -> target: ${target}`);
      if (target) {
        io.to(target).emit("call:ended");
      }
    });
  });

  io.socketUserMap = onlineUsers;
  return io;
};

module.exports = { initializeSocket };