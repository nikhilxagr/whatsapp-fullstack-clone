import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  FaSearch,
  FaEllipsisV,
  FaCircleNotch,
  FaUsers,
  FaTimes,
  FaTrashAlt,
  FaBan,
  FaEraser,
  FaPlus,
} from "react-icons/fa";
import { MdOutlineChat } from "react-icons/md";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "react-toastify";
import useUserStore from "../store/useUserStore";
import useLayoutStore from "../store/useLayoutStore";
import useChatStore from "../store/useChatStore";
import { getAvatarUrl } from "../utils/avatarUtil";
import NewChat from "./NewChat";

// ── Context menu (WhatsApp-style) ──────────────────────────────────────────
const ContextMenu = ({ x, y, onBlock, onClearChat, onDeleteChat, onClose }) => {
  const menuRef = useRef(null);

  useEffect(() => {
    const closeOnOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose();
    };
    const closeOnEsc = (e) => { if (e.key === "Escape") onClose(); };
    // Short timeout so the same click that opened it doesn't immediately close it
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", closeOnOutside);
      document.addEventListener("touchstart", closeOnOutside);
      document.addEventListener("keydown", closeOnEsc);
    }, 50);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", closeOnOutside);
      document.removeEventListener("touchstart", closeOnOutside);
      document.removeEventListener("keydown", closeOnEsc);
    };
  }, [onClose]);

  // Keep menu within viewport bounds
  const menuW = 192;
  const menuH = 120;
  const safeX = Math.min(x, window.innerWidth - menuW - 8);
  const safeY = Math.min(y, window.innerHeight - menuH - 8);

  const items = [
    {
      id: "ctx-block",
      label: "Block",
      icon: <FaBan className="w-4 h-4" />,
      onClick: onBlock,
      className: "text-[#111b21] dark:text-[#e9edef] hover:bg-[#f0f2f5] dark:hover:bg-[#182229]",
    },
    {
      id: "ctx-clear-chat",
      label: "Clear chat",
      icon: <FaEraser className="w-4 h-4" />,
      onClick: onClearChat,
      className: "text-[#111b21] dark:text-[#e9edef] hover:bg-[#f0f2f5] dark:hover:bg-[#182229]",
    },
    {
      id: "ctx-delete-chat",
      label: "Delete chat",
      icon: <FaTrashAlt className="w-3.5 h-3.5" />,
      onClick: onDeleteChat,
      className: "text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20",
    },
  ];

  return (
    <motion.div
      ref={menuRef}
      style={{ top: safeY, left: safeX, position: "fixed", zIndex: 9999 }}
      className={`w-48 bg-white dark:bg-[#233138] rounded-xl shadow-2xl border border-gray-100 dark:border-[#2a3942] py-1.5 overflow-hidden`}
      initial={{ opacity: 0, scale: 0.9, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -8 }}
      transition={{ duration: 0.13, ease: "easeOut" }}
    >
      {items.map((item) => (
        <button
          key={item.id}
          id={item.id}
          onClick={(e) => { e.stopPropagation(); item.onClick(); onClose(); }}
          className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${item.className}`}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </motion.div>
  );
};

// ── Confirmation dialog ────────────────────────────────────────────────────
const ConfirmDialog = ({ title, description, confirmLabel, confirmClass, onConfirm, onCancel, icon }) => (
  <div className="fixed inset-0 z-[10000] flex items-center justify-center px-4">
    <motion.div
      className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onCancel}
    />
    <motion.div
      className="relative w-full max-w-sm bg-white dark:bg-[#233138] rounded-2xl shadow-2xl p-6 flex flex-col gap-4"
      initial={{ opacity: 0, scale: 0.92, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: 20 }}
      transition={{ type: "spring", stiffness: 340, damping: 28 }}
    >
      {icon && (
        <div className="flex items-center justify-center w-14 h-14 mx-auto rounded-full bg-red-100 dark:bg-red-900/30">
          {icon}
        </div>
      )}
      <div className="text-center">
        <h3 className="text-base font-bold text-[#111b21] dark:text-[#e9edef]">{title}</h3>
        <p className="text-xs text-[#54656f] dark:text-[#8696a0] mt-1.5 leading-relaxed">{description}</p>
      </div>
      <div className="flex gap-3 mt-1">
        <button
          onClick={onCancel}
          className="flex-1 h-10 rounded-xl bg-[#f0f2f5] dark:bg-[#2a3942] text-[#111b21] dark:text-[#e9edef] text-sm font-semibold hover:bg-[#e9edef] dark:hover:bg-[#374c56] transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className={`flex-1 h-10 rounded-xl text-white text-sm font-semibold transition-colors shadow-md ${confirmClass}`}
        >
          {confirmLabel}
        </button>
      </div>
    </motion.div>
  </div>
);

// ── Main Component ─────────────────────────────────────────────────────────
const ChatList = () => {
  const { user: currentUser } = useUserStore();
  const { selectedContact, setSelectedContact, setActiveTab } = useLayoutStore();
  const {
    conversations,
    isLoadingConversations,
    isUserOnline,
    deleteConversation,
    clearConversation,
  } = useChatStore();

  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Context menu
  const [contextMenu, setContextMenu] = useState(null); // { x, y, userItem, conv }

  // Dialogs
  const [pendingAction, setPendingAction] = useState(null); // { type: 'clear'|'delete'|'block', userItem, conv }
  const [processing, setProcessing] = useState(false);

  // Container ref for native contextmenu listener
  const listRef = useRef(null);
  const searchInputRef = useRef(null);
  const activeItemRef = useRef(null); // track which item was right-clicked

  // Auto-select first chat on desktop only if there are active conversations
  useEffect(() => {
    const convList = Array.isArray(conversations) ? conversations : conversations?.data || [];
    if (convList.length > 0 && !selectedContact && typeof window !== "undefined" && window.innerWidth > 768) {
      const firstConv = convList[0];
      const other = firstConv?.participants?.find(
        (p) => (p._id || p)?.toString() !== currentUser?._id?.toString()
      );
      if (other) {
        setSelectedContact(other);
      }
    }
  }, [conversations, selectedContact, currentUser?._id, setSelectedContact]);

  // ── Attach native contextmenu listener on the list container ──────────────
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const handleNative = (e) => {
      if (activeItemRef.current) {
        e.preventDefault();
      }
    };
    el.addEventListener("contextmenu", handleNative);
    return () => el.removeEventListener("contextmenu", handleNative);
  }, [isNewChatOpen]);

  // Build the list of active chats strictly from conversations (plus draft contact if selected)
  const convList = Array.isArray(conversations) ? conversations : conversations?.data || [];
  const selectedContactIdStr = selectedContact?._id?.toString();

  const activeChats = [];
  const hasConvWithSelected = convList.some((c) =>
    c.participants?.some((p) => (p._id || p)?.toString() === selectedContactIdStr)
  );

  // If user selected a contact from "New Chat" who doesn't have a conversation yet, show as active draft
  if (selectedContact && !hasConvWithSelected) {
    activeChats.push({
      user: selectedContact,
      conv: null,
      lastMsg: null,
      unread: 0,
      isDraft: true,
    });
  }

  convList.forEach((conv) => {
    const otherUser = conv.participants?.find(
      (p) => (p._id || p)?.toString() !== currentUser?._id?.toString()
    );
    if (otherUser) {
      activeChats.push({
        user: otherUser,
        conv,
        lastMsg: conv.lastMessage,
        unread: conv.unreadCount || 0,
        isDraft: false,
      });
    }
  });

  const filteredChats = activeChats.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const nameMatch =
      item.user?.username?.toLowerCase().includes(q) ||
      item.user?.phoneNumber?.includes(q);
    const msgMatch = item.lastMsg?.content?.toLowerCase().includes(q);
    return nameMatch || msgMatch;
  });

  const formatTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Called when a chat row is right-clicked
  const openContextMenu = useCallback((e, userItem, conv) => {
    e.preventDefault();
    e.stopPropagation();
    if (!conv) return; // only show for existing conversations
    setContextMenu({ x: e.clientX, y: e.clientY, userItem, conv });
  }, []);

  // Long-press support (mobile)
  const longPressTimerRef = useRef(null);
  const startLongPress = useCallback((e, userItem, conv) => {
    if (!conv) return;
    longPressTimerRef.current = setTimeout(() => {
      const touch = e.touches?.[0];
      if (touch) {
        setContextMenu({ x: touch.clientX, y: touch.clientY, userItem, conv });
      }
    }, 600);
  }, []);
  const cancelLongPress = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  // ── Action Handlers ────────────────────────────────────────────────────────
  const handleConfirm = async () => {
    if (!pendingAction || processing) return;
    const { type, userItem, conv } = pendingAction;
    setProcessing(true);
    try {
      if (type === "delete") {
        await deleteConversation(conv._id);
        if (selectedContact?._id === userItem._id) setSelectedContact(null);
        toast.success(`Chat with ${userItem.username} deleted`);
      } else if (type === "clear") {
        await clearConversation(conv._id);
        toast.success(`Chat with ${userItem.username} cleared`);
      } else if (type === "block") {
        // Block is UI-only for now — a future backend endpoint can be added
        toast.info(`${userItem.username} has been blocked`);
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setProcessing(false);
      setPendingAction(null);
    }
  };

  const dialogConfig = {
    delete: {
      title: (name) => `Delete chat with ${name}?`,
      description: (name) =>
        `This will permanently delete the entire conversation for both you and ${name}. This cannot be undone.`,
      confirmLabel: "Delete",
      confirmClass: "bg-red-500 hover:bg-red-600 active:bg-red-700 shadow-red-500/25",
      icon: <FaTrashAlt className="w-6 h-6 text-red-500" />,
    },
    clear: {
      title: (name) => `Clear chat with ${name}?`,
      description: () =>
        "All messages in this chat will be permanently deleted. The conversation will remain but be empty.",
      confirmLabel: "Clear",
      confirmClass: "bg-orange-500 hover:bg-orange-600 active:bg-orange-700 shadow-orange-500/25",
      icon: <FaEraser className="w-6 h-6 text-orange-500" />,
    },
    block: {
      title: (name) => `Block ${name}?`,
      description: (name) =>
        `${name} will no longer be able to send you messages. You can unblock them anytime from settings.`,
      confirmLabel: "Block",
      confirmClass: "bg-red-500 hover:bg-red-600 active:bg-red-700 shadow-red-500/25",
      icon: <FaBan className="w-6 h-6 text-red-500" />,
    },
  };

  const currentDialog = pendingAction ? dialogConfig[pendingAction.type] : null;

  // If New Chat drawer is open, show the New Chat screen matching WhatsApp
  if (isNewChatOpen) {
    return (
      <NewChat
        onClose={() => setIsNewChatOpen(false)}
        onSelectUser={(contact) => {
          setSelectedContact(contact);
          setIsNewChatOpen(false);
        }}
        currentUser={currentUser}
      />
    );
  }

  return (
    <>
      <div className="flex flex-col h-full bg-white dark:bg-[#111b21] border-r border-[#e9edef] dark:border-[#222e35] select-none transition-colors">

        {/* ── Header: Chats + Green Plus Button ── */}
        <div className="h-16 px-4 bg-white dark:bg-[#111b21] flex items-center justify-between flex-shrink-0">
          <h1 className="text-xl font-bold text-[#111b21] dark:text-[#e9edef] tracking-tight">
            Chats
          </h1>

          <button
            onClick={() => setIsNewChatOpen(true)}
            className="w-8 h-8 rounded-full bg-[#00a884] hover:bg-[#02906f] active:bg-[#075e54] flex items-center justify-center text-white shadow-sm transition-all hover:scale-105 active:scale-95"
            title="New chat"
          >
            <FaPlus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* ── Search Bar ── */}
        <div className="px-3 pb-2.5 bg-white dark:bg-[#111b21] flex-shrink-0">
          <div className="flex items-center h-9 px-3.5 bg-[#f0f2f5] dark:bg-[#202c33] rounded-lg">
            <FaSearch className="w-3.5 h-3.5 text-[#54656f] dark:text-[#8696a0] mr-3 flex-shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search or start new chat"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent outline-none text-xs sm:text-sm text-[#111b21] dark:text-[#e9edef] placeholder-[#8696a0]"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")}>
                <FaTimes className="w-3 h-3 text-[#8696a0] hover:text-gray-700 dark:hover:text-white" />
              </button>
            )}
          </div>
        </div>

        {/* ── Chat list ── */}
        <div ref={listRef} className="flex-1 overflow-y-auto divide-y divide-[#e9edef]/40 dark:divide-[#222e35]/40 flex flex-col">
          {isLoadingConversations ? (
            <div className="flex flex-col items-center justify-center py-16 text-[#8696a0]">
              <div className="w-8 h-8 border-2 border-[#00a884] border-t-transparent rounded-full animate-spin mb-3" />
              <span className="text-xs">Loading chats...</span>
            </div>
          ) : filteredChats.length === 0 ? (
            searchQuery.trim() ? (
              <div className="text-center py-12 px-6 text-[#8696a0]">
                <p className="text-xs font-medium">No chats found</p>
                <p className="text-[11px] mt-1 opacity-70">
                  No conversation matches "{searchQuery}"
                </p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[#8696a0]">
                <div className="w-16 h-16 rounded-full bg-[#f0f2f5] dark:bg-[#202c33] flex items-center justify-center mb-4 shadow-sm">
                  <MdOutlineChat className="w-8 h-8 text-[#00a884] opacity-80" />
                </div>
                <h3 className="text-base font-semibold text-[#111b21] dark:text-[#e9edef] mb-1">
                  No chats yet
                </h3>
                <p className="text-xs text-[#8696a0] max-w-xs mb-5 leading-relaxed">
                  Start a conversation with anyone registered on WhatsApp by clicking the + button.
                </p>
                <button
                  onClick={() => setIsNewChatOpen(true)}
                  className="px-5 py-2.5 bg-[#00a884] hover:bg-[#02906f] active:bg-[#075e54] text-white text-xs font-semibold rounded-full shadow-md transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                >
                  <FaPlus className="w-3.5 h-3.5" />
                  Start new chat
                </button>
              </div>
            )
          ) : (
            filteredChats.map((item) => {
              const userItem = item.user;
              const conv = item.conv;
              const isSelected = selectedContact?._id === userItem._id;
              const lastMsg = item.lastMsg;
              const unread = item.unread;
              const isOnline = isUserOnline(userItem._id) || userItem.isOnline;

              return (
                <div
                  key={userItem._id}
                  onClick={() => setSelectedContact(userItem)}
                  onContextMenu={(e) => {
                    activeItemRef.current = conv ? { userItem, conv } : null;
                    openContextMenu(e, userItem, conv);
                  }}
                  onMouseLeave={() => { activeItemRef.current = null; }}
                  onTouchStart={(e) => startLongPress(e, userItem, conv)}
                  onTouchEnd={cancelLongPress}
                  onTouchMove={cancelLongPress}
                  className={`group relative flex items-center gap-3 px-3.5 py-3 cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-[#f0f2f5] dark:bg-[#2a3942]"
                      : "hover:bg-[#f5f6f6] dark:hover:bg-[#202c33]/70"
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <img
                      src={getAvatarUrl(userItem, userItem.username)}
                      alt={userItem.username}
                      onError={(e) => { e.target.onerror = null; e.target.src = getAvatarUrl(null, userItem.username); }}
                      className="w-12 h-12 rounded-full object-cover bg-gray-200 dark:bg-gray-700"
                    />
                    {isOnline && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#25d366] rounded-full border-2 border-white dark:border-[#111b21]" />
                    )}
                  </div>

                  {/* Text content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h2 className="text-sm font-semibold text-[#111b21] dark:text-[#e9edef] truncate">{userItem.username}</h2>
                      <span className="text-[11px] text-[#8696a0] flex-shrink-0 ml-2 font-mono">
                        {formatTime(lastMsg?.createdAt || conv?.updatedAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-[#54656f] dark:text-[#8696a0]">
                      <p className="truncate">
                        {item.isDraft
                          ? "New conversation"
                          : lastMsg?.content || userItem.about || "Hey there! I am using WhatsApp."}
                      </p>
                      {unread > 0 && (
                        <span className="ml-2 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-[#25d366] text-white text-[10px] font-bold rounded-full flex-shrink-0">
                          {unread}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Hover delete shortcut */}
                  {conv && (
                    <button
                      id={`delete-btn-${userItem._id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setPendingAction({ type: "delete", userItem, conv });
                      }}
                      title="Delete chat"
                      className="opacity-0 group-hover:opacity-100 absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-[#8696a0] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                    >
                      <FaTrashAlt className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Context Menu Portal ── */}
      <AnimatePresence>
        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            onBlock={() => setPendingAction({ type: "block", userItem: contextMenu.userItem, conv: contextMenu.conv })}
            onClearChat={() => setPendingAction({ type: "clear", userItem: contextMenu.userItem, conv: contextMenu.conv })}
            onDeleteChat={() => setPendingAction({ type: "delete", userItem: contextMenu.userItem, conv: contextMenu.conv })}
            onClose={() => setContextMenu(null)}
          />
        )}
      </AnimatePresence>

      {/* ── Confirmation Dialogs ── */}
      <AnimatePresence>
        {pendingAction && currentDialog && (
          <ConfirmDialog
            title={currentDialog.title(pendingAction.userItem?.username)}
            description={currentDialog.description(pendingAction.userItem?.username)}
            confirmLabel={processing ? "Processing…" : currentDialog.confirmLabel}
            confirmClass={currentDialog.confirmClass}
            icon={currentDialog.icon}
            onConfirm={handleConfirm}
            onCancel={() => setPendingAction(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatList;
