import axiosInstance from "./url.service";

export const getConversations = async () => {
  const res = await axiosInstance.get("/chat/get-conversations");
  return res.data;
};

export const getMessages = async (conversationId) => {
  const res = await axiosInstance.get(`/chat/get-messages/${conversationId}`);
  return res.data;
};

export const sendMessage = async (payload) => {
  const isFormData = typeof FormData !== "undefined" && payload instanceof FormData;
  const res = await axiosInstance.post("/chat/send-message", payload, {
    headers: isFormData ? { "Content-Type": "multipart/form-data" } : undefined,
  });
  return res.data;
};

export const markAsRead = async (messageId) => {
  const res = await axiosInstance.put("/chat/mark-as-read", { messageId });
  return res.data;
};

export const deleteMessage = async (messageId) => {
  const res = await axiosInstance.delete(`/chat/delete-message/${messageId}`);
  return res.data;
};

export const deleteConversation = async (conversationId) => {
  const res = await axiosInstance.delete(`/chat/delete-conversation/${conversationId}`);
  return res.data;
};
