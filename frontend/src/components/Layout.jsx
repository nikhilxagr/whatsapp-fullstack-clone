import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaCircleNotch,
  FaSun,
  FaMoon,
  FaLock,
  FaTimes,
  FaLaptop,
} from "react-icons/fa";
import { MdChat, MdSettings, MdLogout } from "react-icons/md";
import useLayoutStore from "../store/useLayoutStore";
import useUserStore from "../store/useUserStore";
import useThemeStore from "../store/useThemeStore";
import { logoutUser } from "../services/userService";
import { getAvatarUrl } from "../utils/avatarUtil";
import ChatWindow from "./ChatWindow";

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

  const navItems = [
    { id: "chats", label: "Chats", icon: MdChat },
    { id: "status", label: "Status", icon: FaCircleNotch },
    { id: "settings", label: "Settings", icon: MdSettings },
  ];

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-[#eae6df] dark:bg-[#0c1317] text-[#111b21] dark:text-[#e9edef] select-none transition-colors">
      {!isMobile && (
        <aside className="w-16 bg-[#f0f2f5] dark:bg-[#202c33] border-r border-[#e9edef] dark:border-[#222e35] flex flex-col justify-between items-center py-4 flex-shrink-0 z-20">
          <div className="flex flex-col items-center gap-4 w-full">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    if (item.id !== "chats") clearSelectedContact();
                  }}
                  className={`relative p-3 rounded-xl transition-all ${
                    isActive
                      ? "bg-[#00a884]/15 text-[#00a884] dark:bg-[#00a884]/25"
                      : "text-[#54656f] dark:text-[#aebac1] hover:bg-black/5 dark:hover:bg-white/5"
                  }`}
                  title={item.label}
                >
                  <Icon className="w-5 h-5" />
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#00a884] rounded-r-full" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col items-center gap-3 w-full">
            <button
              onClick={toggleTheme}
              className="p-3 text-[#54656f] dark:text-[#aebac1] hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors"
              title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
            >
              {theme === "dark" ? (
                <FaSun className="w-4 h-4 text-amber-400" />
              ) : (
                <FaMoon className="w-4 h-4 text-indigo-500" />
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab("profile");
                clearSelectedContact();
              }}
              className={`relative p-1 rounded-full transition-all ${
                activeTab === "profile"
                  ? "ring-2 ring-[#00a884]"
                  : "hover:opacity-80"
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
              onClick={handleLogout}
              className="p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors"
              title="Log out"
            >
              <MdLogout className="w-5 h-5" />
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
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  clearSelectedContact();
                }}
                className={`flex flex-col items-center gap-1 py-1 px-4 rounded-xl transition-all ${
                  isActive
                    ? "text-[#00a884] font-semibold"
                    : "text-[#54656f] dark:text-[#8696a0]"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] tracking-wide">{item.label}</span>
              </button>
            );
          })}

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

      <AnimatePresence>
        {showStatusModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-4"
          >
            <button
              onClick={() => setShowStatusModal(false)}
              className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
            >
              <FaTimes className="w-5 h-5" />
            </button>

            <div className="max-w-md w-full text-center text-white">
              <img
                src={
                  statusPreviewData?.mediaUrl ||
                  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe"
                }
                alt="Status"
                className="max-h-[75vh] w-auto mx-auto rounded-2xl object-contain mb-4 shadow-2xl"
              />
              <p className="text-sm font-medium">
                {statusPreviewData?.caption || "Status update"}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Layout;
