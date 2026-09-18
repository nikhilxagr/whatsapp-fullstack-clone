import React, { useState, useEffect } from "react";
import {
  FaSearch,
  FaEllipsisV,
  FaCircleNotch,
  FaUserCircle,
  FaCheck,
  FaCheckDouble,
  FaTimes,
  FaUsers,
  FaPlus,
} from "react-icons/fa";
import { MdOutlineChat } from "react-icons/md";
import useUserStore from "../store/useUserStore";
import useLayoutStore from "../store/useLayoutStore";
import useChatStore from "../store/useChatStore";
import { getAllUsers } from "../services/userService";
import { getAvatarUrl } from "../utils/avatarUtil";

const ChatList = () => {
  const { user: currentUser } = useUserStore();
  const { selectedContact, setSelectedContact, setActiveTab } = useLayoutStore();
  const { conversations, isUserOnline } = useChatStore();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all"); // 'all' | 'unread' | 'groups'
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await getAllUsers();
        const userList = response?.data?.users || response?.users || [];
        setUsers(userList);
      } catch (err) {
        console.error("Failed to fetch users:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const filteredUsers = users.filter((u) => {
    const conv = conversations.find((c) =>
      c.participants?.some((p) => (p._id || p)?.toString() === u._id?.toString())
    );
    const unread = conv?.unreadCount ?? u.unreadCount ?? 0;

    const nameMatch =
      u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phoneNumber?.includes(searchQuery);

    if (filterType === "unread") {
      return nameMatch && unread > 0;
    }
    return nameMatch;
  });

  const formatTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#111b21] border-r border-[#e9edef] dark:border-[#222e35] select-none transition-colors">
      <div className="h-16 px-4 bg-[#f0f2f5] dark:bg-[#202c33] flex items-center justify-between border-b border-[#e9edef] dark:border-[#222e35] flex-shrink-0">
        <div
          onClick={() => setActiveTab("profile")}
          className="flex items-center gap-3 cursor-pointer group"
          title="View profile"
        >
          <img
            src={getAvatarUrl(currentUser, currentUser?.username)}
            alt="My Profile"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = getAvatarUrl(null, currentUser?.username);
            }}
            className="w-10 h-10 rounded-full object-cover ring-2 ring-transparent group-hover:ring-[#00a884] transition-all"
          />
          <span className="text-sm font-semibold text-[#111b21] dark:text-[#e9edef] hidden sm:inline max-w-[120px] truncate">
            {currentUser?.username || "You"}
          </span>
        </div>

        <div className="flex items-center gap-1 text-[#54656f] dark:text-[#aebac1]">
          <button
            onClick={() => setActiveTab("status")}
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            title="Status"
          >
            <FaCircleNotch className="w-5 h-5" />
          </button>
          <button
            onClick={() => setActiveTab("chats")}
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            title="New chat"
          >
            <MdOutlineChat className="w-5 h-5" />
          </button>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              title="Menu"
            >
              <FaEllipsisV className="w-4 h-4" />
            </button>
            {showMenu && (
              <div
                className="absolute right-0 top-10 w-44 bg-white dark:bg-[#233138] rounded-lg shadow-xl border border-gray-100 dark:border-[#222e35] py-2 z-50 text-sm"
                onMouseLeave={() => setShowMenu(false)}
              >
                <button
                  onClick={() => {
                    setActiveTab("profile");
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-[#f0f2f5] dark:hover:bg-[#182229] text-[#111b21] dark:text-[#e9edef]"
                >
                  Profile
                </button>
                <button
                  onClick={() => {
                    setActiveTab("settings");
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-[#f0f2f5] dark:hover:bg-[#182229] text-[#111b21] dark:text-[#e9edef]"
                >
                  Settings
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-2.5 bg-white dark:bg-[#111b21] border-b border-[#e9edef] dark:border-[#222e35] flex flex-col gap-2 flex-shrink-0">
        <div className="flex items-center h-9 px-3 bg-[#f0f2f5] dark:bg-[#202c33] rounded-lg text-sm text-[#111b21] dark:text-[#e9edef]">
          <FaSearch className="w-3.5 h-3.5 text-[#8696a0] mr-3 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search or start new chat"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent outline-none text-xs placeholder-[#8696a0]"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")}>
              <FaTimes className="w-3 h-3 text-[#8696a0] hover:text-gray-700 dark:hover:text-white" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 px-1">
          <button
            onClick={() => setFilterType("all")}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filterType === "all"
                ? "bg-[#00a884]/15 text-[#00a884] dark:bg-[#00a884]/25"
                : "bg-[#f0f2f5] dark:bg-[#202c33] text-[#54656f] dark:text-[#8696a0] hover:bg-[#e9edef] dark:hover:bg-[#2a3942]"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterType("unread")}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filterType === "unread"
                ? "bg-[#00a884]/15 text-[#00a884] dark:bg-[#00a884]/25"
                : "bg-[#f0f2f5] dark:bg-[#202c33] text-[#54656f] dark:text-[#8696a0] hover:bg-[#e9edef] dark:hover:bg-[#2a3942]"
            }`}
          >
            Unread
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-[#e9edef]/60 dark:divide-[#222e35]/60">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-[#8696a0]">
            <div className="w-8 h-8 border-2 border-[#00a884] border-t-transparent rounded-full animate-spin mb-3" />
            <span className="text-xs">Loading chats...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12 px-6 text-[#8696a0]">
            <FaUsers className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-xs font-medium">No conversations found</p>
            <p className="text-[11px] mt-1 text-[#8696a0]/80">
              Users registered on WhatsApp will show up here.
            </p>
          </div>
        ) : (
          filteredUsers.map((userItem) => {
            const isSelected = selectedContact?._id === userItem._id;
            const conv = conversations.find((c) =>
              c.participants?.some((p) => (p._id || p)?.toString() === userItem._id?.toString())
            );
            const lastMsg = conv?.lastMessage || userItem.conversation?.lastMessage;
            const unread = conv?.unreadCount ?? userItem.unreadCount ?? 0;
            const isOnline = isUserOnline(userItem._id) || userItem.isOnline;

            return (
              <div
                key={userItem._id}
                onClick={() => setSelectedContact(userItem)}
                className={`flex items-center gap-3 px-3.5 py-3 cursor-pointer transition-colors ${
                  isSelected
                    ? "bg-[#f0f2f5] dark:bg-[#2a3942]"
                    : "hover:bg-[#f5f6f6] dark:hover:bg-[#202c33]/70"
                }`}
              >
                <div className="relative flex-shrink-0">
                  <img
                    src={getAvatarUrl(userItem, userItem.username)}
                    alt={userItem.username}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = getAvatarUrl(null, userItem.username);
                    }}
                    className="w-12 h-12 rounded-full object-cover bg-gray-200 dark:bg-gray-700"
                  />
                  {isOnline && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#25d366] rounded-full border-2 border-white dark:border-[#111b21]" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h2 className="text-sm font-semibold text-[#111b21] dark:text-[#e9edef] truncate">
                      {userItem.username}
                    </h2>
                    <span className="text-[11px] text-[#8696a0] flex-shrink-0 ml-2 font-mono">
                      {formatTime(lastMsg?.createdAt || userItem.lastSeen)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-[#54656f] dark:text-[#8696a0]">
                    <p className="truncate text-xs text-[#54656f] dark:text-[#8696a0]">
                      {lastMsg?.content || userItem.about || "Hey there! I am using WhatsApp."}
                    </p>
                    {unread > 0 && (
                      <span className="ml-2 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-[#25d366] text-white text-[10px] font-bold rounded-full flex-shrink-0">
                        {unread}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ChatList;
