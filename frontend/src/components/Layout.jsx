import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaWhatsapp,
  FaLock,
  FaLaptop,
} from "react-icons/fa";
import { MdSettings, MdLogout } from "react-icons/md";
import useLayoutStore from "../store/useLayoutStore";
import useUserStore from "../store/useUserStore";
import useThemeStore from "../store/useThemeStore";
import { logoutUser } from "../services/userService";
import { getAvatarUrl } from "../utils/avatarUtil";
import ChatWindow from "./ChatWindow";

const StatusRingIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="2.2" />
    <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
  </svg>
);

const Layout = ({ children }) => {
  const {
    activeTab,
    setActiveTab,
    selectedContact,
    setSelectedContact,
    clearSelectedContact,
    showStatusModal,
    setShowStatusModal,
    statusPreviewData,
  } = useLayoutStore();

  const { user, clearUser } = useUserStore();
  const { theme, toggleTheme } = useThemeStore();

  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth <= 768 : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      clearUser();
      clearSelectedContact();
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-[#eae6df] dark:bg-[#0c1317] text-[#111b21] dark:text-[#e9edef] select-none transition-colors">
      {!isMobile && (
        <aside className="w-16 bg-[#f0f2f5] dark:bg-[#202c33] border-r border-[#e9edef] dark:border-[#222e35] flex flex-col justify-between items-center py-4 flex-shrink-0 z-20">
          {/* Top navigation: Chats and Status */}
          <div className="flex flex-col items-center gap-3 w-full">
            <button
              onClick={() => setActiveTab("chats")}
              className={`p-3 rounded-xl transition-all ${
                activeTab === "chats"
                  ? "bg-[#00a884]/15 text-[#00a884] dark:bg-[#00a884]/25"
                  : "text-[#54656f] dark:text-[#aebac1] hover:bg-black/5 dark:hover:bg-white/5"
              }`}
              title="Chats"
            >
              <FaWhatsapp className="w-5 h-5" />
            </button>

            <button
              onClick={() => {
                setActiveTab("status");
                clearSelectedContact();
              }}
              className={`p-3 rounded-xl transition-all ${
                activeTab === "status"
                  ? "bg-[#00a884]/15 text-[#00a884] dark:bg-[#00a884]/25"
                  : "text-[#54656f] dark:text-[#aebac1] hover:bg-black/5 dark:hover:bg-white/5"
              }`}
              title="Status"
            >
              <StatusRingIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Bottom navigation: Profile avatar and Settings */}
          <div className="flex flex-col items-center gap-3 w-full">
            <button
              onClick={() => {
                setActiveTab("profile");
                clearSelectedContact();
              }}
              className={`relative p-1 rounded-full transition-all ${
                activeTab === "profile"
                  ? "ring-2 ring-[#00a884]"
                  : "hover:opacity-85"
              }`}
              title="Profile"
            >
              <img
                src={getAvatarUrl(user, user?.username)}
                alt="Profile"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = getAvatarUrl(null, user?.username);
                }}
                className="w-8 h-8 rounded-full object-cover"
              />
            </button>

            <button
              onClick={() => {
                setActiveTab("settings");
                clearSelectedContact();
              }}
              className={`p-3 rounded-xl transition-all ${
                activeTab === "settings"
                  ? "bg-[#00a884]/15 text-[#00a884] dark:bg-[#00a884]/25"
                  : "text-[#54656f] dark:text-[#aebac1] hover:bg-black/5 dark:hover:bg-white/5"
              }`}
              title="Settings"
            >
              <MdSettings className="w-5 h-5" />
            </button>
          </div>
        </aside>
      )}

      <div className="flex-1 flex overflow-hidden relative">
        <div
          className={`h-full flex flex-col transition-all duration-300 ${
            isMobile
              ? selectedContact
                ? "hidden"
                : "w-full pb-16"
              : "w-[380px] lg:w-[420px] flex-shrink-0"
          }`}
        >
          {children}
        </div>

        <div
          className={`h-full flex-1 flex flex-col bg-[#efeae2] dark:bg-[#0b141a] transition-all duration-300 ${
            isMobile && !selectedContact ? "hidden" : "flex"
          }`}
        >
          {selectedContact ? (
            <ChatWindow />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 border-b-[6px] border-[#00a884]">
              <div className="w-48 h-48 rounded-full bg-[#f0f2f5] dark:bg-[#202c33] flex items-center justify-center mb-6 shadow-inner">
                <FaLaptop className="w-24 h-24 text-[#00a884] opacity-80" />
              </div>
              <h2 className="text-2xl font-light text-[#41525d] dark:text-[#e9edef] mb-2">
                WhatsApp Web
              </h2>
              <p className="max-w-md text-xs leading-relaxed text-[#667781] dark:text-[#8696a0] mb-8">
                Send and receive messages without keeping your phone online.
                <br />
                Use WhatsApp on up to 4 linked devices and 1 phone at the same time.
              </p>
              <div className="flex items-center gap-1.5 text-xs text-[#8696a0]">
                <FaLock className="w-3 h-3 text-[#00a884]" />
                <span>End-to-end encrypted</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {isMobile && !selectedContact && (
        <nav className="fixed bottom-0 left-0 right-0 h-16 bg-[#f0f2f5] dark:bg-[#202c33] border-t border-[#e9edef] dark:border-[#222e35] flex items-center justify-around z-30 px-2 shadow-lg">
          <button
            onClick={() => setActiveTab("chats")}
            className={`flex flex-col items-center gap-1 py-1 px-4 rounded-xl transition-all ${
              activeTab === "chats"
                ? "text-[#00a884] font-semibold"
                : "text-[#54656f] dark:text-[#8696a0]"
            }`}
          >
            <FaWhatsapp className="w-5 h-5" />
            <span className="text-[10px] tracking-wide">Chats</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("status");
              clearSelectedContact();
            }}
            className={`flex flex-col items-center gap-1 py-1 px-4 rounded-xl transition-all ${
              activeTab === "status"
                ? "text-[#00a884] font-semibold"
                : "text-[#54656f] dark:text-[#8696a0]"
            }`}
          >
            <StatusRingIcon className="w-5 h-5" />
            <span className="text-[10px] tracking-wide">Status</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("settings");
              clearSelectedContact();
            }}
            className={`flex flex-col items-center gap-1 py-1 px-4 rounded-xl transition-all ${
              activeTab === "settings"
                ? "text-[#00a884] font-semibold"
                : "text-[#54656f] dark:text-[#8696a0]"
            }`}
          >
            <MdSettings className="w-5 h-5" />
            <span className="text-[10px] tracking-wide">Settings</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("profile");
              clearSelectedContact();
            }}
            className={`flex flex-col items-center gap-1 py-1 px-4 rounded-xl transition-all ${
              activeTab === "profile"
                ? "text-[#00a884] font-semibold"
                : "text-[#54656f] dark:text-[#8696a0]"
            }`}
          >
            <img
              src={getAvatarUrl(user, user?.username)}
              alt="Profile"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = getAvatarUrl(null, user?.username);
              }}
              className={`w-5 h-5 rounded-full object-cover ${
                activeTab === "profile" ? "ring-2 ring-[#00a884]" : ""
              }`}
            />
            <span className="text-[10px] tracking-wide">You</span>
          </button>
        </nav>
      )}

    </div>
  );
};

export default Layout;
