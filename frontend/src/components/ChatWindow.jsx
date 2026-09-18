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
} from "react-icons/fa";
import useUserStore from "../store/useUserStore";
import useChatStore from "../store/useChatStore";
import useLayoutStore from "../store/useLayoutStore";
import { getSocket } from "../services/chat.service";
import { getAvatarUrl } from "../utils/avatarUtil";
import { deleteMessage } from "../services/chat.api";

// Tick icons for message delivery status
const StatusTick = ({ status }) => {
  if (status === "read") return <FaCheckDouble className="w-3 h-3 text-[#53bdeb]" />;
  if (status === "delivered") return <FaCheckDouble className="w-3 h-3 text-[#8696a0]" />;
  return <FaCheck className="w-3 h-3 text-[#8696a0]" />;
};

const ChatWindow = () => {
  const { user: currentUser } = useUserStore();
  const { selectedContact, clearSelectedContact } = useLayoutStore();
  const {
    messages,
    isLoadingMessages,
    selectedConversation,
    setSelectedConversation,
    sendMessage,
    conversations,
    deleteMessage,
    addReaction,
    startTyping,
    stopTyping,
    isUserOnline,
    getUserLastSeen,
    isUserTyping,
    fetchConversations,
  } = useChatStore();

  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const [sending, setSending] = useState(false);
  const [activeReactionMsgId, setActiveReactionMsgId] = useState(null);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!selectedContact?._id || !currentUser?._id) return;

    const existing = conversations.find((c) =>
      c.participants?.some((p) => (p._id || p) === selectedContact._id)
    );

    setSelectedConversation(existing || null);
  }, [selectedContact?._id, conversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleTyping = (e) => {
    setText(e.target.value);

    if (!selectedConversation?._id || !selectedContact?._id) return;

    startTyping(selectedContact._id, selectedConversation._id);

    clearTimeout(typingTimeout);
    const t = setTimeout(() => {
      stopTyping(selectedContact._id, selectedConversation._id);
    }, 1500);
    setTypingTimeout(t);
  };

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setFilePreview(URL.createObjectURL(selected));
  };

  const clearFile = () => {
    setFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSend = async () => {
    if ((!text.trim() && !file) || !selectedContact?._id || !currentUser?._id) return;
    setSending(true);

    try {
      await sendMessage({
        senderId: currentUser._id,
        receiverId: selectedContact._id,
        content: text.trim() || undefined,
        file: file || undefined,
      });

      setText("");
      clearFile();
      fetchConversations();
    } catch (err) {
      console.error("Send failed:", err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      await deleteMessage(messageId);
    } catch (err) {
      console.error("Delete failed:", err);
    }
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
    <div className="h-full flex flex-col">
      <div className="h-16 px-4 bg-[#f0f2f5] dark:bg-[#202c33] border-b border-[#e9edef] dark:border-[#222e35] flex items-center justify-between flex-shrink-0 z-10">
        <div className="flex items-center gap-3">
          {isMobile && (
            <button
              onClick={clearSelectedContact}
              className="p-2 -ml-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-[#54656f] dark:text-[#aebac1]"
            >
              <FaArrowLeft className="w-4 h-4" />
            </button>
          )}

          <img
            src={getAvatarUrl(selectedContact, selectedContact?.username)}
            alt={selectedContact?.username}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = getAvatarUrl(null, selectedContact?.username);
            }}
            className="w-10 h-10 rounded-full object-cover bg-gray-200 dark:bg-gray-700 cursor-pointer"
          />

          <div>
            <h2 className="text-sm font-semibold text-[#111b21] dark:text-[#e9edef] leading-tight">
              {selectedContact?.username}
            </h2>
            <span className="text-[11px] text-[#54656f] dark:text-[#8696a0]">
              {isContactTyping
                ? "typing..."
                : isContactOnline
                ? "online"
                : lastSeenDate
                ? `last seen ${formatTime(lastSeenDate)}`
                : "offline"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-[#54656f] dark:text-[#aebac1]">
          <button className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
            <FaEllipsisV className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-12 py-4 bg-[#efeae2] dark:bg-[#0b141a] space-y-1 relative select-text">
        {isLoadingMessages ? (
          <div className="h-full flex flex-col items-center justify-center text-[#8696a0]">
            <div className="w-8 h-8 border-2 border-[#00a884] border-t-transparent rounded-full animate-spin mb-3" />
            <span className="text-xs">Loading messages...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-[#8696a0] opacity-80 select-none">
            <div className="p-4 bg-white/70 dark:bg-[#182229]/70 rounded-xl shadow-sm text-center max-w-sm">
              <FaLock className="w-4 h-4 mx-auto mb-2 text-[#00a884]" />
              <p className="text-xs">
                Messages are end-to-end encrypted. No one outside of this chat can read them.
              </p>
            </div>
          </div>
        ) : (
          Object.entries(groupedMessages).map(([dateLabel, dayMessages]) => (
            <div key={dateLabel}>
              <div className="flex items-center justify-center my-4">
                <span className="px-3 py-1 text-[11px] font-medium text-[#54656f] dark:text-[#8696a0] bg-white dark:bg-[#182229] rounded-full shadow-sm">
                  {dateLabel}
                </span>
              </div>

              {dayMessages.map((msg) => {
                const isMine =
                  (msg.sender?._id || msg.sender) === currentUser._id;
                const showPicker = activeReactionMsgId === msg._id;

                return (
                  <div
                    key={msg._id}
                    className={`flex mb-2 group relative ${isMine ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`relative max-w-[72%] rounded-lg px-3 pt-2 pb-2 shadow-sm ${
                        isMine
                          ? "bg-[#d9fdd3] dark:bg-[#005c4b] rounded-tr-none"
                          : "bg-white dark:bg-[#202c33] rounded-tl-none"
                      }`}
                    >
                      {msg.imageOrVideoUrl && msg.contentType === "image" && (
                        <img
                          src={msg.imageOrVideoUrl}
                          alt="shared"
                          className="rounded-md max-h-64 w-auto mb-1 object-cover cursor-pointer"
                          onClick={() => window.open(msg.imageOrVideoUrl, "_blank")}
                        />
                      )}
                      {msg.imageOrVideoUrl && msg.contentType === "video" && (
                        <video
                          src={msg.imageOrVideoUrl}
                          controls
                          className="rounded-md max-h-64 w-full mb-1"
                        />
                      )}

                      {msg.content && (
                        <p className="text-[13.5px] leading-snug text-[#111b21] dark:text-[#e9edef] break-words whitespace-pre-wrap">
                          {msg.content}
                        </p>
                      )}

                      <div className="flex items-center justify-end gap-1 mt-0.5">
                        <span className="text-[10px] text-[#8696a0]">
                          {formatTime(msg.createdAt)}
                        </span>
                        {isMine && <StatusTick status={msg.messageStatus} />}
                      </div>

                      {/* Display message reactions */}
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

                      {/* Hover action toolbar: Emoji Reactions & Delete */}
                      <div className="absolute -top-3.5 right-1 hidden group-hover:flex items-center gap-1 bg-white dark:bg-[#202c33] border border-gray-200 dark:border-[#2a3942] rounded-full px-1.5 py-0.5 shadow-md z-20">
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
                            onClick={() => handleDeleteMessage(msg._id)}
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

        <div ref={messagesEndRef} />
      </div>

      {filePreview && (
        <div className="px-4 py-2 bg-[#f0f2f5] dark:bg-[#202c33] border-t border-[#e9edef] dark:border-[#222e35] flex items-center gap-3">
          {file?.type?.startsWith("image/") ? (
            <img src={filePreview} alt="preview" className="h-16 w-16 object-cover rounded-md" />
          ) : (
            <FaVideo className="w-8 h-8 text-[#00a884]" />
          )}
          <span className="text-xs text-[#54656f] dark:text-[#8696a0] truncate flex-1">
            {file?.name}
          </span>
          <button onClick={clearFile} className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10">
            <FaTimes className="w-3.5 h-3.5 text-[#8696a0]" />
          </button>
        </div>
      )}

      <div className="min-h-[62px] px-3 py-2 bg-[#f0f2f5] dark:bg-[#202c33] border-t border-[#e9edef] dark:border-[#222e35] flex items-center gap-2 flex-shrink-0">
        <button className="p-2 text-[#54656f] dark:text-[#8696a0] hover:text-[#00a884] transition-colors">
          <FaSmile className="w-5 h-5" />
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-2 text-[#54656f] dark:text-[#8696a0] hover:text-[#00a884] transition-colors"
          title="Attach image or video"
        >
          <FaPaperclip className="w-5 h-5" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="flex-1">
          <input
            type="text"
            placeholder="Type a message"
            value={text}
            onChange={handleTyping}
            onKeyDown={handleKeyDown}
            className="w-full h-10 px-4 rounded-lg bg-white dark:bg-[#2a3942] text-sm text-[#111b21] dark:text-[#e9edef] placeholder-[#8696a0] outline-none"
          />
        </div>

        {text.trim() || file ? (
          <button
            onClick={handleSend}
            disabled={sending}
            className="p-2.5 rounded-full bg-[#00a884] hover:bg-[#02906f] disabled:opacity-60 text-white transition-transform active:scale-95 shadow-md shadow-[#00a884]/20"
          >
            {sending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <FaPaperPlane className="w-4 h-4" />
            )}
          </button>
        ) : (
          <button className="p-2 text-[#54656f] dark:text-[#8696a0] hover:text-[#00a884] transition-colors">
            <FaMicrophone className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default ChatWindow;
