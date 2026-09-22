import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "./Layout";
import ChatList from "./ChatList";
import useLayoutStore from "../store/useLayoutStore";
import useUserStore from "../store/useUserStore";
import useThemeStore from "../store/useThemeStore";
import { getAvatarUrl } from "../utils/avatarUtil";
import { updateUserProfile, logoutUser } from "../services/userService";
import { disconnectSocket } from "../services/chat.service";
import { toast } from "react-toastify";
import {
  FaArrowLeft,
  FaCamera,
  FaPen,
  FaCheck,
  FaTimes,
  FaTrashAlt,
  FaShieldAlt,
  FaBell,
  FaKey,
  FaPalette,
  FaQuestionCircle,
  FaPlus,
  FaCircleNotch,
  FaPhoneAlt,
  FaEnvelope,
  FaSignOutAlt,
} from "react-icons/fa";

const HomePage = () => {
  const navigate = useNavigate();
  const { activeTab, setActiveTab } = useLayoutStore();
  const { user, setUser, clearUser } = useUserStore();
  const { theme, toggleTheme } = useThemeStore();

  const [loggingOut, setLoggingOut] = useState(false);

  /* Logout: call API → disconnect socket → clear stores → redirect */
  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logoutUser();
    } catch (err) {
      console.error("Logout API error:", err);
    } finally {
      disconnectSocket();
      clearUser();
      toast.success("Logged out successfully");
      navigate("/user-login", { replace: true });
    }
  };

  const [uploading, setUploading] = useState(false);
  const [removingPhoto, setRemovingPhoto] = useState(false);
  const fileInputRef = useRef(null);

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [savingName, setSavingName] = useState(false);
  const nameInputRef = useRef(null);

  const [isEditingAbout, setIsEditingAbout] = useState(false);
  const [aboutInput, setAboutInput] = useState("");
  const [savingAbout, setSavingAbout] = useState(false);
  const aboutInputRef = useRef(null);

  const handleStartEditName = () => {
    setNameInput(user?.username || "");
    setIsEditingName(true);
    setTimeout(() => {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }, 50);
  };

  const handleCancelEditName = () => {
    setIsEditingName(false);
    setNameInput(user?.username || "");
  };

  const handleSaveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      toast.error("Name cannot be empty");
      return;
    }
    if (trimmed === user?.username) {
      setIsEditingName(false);
      return;
    }

    try {
      setSavingName(true);
      const response = await updateUserProfile({ username: trimmed });
      const updatedUser = response?.data?.user || response?.user;
      if (updatedUser) {
        setUser(updatedUser);
        toast.success("Name updated successfully!");
        setIsEditingName(false);
      }
    } catch (err) {
      console.error("Failed to update name:", err);
      toast.error(err?.message || "Failed to update name");
    } finally {
      setSavingName(false);
    }
  };

  const handleStartEditAbout = () => {
    setAboutInput(user?.about || "Hey there! I am using WhatsApp.");
    setIsEditingAbout(true);
    setTimeout(() => {
      aboutInputRef.current?.focus();
      aboutInputRef.current?.select();
    }, 50);
  };

  const handleCancelEditAbout = () => {
    setIsEditingAbout(false);
    setAboutInput(user?.about || "");
  };

  const handleSaveAbout = async () => {
    const trimmed = aboutInput.trim();
    if (trimmed === user?.about) {
      setIsEditingAbout(false);
      return;
    }

    try {
      setSavingAbout(true);
      const response = await updateUserProfile({ about: trimmed });
      const updatedUser = response?.data?.user || response?.user;
      if (updatedUser) {
        setUser(updatedUser);
        toast.success("About updated successfully!");
        setIsEditingAbout(false);
      }
    } catch (err) {
      console.error("Failed to update about:", err);
      toast.error(err?.message || "Failed to update about");
    } finally {
      setSavingAbout(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input to allow selecting same file again
    e.target.value = "";

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      const response = await updateUserProfile(formData);
      const updatedUser = response?.data?.user || response?.user;
      if (updatedUser) {
        setUser(updatedUser);
        toast.success("Profile photo updated successfully!");
      }
    } catch (err) {
      console.error("Photo upload failed:", err);
      toast.error(err?.message || "Failed to upload profile photo");
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    try {
      setRemovingPhoto(true);
      const response = await updateUserProfile({ profilePicture: "" });
      const updatedUser = response?.data?.user || response?.user;
      if (updatedUser) {
        setUser(updatedUser);
        toast.success("Profile photo removed");
      }
    } catch (err) {
      console.error("Failed to remove photo:", err);
      toast.error(err?.message || "Failed to remove photo");
    } finally {
      setRemovingPhoto(false);
    }
  };

  return (
    <Layout>
      {activeTab === "chats" && <ChatList />}

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

            {/* Logout Button */}
            <div className="px-4 py-4 border-t border-[#e9edef] dark:border-[#222e35]">
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="w-full flex items-center gap-4 px-5 py-3.5 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors font-medium text-sm disabled:opacity-60"
              >
                {loggingOut ? (
                  <FaCircleNotch className="w-5 h-5 animate-spin" />
                ) : (
                  <FaSignOutAlt className="w-5 h-5" />
                )}
                <span>{loggingOut ? "Logging out..." : "Log out"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
            <div className="flex flex-col items-center my-2">
              <div
                onClick={() => !uploading && !removingPhoto && fileInputRef.current?.click()}
                className="group relative w-40 h-40 rounded-full overflow-hidden shadow-lg cursor-pointer transition-transform hover:scale-[1.02]"
                title="Change profile photo"
              >
                <img
                  src={getAvatarUrl(user, user?.username)}
                  alt="Profile"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = getAvatarUrl(null, user?.username);
                  }}
                  className="w-full h-full object-cover border-4 border-white dark:border-[#202c33]"
                />

                <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-center p-2">
                  <FaCamera className="w-6 h-6 mb-1.5 drop-shadow" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider leading-tight drop-shadow">
                    Change<br />Profile Photo
                  </span>
                </div>

                {(uploading || removingPhoto) && (
                  <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white z-10">
                    <FaCircleNotch className="w-7 h-7 animate-spin text-[#00a884] mb-2" />
                    <span className="text-xs font-medium">
                      {uploading ? "Uploading..." : "Removing..."}
                    </span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  disabled={uploading || removingPhoto}
                  className="absolute bottom-1 right-1 w-9 h-9 rounded-full bg-[#00a884] hover:bg-[#02906f] text-white flex items-center justify-center shadow-md cursor-pointer transition-transform hover:scale-110 z-10"
                  title="Upload profile picture"
                >
                  <FaCamera className="w-3.5 h-3.5" />
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />

              {user?.profilePicture && !user?.profilePicture.includes("ui-avatars.com") && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  disabled={uploading || removingPhoto}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 dark:hover:text-red-400 font-medium py-1 px-3 rounded-full hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                  title="Remove current photo"
                >
                  <FaTrashAlt className="w-3 h-3" />
                  <span>Remove photo</span>
                </button>
              )}
            </div>

            <div className="bg-[#f0f2f5] dark:bg-[#202c33] p-4 rounded-xl shadow-sm transition-colors">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#008069] dark:text-[#00a884] block mb-2">
                Your name
              </span>

              {!isEditingName ? (
                <div className="flex items-center justify-between group">
                  <p className="text-base font-medium text-[#111b21] dark:text-[#e9edef] break-words pr-2">
                    {user?.username || "WhatsApp User"}
                  </p>
                  <button
                    type="button"
                    onClick={handleStartEditName}
                    className="p-2 rounded-full text-[#8696a0] hover:text-[#00a884] dark:hover:text-[#00a884] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer flex-shrink-0"
                    title="Edit name"
                  >
                    <FaPen className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 border-b-2 border-[#00a884] pb-1">
                    <input
                      ref={nameInputRef}
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value.slice(0, 25))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveName();
                        if (e.key === "Escape") handleCancelEditName();
                      }}
                      disabled={savingName}
                      maxLength={25}
                      placeholder="Enter your name"
                      className="w-full bg-transparent text-base font-medium text-[#111b21] dark:text-[#e9edef] outline-none"
                    />
                    <span className="text-xs text-[#8696a0] font-mono select-none flex-shrink-0">
                      {25 - nameInput.length}
                    </span>
                    <button
                      type="button"
                      onClick={handleCancelEditName}
                      disabled={savingName}
                      className="p-1.5 rounded-full text-[#8696a0] hover:text-red-400 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer flex-shrink-0"
                      title="Cancel"
                    >
                      <FaTimes className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveName}
                      disabled={savingName}
                      className="p-1.5 rounded-full text-[#00a884] hover:text-[#02906f] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer flex-shrink-0"
                      title="Save name"
                    >
                      {savingName ? (
                        <FaCircleNotch className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <FaCheck className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                  <p className="text-[11px] text-[#8696a0]">
                    Press <kbd className="px-1 py-0.5 rounded bg-black/5 dark:bg-white/10 font-mono text-[10px]">Enter</kbd> to save, <kbd className="px-1 py-0.5 rounded bg-black/5 dark:bg-white/10 font-mono text-[10px]">Esc</kbd> to cancel
                  </p>
                </div>
              )}

              <p className="text-[11px] text-[#8696a0] mt-2">
                This name is visible to your WhatsApp contacts.
              </p>
            </div>

            <div className="bg-[#f0f2f5] dark:bg-[#202c33] p-4 rounded-xl shadow-sm transition-colors">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#008069] dark:text-[#00a884] block mb-2">
                About
              </span>

              {!isEditingAbout ? (
                <div className="flex items-start justify-between group">
                  <p className="text-sm text-[#111b21] dark:text-[#e9edef] break-words pr-2 leading-relaxed flex-1">
                    {user?.about || "Hey there! I am using WhatsApp."}
                  </p>
                  <button
                    type="button"
                    onClick={handleStartEditAbout}
                    className="p-2 rounded-full text-[#8696a0] hover:text-[#00a884] dark:hover:text-[#00a884] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer flex-shrink-0"
                    title="Edit about"
                  >
                    <FaPen className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-end gap-2 border-b-2 border-[#00a884] pb-1">
                    <textarea
                      ref={aboutInputRef}
                      value={aboutInput}
                      onChange={(e) => setAboutInput(e.target.value.slice(0, 139))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSaveAbout();
                        }
                        if (e.key === "Escape") handleCancelEditAbout();
                      }}
                      disabled={savingAbout}
                      maxLength={139}
                      rows={2}
                      placeholder="Add about status"
                      className="w-full bg-transparent text-sm text-[#111b21] dark:text-[#e9edef] outline-none resize-none leading-relaxed"
                    />
                    <div className="flex items-center gap-1 flex-shrink-0 pb-1">
                      <span className="text-xs text-[#8696a0] font-mono select-none">
                        {139 - aboutInput.length}
                      </span>
                      <button
                        type="button"
                        onClick={handleCancelEditAbout}
                        disabled={savingAbout}
                        className="p-1.5 rounded-full text-[#8696a0] hover:text-red-400 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                        title="Cancel"
                      >
                        <FaTimes className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveAbout}
                        disabled={savingAbout}
                        className="p-1.5 rounded-full text-[#00a884] hover:text-[#02906f] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                        title="Save about"
                      >
                        {savingAbout ? (
                          <FaCircleNotch className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <FaCheck className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-[#8696a0]">
                    Press <kbd className="px-1 py-0.5 rounded bg-black/5 dark:bg-white/10 font-mono text-[10px]">Enter</kbd> to save, <kbd className="px-1 py-0.5 rounded bg-black/5 dark:bg-white/10 font-mono text-[10px]">Esc</kbd> to cancel
                  </p>
                </div>
              )}
            </div>

            <div className="bg-[#f0f2f5] dark:bg-[#202c33] p-4 rounded-xl shadow-sm space-y-3 transition-colors">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#008069] dark:text-[#00a884] block">
                Contact details
              </span>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#00a884]/10 text-[#00a884] flex items-center justify-center flex-shrink-0">
                  <FaPhoneAlt className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[#8696a0]">Phone number</p>
                  <p className="text-sm font-mono font-medium text-[#111b21] dark:text-[#e9edef] truncate">
                    {user?.phoneNumber
                      ? `${user?.phoneSuffix ? user.phoneSuffix + " " : ""}${user.phoneNumber}`
                      : "Not linked"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2 border-t border-[#e9edef]/60 dark:border-[#222e35]/60">
                <div className="w-8 h-8 rounded-full bg-[#00a884]/10 text-[#00a884] flex items-center justify-center flex-shrink-0">
                  <FaEnvelope className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[#8696a0]">Email address</p>
                  <p className="text-sm font-medium text-[#111b21] dark:text-[#e9edef] truncate">
                    {user?.email || "Not linked"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default HomePage;
