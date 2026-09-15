import React, { useRef, useState } from "react";
import Layout from "./Layout";
import ChatList from "./ChatList";
import useLayoutStore from "../store/useLayoutStore";
import useUserStore from "../store/useUserStore";
import useThemeStore from "../store/useThemeStore";
import { getAvatarUrl } from "../utils/avatarUtil";
import { updateUserProfile } from "../services/userService";
import { toast } from "react-toastify";
import {
  FaArrowLeft,
  FaCamera,
  FaPen,
  FaCheck,
  FaShieldAlt,
  FaBell,
  FaKey,
  FaPalette,
  FaQuestionCircle,
  FaPlus,
  FaCircleNotch,
} from "react-icons/fa";

const HomePage = () => {
  const { activeTab, setActiveTab } = useLayoutStore();
  const { user, setUser } = useUserStore();
  const { theme, toggleTheme } = useThemeStore();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("username", user?.username || "WhatsApp User");

      const response = await updateUserProfile(formData);
      if (response?.data?.user) {
        setUser(response.data.user);
        toast.success("Profile photo updated successfully!");
      }
    } catch (err) {
      console.error("Photo upload failed:", err);
      toast.error(err?.message || "Failed to upload profile photo");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Layout>
      {/* 1. Chats Tab View */}
      {activeTab === "chats" && <ChatList />}

      {/* 2. Status Tab View */}
      {activeTab === "status" && (
        <div className="flex flex-col h-full bg-white dark:bg-[#111b21] border-r border-[#e9edef] dark:border-[#222e35]">
          <div className="h-16 px-4 bg-[#008069] dark:bg-[#202c33] text-white flex items-center gap-4 flex-shrink-0">
            <button
              onClick={() => setActiveTab("chats")}
              className="p-1 rounded-full hover:bg-white/10"
              title="Back to chats"
            >
              <FaArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="text-base font-semibold">Status</h1>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* My Status */}
            <div className="flex items-center gap-3 cursor-pointer p-2 rounded-xl hover:bg-[#f0f2f5] dark:hover:bg-[#202c33] transition-colors">
              <div className="relative">
                <img
                  src={getAvatarUrl(user, user?.username)}
                  alt="My status"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = getAvatarUrl(null, user?.username);
                  }}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-[#00a884] text-white flex items-center justify-center text-[10px] font-bold border-2 border-white dark:border-[#111b21]">
                  <FaPlus className="w-2 h-2" />
                </span>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-[#111b21] dark:text-[#e9edef]">
                  My status
                </h3>
                <p className="text-xs text-[#8696a0]">Click to add status update</p>
              </div>
            </div>

            <div className="border-t border-[#e9edef] dark:border-[#222e35] pt-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#008069] dark:text-[#00a884] px-2 block mb-3">
                Recent updates
              </span>
              <div className="text-center py-10 text-[#8696a0]">
                <FaCircleNotch className="w-8 h-8 mx-auto mb-2 opacity-40 animate-spin-slow" />
                <p className="text-xs">No recent updates from your contacts</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Settings Tab View */}
      {activeTab === "settings" && (
        <div className="flex flex-col h-full bg-white dark:bg-[#111b21] border-r border-[#e9edef] dark:border-[#222e35]">
          <div className="h-16 px-4 bg-[#008069] dark:bg-[#202c33] text-white flex items-center gap-4 flex-shrink-0">
            <button
              onClick={() => setActiveTab("chats")}
              className="p-1 rounded-full hover:bg-white/10"
              title="Back to chats"
            >
              <FaArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="text-base font-semibold">Settings</h1>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* User Profile Snippet */}
            <div
              onClick={() => setActiveTab("profile")}
              className="flex items-center gap-4 p-4 border-b border-[#e9edef] dark:border-[#222e35] cursor-pointer hover:bg-[#f0f2f5] dark:hover:bg-[#202c33] transition-colors"
            >
              <img
                src={getAvatarUrl(user, user?.username)}
                alt="Profile"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = getAvatarUrl(null, user?.username);
                }}
                className="w-16 h-16 rounded-full object-cover"
              />
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-semibold text-[#111b21] dark:text-[#e9edef] truncate">
                  {user?.username || "WhatsApp User"}
                </h2>
                <p className="text-xs text-[#8696a0] truncate mt-0.5">
                  {user?.about || "Hey there! I am using WhatsApp."}
                </p>
              </div>
            </div>

            {/* Settings Options List */}
            <div className="py-2 divide-y divide-[#e9edef]/60 dark:divide-[#222e35]/60 text-sm">
              <button
                onClick={toggleTheme}
                className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-[#f0f2f5] dark:hover:bg-[#202c33] text-[#111b21] dark:text-[#e9edef] transition-colors"
              >
                <div className="flex items-center gap-4">
                  <FaPalette className="w-5 h-5 text-[#8696a0]" />
                  <div className="text-left">
                    <p className="font-medium">Theme</p>
                    <span className="text-xs text-[#8696a0]">
                      Currently {theme === "dark" ? "Dark Mode" : "Light Mode"}
                    </span>
                  </div>
                </div>
                <span className="text-xs text-[#00a884] font-medium">Click to switch</span>
              </button>

              <div className="w-full flex items-center gap-4 px-5 py-3.5 text-[#111b21] dark:text-[#e9edef]">
                <FaBell className="w-5 h-5 text-[#8696a0]" />
                <div className="text-left">
                  <p className="font-medium">Notifications</p>
                  <span className="text-xs text-[#8696a0]">Messages, sounds</span>
                </div>
              </div>

              <div className="w-full flex items-center gap-4 px-5 py-3.5 text-[#111b21] dark:text-[#e9edef]">
                <FaShieldAlt className="w-5 h-5 text-[#8696a0]" />
                <div className="text-left">
                  <p className="font-medium">Privacy</p>
                  <span className="text-xs text-[#8696a0]">Last seen, profile photo</span>
                </div>
              </div>

              <div className="w-full flex items-center gap-4 px-5 py-3.5 text-[#111b21] dark:text-[#e9edef]">
                <FaKey className="w-5 h-5 text-[#8696a0]" />
                <div className="text-left">
                  <p className="font-medium">Security</p>
                  <span className="text-xs text-[#8696a0]">End-to-end encryption details</span>
                </div>
              </div>

              <div className="w-full flex items-center gap-4 px-5 py-3.5 text-[#111b21] dark:text-[#e9edef]">
                <FaQuestionCircle className="w-5 h-5 text-[#8696a0]" />
                <div className="text-left">
                  <p className="font-medium">Help & About</p>
                  <span className="text-xs text-[#8696a0]">FAQ, contact us</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Profile Tab View */}
      {activeTab === "profile" && (
        <div className="flex flex-col h-full bg-white dark:bg-[#111b21] border-r border-[#e9edef] dark:border-[#222e35]">
          <div className="h-16 px-4 bg-[#008069] dark:bg-[#202c33] text-white flex items-center gap-4 flex-shrink-0">
            <button
              onClick={() => setActiveTab("chats")}
              className="p-1 rounded-full hover:bg-white/10"
              title="Back to chats"
            >
              <FaArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="text-base font-semibold">Profile</h1>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Avatar Photo */}
            <div className="flex justify-center my-2">
              <div className="relative w-36 h-36 rounded-full shadow-lg">
                <img
                  src={getAvatarUrl(user, user?.username)}
                  alt="Profile"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = getAvatarUrl(null, user?.username);
                  }}
                  className="w-full h-full rounded-full object-cover border-4 border-white dark:border-[#202c33]"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute bottom-1 right-1 w-10 h-10 rounded-full bg-[#00a884] hover:bg-[#02906f] text-white flex items-center justify-center shadow-md cursor-pointer transition-transform hover:scale-105"
                  title="Upload profile picture"
                >
                  <FaCamera className="w-4 h-4" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </div>
            </div>

            {/* Name Section */}
            <div className="bg-[#f0f2f5] dark:bg-[#202c33] p-4 rounded-xl">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#008069] dark:text-[#00a884] block mb-1">
                Your name
              </span>
              <p className="text-base font-medium text-[#111b21] dark:text-[#e9edef]">
                {user?.username || "WhatsApp User"}
              </p>
              <p className="text-[11px] text-[#8696a0] mt-1">
                This name is visible to your WhatsApp contacts.
              </p>
            </div>

            {/* About Section */}
            <div className="bg-[#f0f2f5] dark:bg-[#202c33] p-4 rounded-xl">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#008069] dark:text-[#00a884] block mb-1">
                About
              </span>
              <p className="text-sm text-[#111b21] dark:text-[#e9edef]">
                {user?.about || "Hey there! I am using WhatsApp."}
              </p>
            </div>

            {/* Phone / Email Section */}
            <div className="bg-[#f0f2f5] dark:bg-[#202c33] p-4 rounded-xl">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#008069] dark:text-[#00a884] block mb-1">
                Contact details
              </span>
              <p className="text-sm font-mono text-[#111b21] dark:text-[#e9edef]">
                {user?.phoneNumber || user?.email || "Not provided"}
              </p>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default HomePage;
