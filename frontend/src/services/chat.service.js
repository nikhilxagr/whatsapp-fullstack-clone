import { io } from "socket.io-client";
import useUserStore from "../store/useUserStore";

let socket = null;

const getServerUrl = () => {
  const apiUrl =
    import.meta?.env?.VITE_API_URL ||
    import.meta?.env?.REACT_APP_API_URL ||
    process.env?.REACT_APP_API_URL ||
    "http://localhost:5001/api";
  return apiUrl.replace(/\/api\/?$/, "");
};

export const initializeSocket = () => {
  const currentUser = useUserStore.getState().user;
  if (socket?.connected) {
    if (currentUser?._id) {
      socket.emit("userConnected", currentUser._id);
    }
    return socket;
  }

  const serverUrl = getServerUrl();

  socket = io(serverUrl, {
    withCredentials: true,
    transports: ["websocket", "polling"],
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on("connect", () => {
    console.log("Socket connected:", socket.id);
    const user = useUserStore.getState().user;
    if (user?._id) {
      socket.emit("userConnected", user._id);
    }
  });

  socket.on("connect_error", (err) => {
    console.error("Socket connection error:", err.message);
  });

  socket.on("disconnect", (reason) => {
    console.log("Socket disconnected:", reason);
  });

  return socket;
};

export const getSocket = () => {
  if (!socket) return initializeSocket();
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};