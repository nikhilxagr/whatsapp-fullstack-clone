import React, { useState, useEffect, useRef } from "react";
import {
  FaArrowLeft,
  FaSmile,
  FaPaperclip,
  FaMicrophone,
  FaPaperPlane,
  FaLock,
  FaCheck,
  FaCheckDouble,
  FaImage,
  FaVideo,
  FaTimes,
  FaEllipsisV,
  FaTrash,
  FaExclamationCircle,
  FaFileAlt,
} from "react-icons/fa";
import useUserStore from "../../store/useUserStore";
import useChatStore from "../../store/useChatStore";
import useLayoutStore from "../../store/useLayoutStore";
import { getAvatarUrl } from "../../utils/avatarUtil";

// WhatsApp Delivery Status Ticks
const StatusTick = ({ status }) => {
  if (status === "read") return <FaCheckDouble className="w-3 h-3 text-[#53bdeb]" title="Read" />;
  if (status === "delivered") return <FaCheckDouble className="w-3 h-3 text-[#8696a0]" title="Delivered" />;
  if (status === "failed") return <FaExclamationCircle className="w-3 h-3 text-red-500" title="Failed to send" />;
  return <FaCheck className="w-3 h-3 text-[#8696a0]" title="Sent" />;
};

// Curated WhatsApp Emojis for the popup picker
const EMOJI_CATEGORIES = {
  "Smileys & People": [
    "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇",
    "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😋", "😛",
    "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔", "🤐", "🤨",
    "😐", "😑", "😶", "😏", "😒", "🙄", "😬", "🤥", "😌", "😔",
    "😪", "🤤", "😴", "😷", "🤒", "🤕", "🤢", "🤮", "🤧", "🥵",
    "🥶", "🥴", "😵", "🤯", "🤠", "🥳", "😎", "🤓", "🧐", "😕",
  ],
  "Gestures & Body": [
    "👍", "👎", "👌", "🤌", "✌️", "🤞", "🤟", "🤘", "🤙", "👈",
    "👉", "👆", "👇", "☝️", "✋", "🤚", "🖐️", "🖖", "👋", "🤝",
    "🙏", "💪", "👏", "🙌", "👐", "🤲", "🤜", "🤛", "✊", "👊",
  ],
  "Hearts & Symbols": [
    "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔",
    "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "✨", "🔥",
    "🎉", "🎊", "⭐", "🌟", "💯", "💢", "💥", "💫", "💬", "💭",
  ],
};

const ChatWindow = () => {
  // Global Store States
  const { user: currentUser } = useUserStore();
  const { selectedContact, clearSelectedContact } = useLayoutStore();

  const {
    messages,
    isLoadingMessages,
    conversations,
    selectedConversation,
    setSelectedConversation,
    fetchMessages,
    fetchConversations,
    sendMessage,
    startTyping,
    stopTyping,
    isUserOnline,
    getUserLastSeen,
    isUserTyping,
    deleteMessage,
    addReaction,
  } = useChatStore();

  // Local States [1:09:50 - 1:13:28]
  const [message, setMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showFileMenu, setShowFileMenu] = useState(false);
  const [filePreview, setFilePreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [activeCategory, setActiveCategory] = useState("Smileys & People");
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [sending, setSending] = useState(false);

  // DOM & Timing Refs
  const typingTimeoutRef = useRef(null);
  const messageEndRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const fileMenuRef = useRef(null);
  const fileInputRef = useRef(null);
  const textInputRef = useRef(null);
  const loadedContactIdRef = useRef(null);
  const loadedConvIdRef = useRef(null);

  // Responsive mobile resize listener
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Fetching Messages on Contact Selection
  useEffect(() => {
    if (!selectedContact?._id || !currentUser?._id) return;

    const contactIdStr = selectedContact._id?.toString();
    const isDifferentContact = loadedContactIdRef.current !== contactIdStr;
    if (isDifferentContact) {
      loadedContactIdRef.current = contactIdStr;
      loadedConvIdRef.current = null;
    }

    const convList = Array.isArray(conversations) ? conversations : conversations?.data || [];
    const matchedConv = convList.find((c) =>
      c.participants?.some((p) => (p._id || p)?.toString() === contactIdStr)
    );

    const matchedConvId = matchedConv?._id?.toString() || null;

    if (matchedConv) {
      if (loadedConvIdRef.current !== matchedConvId) {
        loadedConvIdRef.current = matchedConvId;
        setSelectedConversation(matchedConv);
      }
    } else {
      if (isDifferentContact || loadedConvIdRef.current !== null) {
        loadedConvIdRef.current = null;
        setSelectedConversation(null);
      }
    }
  }, [selectedContact?._id, conversations]);

  // Auto-scroll to bottom of message feed
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Typing Indicator Debounce Hook
  useEffect(() => {
    if (!selectedContact?._id) return;

    if (!message.trim()) {
      stopTyping(selectedContact._id, selectedConversation?._id);
      return;
    }

    startTyping(selectedContact._id, selectedConversation?._id);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      stopTyping(selectedContact._id, selectedConversation?._id);
    }, 2000);

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [message, selectedContact?._id, selectedConversation?._id]);

  // Outside click listener for emoji picker and file menu
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
        setShowEmojiPicker(false);
      }
      if (fileMenuRef.current && !fileMenuRef.current.contains(e.target)) {
        setShowFileMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // File Selection Handler
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setShowFileMenu(false);
    setFilePreview(URL.createObjectURL(file));
  };

  const clearFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Message Dispatch Handler
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if ((!message.trim() && !selectedFile) || !selectedContact?._id || !currentUser?._id) return;

    setSending(true);

    const isOnline = isUserOnline(selectedContact._id);
    const formData = new FormData();
    formData.append("senderId", currentUser._id);
    formData.append("receiverId", selectedContact._id);
    formData.append("messageStatus", isOnline ? "delivered" : "sent");

    if (message.trim()) {
      formData.append("content", message.trim());
    }

    if (selectedFile) {
      formData.append("media", selectedFile);
      formData.append("file", selectedFile);
    }

    // Flush local inputs immediately
    setMessage("");
    clearFile();
    setShowEmojiPicker(false);
    setShowFileMenu(false);

    try {
      await sendMessage(formData);
      fetchConversations();
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleEmojiSelect = (emoji) => {
    setMessage((prev) => prev + emoji);
    textInputRef.current?.focus();
  };

  const formatTime = (date) =>
    new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const formatDate = (date) => {
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
  };

  const groupedMessages = messages.reduce((groups, msg) => {
    const label = formatDate(msg.createdAt);
    if (!groups[label]) groups[label] = [];
    groups[label].push(msg);
    return groups;
  }, {});

  const isContactOnline = isUserOnline(selectedContact?._id) || selectedContact?.isOnline;
  const lastSeenDate = getUserLastSeen(selectedContact?._id) || selectedContact?.lastSeen;
  const isContactTyping = isUserTyping(selectedContact?._id, selectedConversation?._id);

  return (
    <div className="h-full flex flex-col bg-[#efeae2] dark:bg-[#0b141a] transition-colors relative">
      {/* 1. Header Bar */}
      <div className="h-16 px-4 bg-[#f0f2f5] dark:bg-[#202c33] border-b border-[#e9edef] dark:border-[#222e35] flex items-center justify-between flex-shrink-0 z-20 select-none">
        <div className="flex items-center gap-3">
          {isMobile && (
            <button
              onClick={clearSelectedContact}
              className="p-2 -ml-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-[#54656f] dark:text-[#aebac1]"
            >
              <FaArrowLeft className="w-4 h-4" />
            </button>
          )}

          <div className="relative">
            <img
              src={getAvatarUrl(selectedContact, selectedContact?.username)}
              alt={selectedContact?.username}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = getAvatarUrl(null, selectedContact?.username);
              }}
              className="w-10 h-10 rounded-full object-cover bg-gray-200 dark:bg-gray-700 cursor-pointer"
            />
            {isContactOnline && (
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#25d366] rounded-full border-2 border-white dark:border-[#202c33]" />
            )}
          </div>

          <div>
            <h2 className="text-sm font-semibold text-[#111b21] dark:text-[#e9edef] leading-tight">
              {selectedContact?.username}
            </h2>
            <span className="text-[11px] text-[#54656f] dark:text-[#8696a0] transition-colors">
              {isContactTyping ? (
                <span className="text-[#00a884] font-medium animate-pulse">typing...</span>
              ) : isContactOnline ? (
                <span className="text-[#00a884] font-medium">online</span>
              ) : lastSeenDate ? (
                `last seen ${formatTime(lastSeenDate)}`
              ) : (
                "offline"
              )}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-[#54656f] dark:text-[#aebac1]">
          <button className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
            <FaEllipsisV className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Message Stream Feed */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-12 py-4 space-y-1 relative select-text">
        {isLoadingMessages ? (
          <div className="h-full flex flex-col items-center justify-center text-[#8696a0]">
            <div className="w-8 h-8 border-2 border-[#00a884] border-t-transparent rounded-full animate-spin mb-3" />
            <span className="text-xs">Loading messages...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-[#8696a0] opacity-80 select-none">
            <div className="p-4 bg-white/80 dark:bg-[#182229]/80 backdrop-blur rounded-xl shadow-sm text-center max-w-sm">
              <FaLock className="w-4 h-4 mx-auto mb-2 text-[#00a884]" />
              <p className="text-xs">
                Messages are end-to-end encrypted. No one outside of this chat can read them.
              </p>
            </div>
          </div>
        ) : (
          Object.entries(groupedMessages).map(([dateLabel, dayMessages]) => (
            <div key={dateLabel}>
              <div className="flex items-center justify-center my-4 select-none">
                <span className="px-3 py-1 text-[11px] font-medium text-[#54656f] dark:text-[#8696a0] bg-white dark:bg-[#182229] rounded-full shadow-sm">
                  {dateLabel}
                </span>
              </div>

              {dayMessages.map((msg) => {
                const isMine = (msg.sender?._id || msg.sender)?.toString() === currentUser?._id?.toString();

                return (
                  <div
                    key={msg._id || msg.tempId}
                    className={`flex mb-2 group relative ${isMine ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`relative max-w-[72%] rounded-lg px-3 pt-2 pb-2 shadow-sm ${
                        isMine
                          ? "bg-[#d9fdd3] dark:bg-[#005c4b] rounded-tr-none"
                          : "bg-white dark:bg-[#202c33] rounded-tl-none"
                      }`}
                    >
                      {/* Media Image / Video Attachment */}
                      {msg.imageOrVideoUrl && (
                        <div className="mb-1.5 overflow-hidden rounded-md">
                          {msg.contentType === "video" ? (
                            <video
                              src={msg.imageOrVideoUrl}
                              controls
                              className="rounded-md max-h-64 w-full object-cover"
                            />
                          ) : (
                            <img
                              src={msg.imageOrVideoUrl}
                              alt="attachment"
                              className="rounded-md max-h-64 w-auto object-cover cursor-pointer hover:opacity-95 transition-opacity"
                              onClick={() => window.open(msg.imageOrVideoUrl, "_blank")}
                            />
                          )}
                        </div>
                      )}

                      {/* Text content */}
                      {msg.content && (
                        <p className="text-[13.5px] leading-snug text-[#111b21] dark:text-[#e9edef] break-words whitespace-pre-wrap">
                          {msg.content}
                        </p>
                      )}

                      {/* Timestamp and Status Ticks */}
                      <div className="flex items-center justify-end gap-1 mt-0.5 select-none">
                        <span className="text-[10px] text-[#8696a0]">
                          {formatTime(msg.createdAt)}
                        </span>
                        {isMine && <StatusTick status={msg.messageStatus} />}
                      </div>

                      {/* Reactions Badges */}
                      {msg.reactions && msg.reactions.length > 0 && (
                        <div className="absolute -bottom-2.5 right-2 flex items-center gap-0.5 px-1.5 py-0.5 bg-white dark:bg-[#1f2c34] border border-gray-100 dark:border-[#2a3942] rounded-full shadow-sm text-xs select-none">
                          {Array.from(new Set(msg.reactions.map((r) => r.emoji))).slice(0, 3).map((em, idx) => (
                            <span key={idx}>{em}</span>
                          ))}
                          {msg.reactions.length > 1 && (
                            <span className="text-[10px] text-[#8696a0] font-medium ml-0.5">
                              {msg.reactions.length}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Hover Action Toolbar: Quick Reactions & Delete */}
                      <div className="absolute -top-3.5 right-1 hidden group-hover:flex items-center gap-1 bg-white dark:bg-[#202c33] border border-gray-200 dark:border-[#2a3942] rounded-full px-1.5 py-0.5 shadow-md z-10">
                        {["👍", "❤️", "😂", "😮", "😢", "🙏"].map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => addReaction(msg._id, emoji)}
                            className="text-xs hover:scale-125 transition-transform px-0.5"
                            title={`React with ${emoji}`}
                          >
                            {emoji}
                          </button>
                        ))}
                        {isMine && (
                          <button
                            onClick={() => deleteMessage(msg._id)}
                            className="p-1 text-red-400 hover:text-red-600 transition-colors ml-0.5"
                            title="Delete message"
                          >
                            <FaTrash className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}

        <div ref={messageEndRef} />
      </div>

      {/* 3. Media Preview Strip */}
      {filePreview && (
        <div className="px-4 py-2.5 bg-[#f0f2f5] dark:bg-[#202c33] border-t border-[#e9edef] dark:border-[#222e35] flex items-center gap-3 z-20">
          <div className="relative">
            {selectedFile?.type?.startsWith("video") ? (
              <div className="w-14 h-14 bg-black rounded-lg flex items-center justify-center text-white">
                <FaVideo className="w-6 h-6 text-[#00a884]" />
              </div>
            ) : (
              <img src={filePreview} alt="preview" className="h-14 w-14 object-cover rounded-lg shadow-sm" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-[#111b21] dark:text-[#e9edef] truncate">
              {selectedFile?.name}
            </p>
            <p className="text-[10px] text-[#8696a0]">
              {(selectedFile?.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
          <button
            type="button"
            onClick={clearFile}
            className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-[#8696a0] hover:text-[#111b21] dark:hover:text-white"
            title="Remove attachment"
          >
            <FaTimes className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 4. Emoji Picker Dropdown */}
      {showEmojiPicker && (
        <div
          ref={emojiPickerRef}
          className="absolute bottom-16 left-4 w-80 max-h-80 bg-white dark:bg-[#202c33] border border-gray-200 dark:border-[#2a3942] rounded-2xl shadow-2xl z-30 flex flex-col overflow-hidden"
        >
          {/* Category Tabs */}
          <div className="flex border-b border-gray-100 dark:border-[#2a3942] p-1.5 gap-1 bg-gray-50 dark:bg-[#182229]">
            {Object.keys(EMOJI_CATEGORIES).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`flex-1 py-1 text-[11px] font-medium rounded-lg transition-colors truncate ${
                  activeCategory === cat
                    ? "bg-[#075e54] text-white"
                    : "text-[#54656f] dark:text-[#8696a0] hover:bg-gray-200/60 dark:hover:bg-white/5"
                }`}
              >
                {cat.split(" ")[0]}
              </button>
            ))}
          </div>

          {/* Emoji Grid */}
          <div className="flex-1 overflow-y-auto p-3 grid grid-cols-8 gap-2">
            {EMOJI_CATEGORIES[activeCategory].map((emoji, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleEmojiSelect(emoji)}
                className="text-lg hover:scale-125 transition-transform flex items-center justify-center p-1 rounded hover:bg-gray-100 dark:hover:bg-white/5"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 5. Attachment Popup Menu */}
      {showFileMenu && (
        <div
          ref={fileMenuRef}
          className="absolute bottom-16 left-12 w-48 bg-white dark:bg-[#202c33] border border-gray-200 dark:border-[#2a3942] rounded-xl shadow-xl z-30 p-2 space-y-1"
        >
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[#f0f2f5] dark:hover:bg-[#182229] text-[#111b21] dark:text-[#e9edef] transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-purple-500 text-white flex items-center justify-center">
              <FaImage className="w-3.5 h-3.5" />
            </div>
            <span>Photos & Videos</span>
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg hover:bg-[#f0f2f5] dark:hover:bg-[#182229] text-[#111b21] dark:text-[#e9edef] transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-indigo-500 text-white flex items-center justify-center">
              <FaFileAlt className="w-3.5 h-3.5" />
            </div>
            <span>Document</span>
          </button>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* 6. Footer Input Bar */}
      <form
        onSubmit={handleSendMessage}
        className="min-h-[62px] px-3 py-2 bg-[#f0f2f5] dark:bg-[#202c33] border-t border-[#e9edef] dark:border-[#222e35] flex items-center gap-2 flex-shrink-0 z-20"
      >
        <button
          type="button"
          onClick={() => {
            setShowEmojiPicker((prev) => !prev);
            setShowFileMenu(false);
          }}
          className={`p-2 rounded-full transition-colors ${
            showEmojiPicker ? "text-[#00a884] bg-black/5 dark:bg-white/5" : "text-[#54656f] dark:text-[#8696a0] hover:text-[#00a884]"
          }`}
          title="Emoji"
        >
          <FaSmile className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={() => {
            setShowFileMenu((prev) => !prev);
            setShowEmojiPicker(false);
          }}
          className={`p-2 rounded-full transition-colors ${
            showFileMenu ? "text-[#00a884] bg-black/5 dark:bg-white/5" : "text-[#54656f] dark:text-[#8696a0] hover:text-[#00a884]"
          }`}
          title="Attach"
        >
          <FaPaperclip className="w-5 h-5" />
        </button>

        <div className="flex-1">
          <input
            ref={textInputRef}
            type="text"
            placeholder="Type a message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full h-10 px-4 bg-white dark:bg-[#2a3942] text-sm text-[#111b21] dark:text-[#e9edef] placeholder-[#8696a0] rounded-lg outline-none transition-colors"
          />
        </div>

        {message.trim() || selectedFile ? (
          <button
            type="submit"
            disabled={sending}
            className="p-2.5 rounded-full bg-[#00a884] hover:bg-[#02906f] active:bg-[#075e54] text-white shadow-md transition-all hover:scale-105 disabled:opacity-50"
            title="Send"
          >
            <FaPaperPlane className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            className="p-2 text-[#54656f] dark:text-[#8696a0] hover:text-[#00a884] transition-colors"
            title="Voice message"
          >
            <FaMicrophone className="w-5 h-5" />
          </button>
        )}
      </form>
    </div>
  );
};

export default ChatWindow;
