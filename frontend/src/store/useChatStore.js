import { create } from "zustand";
import * as chatApi from "../services/chat.api";
import { getSocket } from "../services/chat.service";
import axiosInstance from "../services/url.service";
import useUserStore from "./useUserStore";
import useLayoutStore from "./useLayoutStore";

const useChatStore = create((set, get) => ({
  conversations: [],
  currentConversation: null,
  selectedConversation: null,
  messages: [],
  onlineUsers: new Map(), 
  typingUsers: new Map(), 
  currentUser: null,
  isLoadingConversations: false,
  isLoadingMessages: false,

  setCurrentUser: (user) => {
    set({ currentUser: user });
    const uid = (user?._id || user?.id || user?.userId)?.toString();
    const socket = getSocket();
    if (socket?.connected && uid) {
      socket.emit("userConnected", uid);
    }
  },

  initSocketListeners: () => {
    const socket = getSocket();
    if (!socket) return;

    socket.off("receive_message");
    socket.off("user_typing");
    socket.off("user_status");
    socket.off("message_send");
    socket.off("message_status_update");
    socket.off("reaction_update");
    socket.off("message_deleted");
    socket.off("message_error");
    socket.off("conversationDeleted");

    socket.off("receiveMessage");
    socket.off("userStatusChanged");
    socket.off("typing start");
    socket.off("typing stop");
    socket.off("messageRead");
    socket.off("reactionUpdated");
    socket.off("messageDeleted");

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

    const handleMessageDeleted = ({ deletedMessageId, messageId }) => {
      const targetId = deletedMessageId || messageId;
      if (!targetId) return;
      set((state) => ({
        messages: state.messages.filter((m) => m._id !== targetId),
      }));
    };
    socket.on("message_deleted", handleMessageDeleted);
    socket.on("messageDeleted", handleMessageDeleted);

    // Handle the other participant's side when a conversation is deleted
    socket.on("conversationDeleted", ({ conversationId }) => {
      if (!conversationId) return;
      set((state) => ({
        conversations: state.conversations.filter(
          (c) => c._id?.toString() !== conversationId?.toString()
        ),
        messages:
          (state.currentConversation?.toString() === conversationId?.toString())
            ? []
            : state.messages,
        currentConversation:
          (state.currentConversation?.toString() === conversationId?.toString())
            ? null
            : state.currentConversation,
      }));
    });

    // Handle the other participant's side when a conversation is cleared
    socket.on("conversationCleared", ({ conversationId }) => {
      if (!conversationId) return;
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c._id?.toString() === conversationId?.toString()
            ? { ...c, lastMessage: null, unreadCount: 0 }
            : c
        ),
        messages:
          state.currentConversation?.toString() === conversationId?.toString()
            ? []
            : state.messages,
      }));
    });

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

    const handleReceiveMessage = (message) => {
      get().receiveMessage(message);
    };
    socket.on("receive_message", handleReceiveMessage);
    socket.on("receiveMessage", handleReceiveMessage);

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

  fetchConversations: async () => {
    set({ isLoadingConversations: true });
    try {
      const data = await chatApi.getConversations();
      const list = data?.data || data?.conversations || (Array.isArray(data) ? data : []);
      set({ conversations: list });

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

      get().markMessagesAsRead(conversationId);
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    } finally {
      set({ isLoadingMessages: false });
    }
  },

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

  receiveMessage: (message) => {
    if (!message?._id) return;

    const myUser = get().currentUser || useUserStore.getState().user;
    const myId = (myUser?._id || myUser?.id || myUser?.userId)?.toString();

    const senderId = (message.sender?._id || message.sender?.id || message.sender)?.toString();
    const receiverId = (message.receiver?._id || message.receiver?.id || message.receiver)?.toString();
    const messageConvId = (message.conversation?._id || message.conversation)?.toString();

    const activeConvId = (get().currentConversation?._id || get().currentConversation)?.toString();
    const selectedContact = useLayoutStore.getState().selectedContact;
    const selectedContactId = (selectedContact?._id || selectedContact?.id)?.toString();

    // Check if the user is currently viewing this chat (either matching conversation ID or matching selected contact)
    const isWithActiveContact = Boolean(
      selectedContactId && (senderId === selectedContactId || receiverId === selectedContactId)
    );
    const isViewingChat = Boolean(
      (activeConvId && messageConvId && activeConvId === messageConvId) || isWithActiveContact
    );

    const isForMe = Boolean(myId && receiverId === myId);

    set((state) => {
      const isDuplicate = state.messages.some((m) => m._id === message._id);

      let nextMessages = state.messages;
      if (isViewingChat) {
        if (isDuplicate) {
          nextMessages = state.messages.map((m) =>
            m._id === message._id ? { ...m, ...message } : m
          );
        } else {
          nextMessages = [...state.messages, message];
        }
      }

      // If viewing chat and currentConversation wasn't set yet, attach it
      const nextCurrentConv =
        !state.currentConversation && messageConvId && isViewingChat
          ? messageConvId
          : state.currentConversation;

      const rawConversations = Array.isArray(state.conversations)
        ? state.conversations
        : state.conversations?.data || [];

      let conversationFound = false;
      const updatedConversations = rawConversations.map((conv) => {
        const convId = conv._id?.toString();
        const matchesConvId = convId && messageConvId && convId === messageConvId;
        const matchesParticipants =
          conv.participants?.some((p) => (p._id || p)?.toString() === senderId) &&
          conv.participants?.some((p) => (p._id || p)?.toString() === receiverId);

        if (matchesConvId || matchesParticipants) {
          conversationFound = true;
          const increment = !isViewingChat && isForMe ? 1 : 0;
          return {
            ...conv,
            lastMessage: message,
            unreadCount: isViewingChat ? 0 : (conv.unreadCount || 0) + increment,
            updatedAt: message.createdAt || new Date().toISOString(),
          };
        }
        return conv;
      });

      // Move latest conversation to top of the list (matching WhatsApp behavior)
      if (conversationFound) {
        updatedConversations.sort((a, b) => {
          const timeA = new Date(a.lastMessage?.createdAt || a.updatedAt || 0).getTime();
          const timeB = new Date(b.lastMessage?.createdAt || b.updatedAt || 0).getTime();
          return timeB - timeA;
        });
      } else {
        setTimeout(() => get().fetchConversations(), 300);
      }

      return {
        messages: nextMessages,
        currentConversation: nextCurrentConv,
        conversations: Array.isArray(state.conversations)
          ? updatedConversations
          : { ...state.conversations, data: updatedConversations },
      };
    });

    if (isViewingChat && isForMe) {
      const convIdToRead = messageConvId || activeConvId;
      if (convIdToRead) {
        get().markMessagesAsRead(convIdToRead);
      }
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
      const activeConvId = get().currentConversation;
      if (activeConvId) get().fetchMessages(activeConvId);
    }
  },

  clearConversation: async (conversationId) => {
    if (!conversationId) return;
    const convIdStr = conversationId?.toString();

    // Optimistically clear messages in the UI
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c._id?.toString() === convIdStr
          ? { ...c, lastMessage: null, unreadCount: 0 }
          : c
      ),
      messages:
        state.currentConversation?.toString() === convIdStr ? [] : state.messages,
    }));

    try {
      await chatApi.clearConversation(convIdStr);
      const socket = getSocket();
      if (socket) {
        socket.emit("conversation_cleared", { conversationId: convIdStr });
      }
    } catch (err) {
      console.error("Failed to clear conversation:", err);
      const activeConvId = get().currentConversation;
      if (activeConvId) get().fetchMessages(activeConvId);
    }
  },

  deleteConversation: async (conversationId) => {
    if (!conversationId) return;
    const convIdStr = conversationId?.toString();

    // Optimistically remove from local state
    set((state) => ({
      conversations: state.conversations.filter(
        (c) => c._id?.toString() !== convIdStr
      ),
      messages:
        state.currentConversation?.toString() === convIdStr ? [] : state.messages,
      currentConversation:
        state.currentConversation?.toString() === convIdStr
          ? null
          : state.currentConversation,
    }));

    try {
      await chatApi.deleteConversation(convIdStr);
      const socket = getSocket();
      if (socket) {
        socket.emit("conversation_deleted", { conversationId: convIdStr });
      }
    } catch (err) {
      console.error("Failed to delete conversation:", err);
      // Refresh to restore if API fails
      get().fetchConversations();
    }
  },

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

  isUserTyping: (userId, conversationId) => {
    if (!userId) return false;
    const { typingUsers, currentConversation } = get();
    const convId = conversationId || currentConversation;
    if (!convId) return false;

    const userSet = typingUsers.get(convId?.toString());
    return Boolean(userSet && userSet.has(userId.toString()));
  },

  isUserOnline: (userId) => {
    if (!userId) return false;
    const { onlineUsers } = get();
    return Boolean(onlineUsers.get(userId.toString())?.isOnline);
  },

  getUserLastSeen: (userId) => {
    if (!userId) return null;
    const { onlineUsers } = get();
    return onlineUsers.get(userId.toString())?.lastSeen || null;
  },

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

  sendMessage: async (formData) => {
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

    set((state) => ({
      messages: [...state.messages, optimisticMessage],
    }));

    try {
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

      set((state) => ({
        messages: state.messages.map((msg) =>
          msg._id === tempId ? realMessageData : msg
        ),
      }));

      if (socket && realMessageData) {
        socket.emit("sendMessage", realMessageData);
      }

      get().receiveMessage(realMessageData);

      return realMessageData;
    } catch (error) {
      console.error("Error sending message:", error);
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
