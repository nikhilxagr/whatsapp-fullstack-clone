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
    onlineUsers,
    typingUsers,
    fetchConversations,
  } = useChatStore();

  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const [sending, setSending] = useState(false);

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

    const socket = getSocket();
    if (!socket || !selectedConversation?._id || !selectedContact?._id) return;

    socket.emit("typing start", {
      conversationId: selectedConversation._id,
      receiverId: selectedContact._id,
    });

    clearTimeout(typingTimeout);
    const t = setTimeout(() => {
      socket.emit("typing stop", {
        conversationId: selectedConversation._id,
        receiverId: selectedContact._id,
      });
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
      useChatStore.setState((state) => ({
        messages: state.messages.filter((m) => m._id !== messageId),
      }));
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

  const isContactOnline =
    selectedContact?.isOnline || onlineUsers.has(selectedContact?._id);

  const isContactTyping =
    selectedConversation?._id && typingUsers[selectedConversation._id];

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
                : selectedContact?.lastSeen
                ? `last seen ${formatTime(selectedContact.lastSeen)}`
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

      <div
        className="flex-1 overflow-y-auto p-4 space-y-1"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2300a884' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
      >
        <div className="mx-auto max-w-sm text-center py-2 px-4 bg-[#fffde7] dark:bg-[#182229]/90 backdrop-blur rounded-lg shadow-sm border border-yellow-100/60 dark:border-[#222e35] mb-4">
          <p className="text-[11px] text-[#54656f] dark:text-[#8696a0] flex items-center justify-center gap-1.5 font-medium">
            <FaLock className="w-2.5 h-2.5 text-[#00a884]" />
            Messages are end-to-end encrypted
          </p>
        </div>

        {isLoadingMessages ? (
          <div className="flex justify-center items-center py-12">
            <div className="w-7 h-7 border-2 border-[#00a884] border-t-transparent rounded-full animate-spin" />
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

                return (
                  <div
                    key={msg._id}
                    className={`flex mb-1 group ${isMine ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`relative max-w-[72%] rounded-lg px-3 pt-2 pb-1.5 shadow-sm ${
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

                      {isMine && (
                        <button
                          onClick={() => handleDeleteMessage(msg._id)}
                          className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-white dark:bg-[#233138] shadow-md text-red-400 hover:text-red-500 items-center justify-center hidden group-hover:flex transition-all"
                          title="Delete message"
                        >
                          <FaTrash className="w-2.5 h-2.5" />
                        </button>
                      )}
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
