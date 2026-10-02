import { io } from "socket.io-client";
import useUserStore from "../store/useUserStore";
import useChatStore from "../store/useChatStore";

let socket = null;

const getServerUrl = () => {
  const isDevHost =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname === "" ||
      window.location.port === "3000" ||
      window.location.port === "5173");

  const envUrl =
    import.meta?.env?.VITE_API_URL ||
    import.meta?.env?.REACT_APP_API_URL ||
    process.env?.REACT_APP_API_URL;

  const defaultLocalUrl = "http://localhost:5001";
  const defaultProdUrl = "https://whatsapp-backend-97f3.onrender.com";

  if (isDevHost) {
    if (envUrl && !envUrl.includes("onrender.com")) {
      return envUrl.replace(/\/api\/?$/, "");
    }
    if (
      typeof window !== "undefined" &&
      window.location.hostname &&
      window.location.hostname !== "localhost" &&
      window.location.hostname !== "127.0.0.1"
    ) {
      return `http://${window.location.hostname}:5001`;
    }
    return defaultLocalUrl;
  }
  return (envUrl || defaultProdUrl).replace(/\/api\/?$/, "");
};

export const initializeSocket = () => {
  const currentUser = useUserStore.getState().user || useChatStore.getState().currentUser;
  const currentUserId = (currentUser?._id || currentUser?.id || currentUser?.userId)?.toString();

  // If socket is already instantiated, avoid duplicate connection attempts
  if (socket) {
    if (socket.connected && currentUserId) {
      socket.emit("userConnected", currentUserId);
    } else if (socket.disconnected) {
      socket.connect();
    }
    return socket;
  }

  const serverUrl = getServerUrl();
  console.log("[Socket] Initializing connection to:", serverUrl);

  socket = io(serverUrl, {
    withCredentials: true,
    transports: ["websocket", "polling"],
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
  });

  const syncUserAndListeners = () => {
    const user = useUserStore.getState().user || useChatStore.getState().currentUser;
    const uid = (user?._id || user?.id || user?.userId)?.toString();
    if (uid && socket?.connected) {
      console.log("[Socket] Connected - emitting userConnected for:", uid);
      socket.emit("userConnected", uid);
    }
    // Always refresh listeners so the current socket instance is actively listening
    try {
      useChatStore.getState().initSocketListeners();
    } catch (err) {
      console.error("[Socket] Error initializing socket listeners:", err);
    }
  };

  socket.on("connect", () => {
    console.log("[Socket] Connected with socket ID:", socket.id);
    syncUserAndListeners();
  });

  if (socket.io) {
    socket.io.on("reconnect", () => {
      console.log("[Socket] Reconnected with socket ID:", socket.id);
      syncUserAndListeners();
    });
  }

  socket.on("connect_error", (err) => {
    console.warn("[Socket] Connection error:", err.message);
  });

  socket.on("disconnect", (reason) => {
    console.log("[Socket] Disconnected:", reason);
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