import React, { useState, useEffect, useMemo } from "react";
import {
  FaArrowLeft,
  FaSearch,
  FaUsers,
  FaUserPlus,
  FaTimes,
  FaCircleNotch,
} from "react-icons/fa";
import { MdGroups } from "react-icons/md";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import { getAllUsers } from "../services/userService";
import { getAvatarUrl } from "../utils/avatarUtil";
import useChatStore from "../store/useChatStore";

const NewChat = ({ onClose, onSelectUser, currentUser }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { isUserOnline } = useChatStore();

  useEffect(() => {
    let isMounted = true;
    const loadUsers = async () => {
      try {
        setLoading(true);
        const res = await getAllUsers();
        const list = res?.data?.users || res?.users || [];
        if (isMounted) {
          // Exclude current user from contact list
          const others = list.filter(
            (u) => (u._id || u.id)?.toString() !== currentUser?._id?.toString()
          );
          setUsers(others);
        }
      } catch (err) {
        console.error("Failed to load registered users:", err);
        toast.error("Failed to load contacts");
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadUsers();
    return () => {
      isMounted = false;
    };
  }, [currentUser?._id]);

  // Filter users by search query
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase().trim();
    return users.filter(
      (u) =>
        u.username?.toLowerCase().includes(q) ||
        u.phoneNumber?.includes(q) ||
        u.about?.toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  // Group contacts alphabetically (e.g. #, A, B, C...)
  const groupedUsers = useMemo(() => {
    const sorted = [...filteredUsers].sort((a, b) =>
      (a.username || a.phoneNumber || "").localeCompare(
        b.username || b.phoneNumber || ""
      )
    );

    const groups = {};
    sorted.forEach((u) => {
      const name = (u.username || u.phoneNumber || "").trim();
      const firstChar = name.charAt(0).toUpperCase();
      const key = /^[A-Z]$/.test(firstChar) ? firstChar : "#";
      if (!groups[key]) groups[key] = [];
      groups[key].push(u);
    });

    return groups;
  }, [filteredUsers]);

  return (
    <motion.div
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -20, opacity: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="flex flex-col h-full bg-white dark:bg-[#111b21] border-r border-[#e9edef] dark:border-[#222e35] select-none"
    >
      {/* ── Header ── */}
      <div className="h-16 px-4 bg-white dark:bg-[#111b21] flex items-center gap-4 flex-shrink-0 border-b border-[#e9edef]/60 dark:border-[#222e35]/60">
        <button
          onClick={onClose}
          className="p-2 -ml-1 rounded-full hover:bg-[#f0f2f5] dark:hover:bg-[#202c33] text-[#54656f] dark:text-[#aebac1] transition-colors"
          title="Back to chats"
        >
          <FaArrowLeft className="w-4 h-4" />
        </button>
        <h2 className="text-lg font-bold text-[#111b21] dark:text-[#e9edef] tracking-tight">
          New chat
        </h2>
      </div>

      {/* ── Search Bar with green accent ── */}
      <div className="px-3 py-2.5 bg-white dark:bg-[#111b21] flex-shrink-0">
        <div className="flex items-center h-10 px-3.5 bg-[#f0f2f5] dark:bg-[#202c33] rounded-full border border-transparent focus-within:border-[#00a884] focus-within:bg-white dark:focus-within:bg-[#202c33] transition-all">
          <FaSearch className="w-3.5 h-3.5 text-[#54656f] dark:text-[#8696a0] mr-3 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search name, number or @username"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
            className="w-full bg-transparent outline-none text-xs sm:text-sm text-[#111b21] dark:text-[#e9edef] placeholder-[#8696a0]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10"
            >
              <FaTimes className="w-3 h-3 text-[#8696a0] hover:text-[#111b21] dark:hover:text-white" />
            </button>
          )}
        </div>
      </div>

      {/* ── List Content ── */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#e9edef]/40 dark:divide-[#222e35]/40">
        {/* Quick action options (shown when not actively searching) */}
        {!searchQuery.trim() && (
          <div className="py-1">
            <button
              onClick={() => toast.info("New group feature coming soon")}
              className="w-full flex items-center gap-4 px-4 py-2.5 hover:bg-[#f5f6f6] dark:hover:bg-[#202c33]/70 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-[#00a884] text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                <FaUsers className="w-4 h-4" />
              </div>
              <span className="text-sm font-semibold text-[#111b21] dark:text-[#e9edef]">
                New group
              </span>
            </button>

            <button
              onClick={() => toast.info("New contact feature coming soon")}
              className="w-full flex items-center gap-4 px-4 py-2.5 hover:bg-[#f5f6f6] dark:hover:bg-[#202c33]/70 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-[#00a884] text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                <FaUserPlus className="w-4 h-4" />
              </div>
              <span className="text-sm font-semibold text-[#111b21] dark:text-[#e9edef]">
                New contact
              </span>
            </button>

            <button
              onClick={() => toast.info("Communities feature coming soon")}
              className="w-full flex items-center gap-4 px-4 py-2.5 hover:bg-[#f5f6f6] dark:hover:bg-[#202c33]/70 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-[#00a884] text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                <MdGroups className="w-5 h-5" />
              </div>
              <span className="text-sm font-semibold text-[#111b21] dark:text-[#e9edef]">
                New community
              </span>
            </button>

            {/* Message Yourself card */}
            {currentUser && (
              <div
                onClick={() => onSelectUser(currentUser)}
                className="mx-3 my-2 p-2.5 rounded-xl bg-[#f0f2f5] dark:bg-[#202c33] hover:bg-[#e9edef] dark:hover:bg-[#2a3942] cursor-pointer flex items-center gap-3 transition-colors"
              >
                <img
                  src={getAvatarUrl(currentUser, currentUser?.username)}
                  alt="You"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = getAvatarUrl(null, currentUser?.username);
                  }}
                  className="w-11 h-11 rounded-full object-cover bg-gray-200 dark:bg-gray-700"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-[#111b21] dark:text-[#e9edef] truncate">
                    @{currentUser?.username || "you"} (You)
                  </h3>
                  <p className="text-xs text-[#8696a0] truncate">Message yourself</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Registered users list ── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-[#8696a0]">
            <FaCircleNotch className="w-7 h-7 animate-spin text-[#00a884] mb-3" />
            <span className="text-xs">Loading registered users...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12 px-6 text-[#8696a0]">
            <p className="text-xs font-medium">No contacts found</p>
            <p className="text-[11px] mt-1 opacity-70">
              {searchQuery
                ? `No user matching "${searchQuery}"`
                : "No other registered users in the database yet."}
            </p>
          </div>
        ) : (
          Object.entries(groupedUsers).map(([letter, userList]) => (
            <div key={letter}>
              <div className="px-4 py-2 bg-[#f0f2f5]/60 dark:bg-[#182229]/60 sticky top-0 z-10">
                <span className="text-xs font-bold text-[#00a884]">{letter}</span>
              </div>

              {userList.map((userItem) => {
                const isOnline = isUserOnline(userItem._id) || userItem.isOnline;
                return (
                  <div
                    key={userItem._id}
                    onClick={() => onSelectUser(userItem)}
                    className="flex items-center gap-3.5 px-4 py-3 cursor-pointer hover:bg-[#f5f6f6] dark:hover:bg-[#202c33]/70 transition-colors"
                  >
                    <div className="relative flex-shrink-0">
                      <img
                        src={getAvatarUrl(userItem, userItem.username)}
                        alt={userItem.username}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = getAvatarUrl(null, userItem.username);
                        }}
                        className="w-11 h-11 rounded-full object-cover bg-gray-200 dark:bg-gray-700"
                      />
                      {isOnline && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#25d366] rounded-full border-2 border-white dark:border-[#111b21]" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-[#111b21] dark:text-[#e9edef] truncate">
                        {userItem.username || userItem.phoneNumber || "WhatsApp User"}
                      </h4>
                      <p className="text-xs text-[#8696a0] truncate mt-0.5">
                        {userItem.about || "Hey there! I am using WhatsApp."}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
};

export default NewChat;
