import { create } from "zustand";
import * as chatApi from "../services/chat.api";
import { getSocket } from "../services/chat.service";
import axiosInstance from "../services/url.service";

const useChatStore = create((set, get) => ({
  // 1. Zustand Store State Architecture
  conversations: [],
  currentConversation: null,
  selectedConversation: null,
  messages: [],
  onlineUsers: new Map(), 
  typingUsers: new Map(), 
  currentUser: null,
  isLoadingConversations: false,
  isLoadingMessages: false,

  // Set the current logged in user profile
  setCurrentUser: (user) => {
    set({ currentUser: user });
  },

  // 2. Socket Event Listener Management
  initSocketListeners: () => {
    const socket = getSocket();
    if (!socket) return;

    // Deduplication & Teardown Protocol
    socket.off("receive_message");
    socket.off("user_typing");
    socket.off("user_status");
    socket.off("message_send");
    socket.off("message_status_update");
    socket.off("reaction_update");
    socket.off("message_deleted");
    socket.off("message_error");

    // Also unbind legacy camelCase names for clean teardown
    socket.off("receiveMessage");
    socket.off("userStatusChanged");
    socket.off("typing start");
    socket.off("typing stop");
    socket.off("messageRead");
    socket.off("reactionUpdated");
    socket.off("messageDeleted");

    // Real-Time Event Bindings: message_send
    socket.on("message_send", (confirmedMsg) => {
      if (!confirmedMsg?._id) return;
      set((state) => ({
        messages: state.messages.map((m) =>
          m.tempId && (m.tempId === confirmedMsg.tempId || m.content === confirmedMsg.content)
            ? { ...m, ...confirmedMsg, tempId: undefined }
            : m._id === confirmedMsg._id
            ? { ...m, ...confirmedMsg }
            : m
        ),
      }));
    });

    // Real-Time Event Bindings: message  status update
    const handleStatusUpdate = (payload) => {
      const { messageId, _id, messageStatus } = payload;
      const targetId = messageId || _id;
      if (!targetId || !messageStatus) return;

      set((state) => ({
        messages: state.messages.map((m) =>
          m._id === targetId ? { ...m, messageStatus } : m
        ),
      }));
    };
    socket.on("message_status_update", handleStatusUpdate);
    socket.on("messageRead", handleStatusUpdate);

    // Real-Time Event Bindings: reaction update
    const handleReactionUpdate = ({ messageId, reactions }) => {
      if (!messageId || !reactions) return;
      set((state) => ({
        messages: state.messages.map((m) =>
          m._id === messageId ? { ...m, reactions } : m
        ),
      }));
    };
    socket.on("reaction_update", handleReactionUpdate);
    socket.on("reactionUpdated", handleReactionUpdate);

    // Real-Time Event Bindings: message_deleted
    const handleMessageDeleted = ({ deletedMessageId, messageId }) => {
      const targetId = deletedMessageId || messageId;
      if (!targetId) return;
      set((state) => ({
        messages: state.messages.filter((m) => m._id !== targetId),
      }));
    };
    socket.on("message_deleted", handleMessageDeleted);
    socket.on("messageDeleted", handleMessageDeleted);

    // Real-Time Event Bindings: user_typing
    const handleUserTyping = ({ userId, senderId, conversationId, isTyping }) => {
      const effectiveUserId = (userId || senderId)?.toString();
      if (!conversationId || !effectiveUserId) return;

      set((state) => {
        const nextTyping = new Map(state.typingUsers);
        const userSet = new Set(nextTyping.get(conversationId) || []);

        if (isTyping) {
          userSet.add(effectiveUserId);
        } else {
          userSet.delete(effectiveUserId);
        }

        if (userSet.size > 0) {
          nextTyping.set(conversationId, userSet);
        } else {
          nextTyping.delete(conversationId);
        }

        return { typingUsers: nextTyping };
      });
    };
    socket.on("user_typing", handleUserTyping);
    socket.on("typing start", (data) => handleUserTyping({ ...data, isTyping: true }));
    socket.on("typing stop", (data) => handleUserTyping({ ...data, isTyping: false }));

    // Real-Time Event Bindings: user_status
    const handleUserStatus = ({ userId, isOnline, lastSeen }) => {
      if (!userId) return;
      set((state) => {
        const nextOnline = new Map(state.onlineUsers);
        nextOnline.set(userId.toString(), {
          isOnline: Boolean(isOnline),
          lastSeen: lastSeen ? new Date(lastSeen) : new Date(),
        });
        return { onlineUsers: nextOnline };
      });
    };
    socket.on("user_status", handleUserStatus);
    socket.on("userStatusChanged", handleUserStatus);

    // Real-Time Event Bindings: receive_message
    const handleReceiveMessage = (message) => {
      get().receiveMessage(message);
    };
    socket.on("receive_message", handleReceiveMessage);
    socket.on("receiveMessage", handleReceiveMessage);

    // Syncing Contacts' Online Presence
    const { conversations, currentUser } = get();
    const myId = currentUser?._id?.toString();

    conversations.forEach((conv) => {
      const participants = conv?.participants || [];
      participants.forEach((p) => {
        const participantId = (p._id || p)?.toString();
        if (participantId && participantId !== myId) {
          socket.emit("get_user_status", { userId: participantId }, (status) => {
            if (status) {
              set((state) => {
                const nextOnline = new Map(state.onlineUsers);
                nextOnline.set(participantId, {
                  isOnline: Boolean(status.isOnline),
                  lastSeen: status.lastSeen ? new Date(status.lastSeen) : null,
                });
                return { onlineUsers: nextOnline };
              });
            }
          });
        }
      });
    });
  },

  // 3. REST Integration Actions
  fetchConversations: async () => {
    set({ isLoadingConversations: true });
    try {
      const data = await chatApi.getConversations();
      const list = data?.data || data?.conversations || (Array.isArray(data) ? data : []);
      set({ conversations: list });

      // Trigger socket listeners and online presence sync immediately after conversations arrive
      get().initSocketListeners();
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
    } finally {
      set({ isLoadingConversations: false });
    }
  },

  fetchMessages: async (conversationId) => {
    if (!conversationId) return;
    set({ isLoadingMessages: true, currentConversation: conversationId });

    try {
      const data = await chatApi.getMessages(conversationId);
      const list = data?.data || data?.messages || (Array.isArray(data) ? data : []);
      set({ messages: list });

      // Automatically clear unread badges for this chat
      get().markMessagesAsRead(conversationId);
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    } finally {
      set({ isLoadingMessages: false });
    }
  },

  // UI Selection helper
  setSelectedConversation: (conv) => {
    const convId = (conv?._id || conv)?.toString() || null;
    const currentId = (get().currentConversation?._id || get().currentConversation)?.toString() || null;

    if (convId && convId === currentId && get().messages.length > 0) {
      set({ selectedConversation: conv });
      return;
    }

    set({ selectedConversation: conv, currentConversation: convId, messages: [] });
    if (convId) {
      get().fetchMessages(convId);
    }
  },

  // 4. Real-Time Message Pipeline Setup
  receiveMessage: (message) => {
    if (!message?._id) return;

    set((state) => {
      // 1. Duplicate Prevention
      const isDuplicate = state.messages.some((m) => m._id === message._id);
      if (isDuplicate) return state;

      const messageConvId = (message.conversation?._id || message.conversation)?.toString();
      const activeConvId = (state.currentConversation?._id || state.currentConversation)?.toString();
      const isViewingChat = activeConvId && messageConvId === activeConvId;

      const myId = state.currentUser?._id?.toString();
      const isForMe = (message.receiver?._id || message.receiver)?.toString() === myId;

      // 2. Route to Active Window
      const nextMessages = isViewingChat ? [...state.messages, message] : state.messages;

      // 3. Sidebar Thread Update
      let conversationFound = false;
      const nextConversations = state.conversations.map((conv) => {
        if (conv._id?.toString() === messageConvId) {
          conversationFound = true;
          const increment = !isViewingChat && isForMe ? 1 : 0;
          return {
            ...conv,
            lastMessage: message,
            unreadCount: isViewingChat ? 0 : (conv.unreadCount || 0) + increment,
          };
        }
        return conv;
      });

      // If conversation is brand new, refresh list
      if (!conversationFound) {
        setTimeout(() => get().fetchConversations(), 500);
      }

      return {
        messages: nextMessages,
        conversations: nextConversations,
      };
    });

    // Mark as read immediately if current conversation is active
    const activeConvId = (get().currentConversation?._id || get().currentConversation)?.toString();
    const messageConvId = (message.conversation?._id || message.conversation)?.toString();
    if (activeConvId && messageConvId === activeConvId) {
      get().markMessagesAsRead(activeConvId);
    }
  },

  markMessagesAsRead: async (conversationId) => {
    const targetConvId = (conversationId || get().currentConversation)?.toString();
    if (!targetConvId) return;

    const { messages, currentUser, conversations } = get();
    const myId = currentUser?._id?.toString();

    const unreadMsgs = messages.filter(
      (m) =>
        ((m.receiver?._id || m.receiver)?.toString() === myId) &&
        m.messageStatus !== "read"
    );

    const convList = Array.isArray(conversations) ? conversations : conversations?.data || [];
    const targetConv = convList.find(
      (c) => c._id?.toString() === targetConvId
    );

    // Skip state update if no unread messages and unreadCount is already 0
    if (unreadMsgs.length === 0 && (!targetConv || targetConv.unreadCount === 0)) {
      return;
    }

    const messageIds = unreadMsgs.map((m) => m._id);

    set((state) => {
      const currentList = Array.isArray(state.conversations) ? state.conversations : state.conversations?.data || [];
      const updatedConversations = currentList.map((c) =>
        c._id?.toString() === targetConvId ? { ...c, unreadCount: 0 } : c
      );

      return {
        messages: messageIds.length > 0
          ? state.messages.map((m) =>
              messageIds.includes(m._id) ? { ...m, messageStatus: "read" } : m
            )
          : state.messages,
        conversations: Array.isArray(state.conversations)
          ? updatedConversations
          : { ...state.conversations, data: updatedConversations },
      };
    });

    try {
      if (messageIds.length > 0) {
        await chatApi.markMessagesAsRead({
          messageIds,
          conversationId: targetConvId,
        });

        const socket = getSocket();
        if (socket) {
          unreadMsgs.forEach((msg) => {
            const senderId = (msg.sender?._id || msg.sender)?.toString();
            socket.emit("message_read", {
              messageId: msg._id,
              conversationId: targetConvId,
              senderId,
            });
          });
        }
      }
    } catch (err) {
      console.error("Failed to mark messages as read:", err);
    }
  },

  deleteMessage: async (messageId) => {
    if (!messageId) return;

    // Optimistic delete
    set((state) => ({
      messages: state.messages.filter((m) => m._id !== messageId),
    }));

    try {
      await chatApi.deleteMessage(messageId);

      const socket = getSocket();
      if (socket) {
        socket.emit("delete_message", { messageId, deletedMessageId: messageId });
      }
    } catch (err) {
      console.error("Failed to delete message:", err);
      // Reload on failure
      const activeConvId = get().currentConversation;
      if (activeConvId) get().fetchMessages(activeConvId);
    }
  },

  // 5. Helper Actions & UI Selectors
  addReaction: async (messageId, emoji) => {
    const { currentUser } = get();
    const myId = currentUser?._id;
    if (!messageId || !emoji || !myId) return;

    const socket = getSocket();
    if (socket) {
      socket.emit("add_reaction", {
        messageId,
        emoji,
        userId: myId,
      });
    }
  },

  startTyping: (receiverId, conversationId) => {
    const socket = getSocket();
    const convId = conversationId || get().currentConversation;
    if (!socket || !receiverId || !convId) return;

    socket.emit("typing_start", {
      conversationId: convId,
      receiverId,
    });
  },

  stopTyping: (receiverId, conversationId) => {
    const socket = getSocket();
    const convId = conversationId || get().currentConversation;
    if (!socket || !receiverId || !convId) return;

    socket.emit("typing_stop", {
      conversationId: convId,
      receiverId,
    });
  },

  // Selector: check if a user is currently typing in a conversation
  isUserTyping: (userId, conversationId) => {
    if (!userId) return false;
    const { typingUsers, currentConversation } = get();
    const convId = conversationId || currentConversation;
    if (!convId) return false;

    const userSet = typingUsers.get(convId?.toString());
    return Boolean(userSet && userSet.has(userId.toString()));
  },

  // Selector: check if a user is online
  isUserOnline: (userId) => {
    if (!userId) return false;
    const { onlineUsers } = get();
    return Boolean(onlineUsers.get(userId.toString())?.isOnline);
  },

  // Selector: get user last seen Date
  getUserLastSeen: (userId) => {
    if (!userId) return null;
    const { onlineUsers } = get();
    return onlineUsers.get(userId.toString())?.lastSeen || null;
  },

  // Flush all state on logout
  cleanUp: () => {
    set({
      conversations: [],
      currentConversation: null,
      selectedConversation: null,
      messages: [],
      onlineUsers: new Map(),
      typingUsers: new Map(),
      currentUser: null,
      isLoadingConversations: false,
      isLoadingMessages: false,
    });
  },

  // sendMessage implementation
  sendMessage: async (formData) => {
    // 1. Extract values from FormData or object for optimistic state generation
    const isFormData = typeof FormData !== "undefined" && formData instanceof FormData;
    const senderId = isFormData ? formData.get("senderId") : formData?.senderId;
    const receiverId = isFormData ? formData.get("receiverId") : formData?.receiverId;
    const media = isFormData
      ? (formData.get("media") || formData.get("file"))
      : (formData?.media || formData?.file);
    const content = isFormData ? formData.get("content") : formData?.content;
    const messageStatus = isFormData ? formData.get("messageStatus") : formData?.messageStatus;
    const socket = getSocket();
    const { conversations } = get();

    // 2. Resolve or find matching conversation ID
    let conversationId = null;
    const convList = Array.isArray(conversations) ? conversations : conversations?.data || [];
    if (convList.length > 0) {
      const matchedConv = convList.find(
        (conv) =>
          conv.participants?.some((p) => (p._id || p)?.toString() === senderId?.toString()) &&
          conv.participants?.some((p) => (p._id || p)?.toString() === receiverId?.toString())
      );
      if (matchedConv) {
        conversationId = matchedConv._id;
        set({ currentConversation: conversationId });
      }
    }

    // 3. Create Optimistic Message with a temporary ID
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      _id: tempId,
      tempId,
      sender: { _id: senderId },
      receiver: { _id: receiverId },
      conversation: conversationId,
      imageOrVideoUrl:
        media && typeof media !== "string"
          ? URL.createObjectURL(media)
          : typeof media === "string"
          ? media
          : null,
      content: content || null,
      contentType: media ? (media.type?.startsWith("video") ? "video" : "image") : "text",
      createdAt: new Date().toISOString(),
      messageStatus: messageStatus || "sent",
      reactions: [],
    };

    // 4. Immediately append temporary message to state (instant feedback in UI)
    set((state) => ({
      messages: [...state.messages, optimisticMessage],
    }));

    try {
      // 5. REST API Call to store message in DB and upload file to Cloudinary
      let payload = formData;
      if (!isFormData) {
        if (media) {
          payload = new FormData();
          payload.append("senderId", senderId);
          payload.append("receiverId", receiverId);
          if (content) payload.append("content", content);
          payload.append("media", media);
          payload.append("file", media);
          if (messageStatus) payload.append("messageStatus", messageStatus);
        } else {
          payload = { senderId, receiverId, content, messageStatus };
        }
      } else {
        if (formData.has("media") && !formData.has("file")) {
          formData.append("file", formData.get("media"));
        }
        if (formData.has("file") && !formData.has("media")) {
          formData.append("media", formData.get("file"));
        }
      }

      const response = await axiosInstance.post("/chats/send-message", payload, {
        headers:
          isFormData || payload instanceof FormData
            ? { "Content-Type": "multipart/form-data" }
            : undefined,
      });
      const realMessageData =
        response.data?.data || response.data?.message || response.data;

      // 6. Replace optimistic message with the permanent response from MongoDB
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === tempId ? realMessageData : msg
        ),
      }));

      if (socket && realMessageData) {
        socket.emit("sendMessage", realMessageData);
      }

      // Update conversation lastMessage in sidebar
      get().receiveMessage(realMessageData);

      return realMessageData;
    } catch (error) {
      console.error("Error sending message:", error);
      // 7. Rollback / Mark message as failed in UI if network request fails
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === tempId ? { ...msg, messageStatus: "failed" } : msg
        ),
        error: error.response?.data?.message || error.message,
      }));
      throw error;
    }
  },

  addMessage: (message) => {
    get().receiveMessage(message);
  },

  setOnlineStatus: (userId, isOnline) => {
    if (!userId) return;
    set((state) => {
      const next = new Map(state.onlineUsers);
      next.set(userId.toString(), {
        isOnline: Boolean(isOnline),
        lastSeen: isOnline ? new Date() : new Date(),
      });
      return { onlineUsers: next };
    });
  },

  setTyping: (conversationId, senderId, isTyping) => {
    if (!conversationId || !senderId) return;
    set((state) => {
      const next = new Map(state.typingUsers);
      const userSet = new Set(next.get(conversationId) || []);
      isTyping ? userSet.add(senderId.toString()) : userSet.delete(senderId.toString());
      userSet.size > 0 ? next.set(conversationId, userSet) : next.delete(conversationId);
      return { typingUsers: next };
    });
  },

  updateMessageStatus: (messageId, status) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m._id === messageId ? { ...m, messageStatus: status } : m
      ),
    }));
  },

  resetChat: () => {
    get().cleanUp();
  },
}));

export default useChatStore;
