import axiosInstance from "./url.service";

// RESTful conversation endpoints matching tutorial spec
export const getConversations = async () => {
  try {
    const res = await axiosInstance.get("/chats/conversations");
    return res.data;
  } catch {
    const fallback = await axiosInstance.get("/chat/get-conversations");
    return fallback.data;
  }
};

export const getMessages = async (conversationId) => {
  try {
    const res = await axiosInstance.get(`/chats/conversations/${conversationId}/messages`);
    return res.data;
  } catch {
    const fallback = await axiosInstance.get(`/chat/get-messages/${conversationId}`);
    return fallback.data;
  }
};

export const sendMessage = async (payload) => {
  const isFormData = typeof FormData !== "undefined" && payload instanceof FormData;
  const res = await axiosInstance.post("/chat/send-message", payload, {
    headers: isFormData ? { "Content-Type": "multipart/form-data" } : undefined,
  });
  return res.data;
};

export const markMessagesAsRead = async ({ messageIds, conversationId }) => {
  try {
    const res = await axiosInstance.put("/chats/messages/read", { messageIds, conversationId });
    return res.data;
  } catch {
    if (messageIds && messageIds[0]) {
      const fallback = await axiosInstance.put("/chat/mark-as-read", { messageId: messageIds[0] });
      return fallback.data;
    }
  }
};

export const markAsRead = async (messageId) => {
  const res = await axiosInstance.put("/chat/mark-as-read", { messageId });
  return res.data;
};

export const deleteMessage = async (messageId) => {
  try {
    const res = await axiosInstance.delete(`/chats/messages/${messageId}`);
    return res.data;
  } catch {
    const fallback = await axiosInstance.delete(`/chat/delete-message/${messageId}`);
    return fallback.data;
  }
};

export const deleteConversation = async (conversationId) => {
  const res = await axiosInstance.delete(`/chat/delete-conversation/${conversationId}`);
  return res.data;
};
