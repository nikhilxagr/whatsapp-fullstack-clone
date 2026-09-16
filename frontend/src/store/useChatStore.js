import { create } from "zustand";
import * as chatApi from "../services/chat.api";
import { getSocket } from "../services/chat.service";

const useChatStore = create((set, get) => ({
  conversations: [],
  selectedConversation: null,
  messages: [],
  onlineUsers: new Set(),
  typingUsers: {}, // { [conversationId]: senderId | null }
  isLoadingMessages: false,
  isLoadingConversations: false,

  fetchConversations: async () => {
    set({ isLoadingConversations: true });
    try {
      const data = await chatApi.getConversations();
      const list = data?.data || data?.conversations || [];
      set({ conversations: list });
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
    } finally {
      set({ isLoadingConversations: false });
    }
  },

  setSelectedConversation: (conv) => {
    set({ selectedConversation: conv, messages: [] });
    if (conv?._id) {
      get().fetchMessages(conv._id);
    }
  },

  fetchMessages: async (conversationId) => {
    set({ isLoadingMessages: true });
    try {
      const data = await chatApi.getMessages(conversationId);
      const list = data?.data || data?.messages || [];
      set({ messages: list });
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    } finally {
      set({ isLoadingMessages: false });
    }
  },

  addMessage: (message) => {
    set((state) => {
      const exists = state.messages.some((m) => m._id === message._id);
      if (exists) return state;

      const updatedConversations = state.conversations.map((c) =>
        c._id === message.conversation
          ? { ...c, lastMessage: message, unreadCount: (c.unreadCount || 0) + 1 }
          : c
      );

      return {
        messages: [...state.messages, message],
        conversations: updatedConversations,
      };
    });
  },

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
        get().addMessage(savedMessage);
        getSocket()?.emit("sendMessage", savedMessage);
      }

      return savedMessage;
    } catch (err) {
      console.error("Failed to send message:", err);
      throw err;
    }
  },

  updateMessageStatus: (messageId, status) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m._id === messageId ? { ...m, messageStatus: status } : m
      ),
    }));
  },

  setOnlineStatus: (userId, isOnline) => {
    set((state) => {
      const next = new Set(state.onlineUsers);
      isOnline ? next.add(userId) : next.delete(userId);
      return { onlineUsers: next };
    });
  },

  setTyping: (conversationId, senderId, isTyping) => {
    set((state) => ({
      typingUsers: {
        ...state.typingUsers,
        [conversationId]: isTyping ? senderId : null,
      },
    }));
  },

  resetChat: () => {
    set({
      conversations: [],
      selectedConversation: null,
      messages: [],
      onlineUsers: new Set(),
      typingUsers: {},
      isLoadingMessages: false,
      isLoadingConversations: false,
    });
  },
}));

export default useChatStore;
