import { create } from "zustand";
import * as chatApi from "../services/chat.api";
import { getSocket } from "../services/chat.service";

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
    const convId = conv?._id || conv;
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
    const targetConvId = conversationId || get().currentConversation;
    if (!targetConvId) return;

    const { messages, currentUser } = get();
    const myId = currentUser?._id?.toString();

    const unreadMsgs = messages.filter(
      (m) =>
        ((m.receiver?._id || m.receiver)?.toString() === myId) &&
        m.messageStatus !== "read"
    );

    const messageIds = unreadMsgs.map((m) => m._id);

    // Optimistically update local message status to read
    set((state) => ({
      messages: state.messages.map((m) =>
        messageIds.includes(m._id) ? { ...m, messageStatus: "read" } : m
      ),
      conversations: state.conversations.map((c) =>
        c._id?.toString() === targetConvId?.toString() ? { ...c, unreadCount: 0 } : c
      ),
    }));

    try {
      await chatApi.markMessagesAsRead({
        messageIds,
        conversationId: targetConvId,
      });

      // Emit socket message_read event with sender info
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

  // Backward compatibility methods
  sendMessage: async ({ senderId, receiverId, content, file }) => {
    try {
      let payload;
      if (file) {
        payload = new FormData();
        payload.append("senderId", senderId);
        payload.append("receiverId", receiverId);
        if (content) payload.append("content", content);
        payload.append("file", file);
      } else {
        payload = { senderId, receiverId, content };
      }

      const data = await chatApi.sendMessage(payload);
      const savedMessage = data?.data || data?.message;

      if (savedMessage) {
        get().receiveMessage(savedMessage);
        getSocket()?.emit("sendMessage", savedMessage);
      }

      return savedMessage;
    } catch (err) {
      console.error("Failed to send message:", err);
      throw err;
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
