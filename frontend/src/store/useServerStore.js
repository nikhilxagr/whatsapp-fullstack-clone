import { create } from "zustand";
import axiosInstance from "../services/url.service";

let keepAliveInterval = null;
let activeWarmupPromise = null;

const useServerStore = create((set, get) => ({
  isReady: false,
  isWarming: false,
  dbConnected: false,
  lastPing: null,
  error: null,

  warmUp: async () => {
    // If already ready, return immediately
    if (get().isReady) return true;

    // Deduplicate in-flight warmup requests
    if (activeWarmupPromise) return activeWarmupPromise;

    set({ isWarming: true, error: null });

    activeWarmupPromise = (async () => {
      const maxRetries = 3;
      let attempt = 0;

      while (attempt < maxRetries) {
        attempt++;
        try {
          // Timeout of 50s for Render free tier cold boot
          const res = await axiosInstance.get("/health", { timeout: 50000 });
          if (res.status === 200) {
            const isDbReady = res.data?.database === "connected" || res.data?.status === "ok";
            set({
              isReady: true,
              isWarming: false,
              dbConnected: isDbReady,
              lastPing: Date.now(),
              error: null,
            });

            // Start periodic keep-alive to keep Render awake during session
            get().startKeepAlive();
            return true;
          }
        } catch (err) {
          console.warn(`[Server Warmup] Attempt ${attempt} waiting for backend:`, err?.message);
          if (attempt < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
        }
      }

      set({ isWarming: false, error: "Server is taking longer to respond" });
      return false;
    })().finally(() => {
      activeWarmupPromise = null;
    });

    return activeWarmupPromise;
  },

  startKeepAlive: () => {
    if (keepAliveInterval) return;
    // Ping every 8 minutes (480000ms) to prevent Render's 15-minute idle shutdown
    keepAliveInterval = setInterval(async () => {
      try {
        const res = await axiosInstance.get("/health", { timeout: 15000 });
        if (res.status === 200) {
          set({
            isReady: true,
            dbConnected: res.data?.database === "connected" || res.data?.status === "ok",
            lastPing: Date.now(),
          });
        }
      } catch (err) {
        console.warn("[Keep-Alive] Ping failed:", err?.message);
      }
    }, 8 * 60 * 1000);
  },
}));

export default useServerStore;
