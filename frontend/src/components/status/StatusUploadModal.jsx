import React, { useState, useRef } from "react";
import {
  FaTimes,
  FaImage,
  FaFont,
  FaPalette,
  FaPaperPlane,
  FaSmile,
  FaSpinner,
  FaTrash,
} from "react-icons/fa";
import useStatusStore from "../../store/useStatusStore";

const QUICK_EMOJIS = ["❤️", "😂", "🔥", "😍", "🎉", "👏", "✨", "🙏", "💯", "😊", "😎", "🥳"];

const BG_COLORS = [
  "#00a884",
  "#128c7e",
  "#7027b4",
  "#e91e63",
  "#d35400",
  "#2c3e50",
  "#16a085",
  "#8e44ad",
  "#c0392b",
];

const StatusUploadModal = () => {
  const { isUploadModalOpen, uploadModalType, isUploading, closeUploadModal, uploadStatus } =
    useStatusStore();

  const [activeTab, setActiveTab] = useState(uploadModalType || "media");
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [fileType, setFileType] = useState(null);
  const [caption, setCaption] = useState("");
  const [textContent, setTextContent] = useState("");
  const [selectedBgIndex, setSelectedBgIndex] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const fileInputRef = useRef(null);

  if (!isUploadModalOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVid = file.mimetype?.startsWith("video") || file.type?.startsWith("video");
    const isImg = file.mimetype?.startsWith("image") || file.type?.startsWith("image");

    if (!isVid && !isImg) {
      alert("Please select an image or video file.");
      return;
    }

    setSelectedFile(file);
    setFileType(isVid ? "video" : "image");
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleClearFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    setFileType(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const cycleBgColor = () => {
    setSelectedBgIndex((prev) => (prev + 1) % BG_COLORS.length);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isUploading) return;

    const formData = new FormData();

    if (activeTab === "media") {
      if (!selectedFile) {
        alert("Please select an image or video to share.");
        return;
      }
      formData.append("media", selectedFile);
      formData.append("file", selectedFile);
      formData.append("caption", caption.trim());
      formData.append("contentType", fileType);
      formData.append("content", caption.trim() || fileType);
    } else {
      if (!textContent.trim()) {
        alert("Please type something for your status.");
        return;
      }
      formData.append("content", textContent.trim());
      formData.append("contentType", "text");
      formData.append("backgroundColor", BG_COLORS[selectedBgIndex]);
    }

    try {
      await uploadStatus(formData);
      handleClearFile();
      setCaption("");
      setTextContent("");
    } catch {
      // Error handled in store
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white dark:bg-[#202c33] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e9edef] dark:border-[#313d45]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("media")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                activeTab === "media"
                  ? "bg-[#00a884] text-white shadow"
                  : "text-[#54656f] dark:text-[#aebac1] hover:bg-black/5 dark:hover:bg-white/5"
              }`}
            >
              <FaImage className="w-3.5 h-3.5" />
              Photo / Video
            </button>
            <button
              onClick={() => setActiveTab("text")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                activeTab === "text"
                  ? "bg-[#00a884] text-white shadow"
                  : "text-[#54656f] dark:text-[#aebac1] hover:bg-black/5 dark:hover:bg-white/5"
              }`}
            >
              <FaFont className="w-3.5 h-3.5" />
              Text Status
            </button>
          </div>

          <button
            onClick={() => {
              handleClearFile();
              closeUploadModal();
            }}
            className="p-2 rounded-full text-[#54656f] dark:text-[#aebac1] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            title="Close"
          >
            <FaTimes className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === "media" ? (
            <div className="flex flex-col gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileChange}
                className="hidden"
              />

              {!selectedFile ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center p-10 border-2 border-dashed border-[#d1d7db] dark:border-[#374248] rounded-2xl hover:border-[#00a884] dark:hover:border-[#00a884] transition-all cursor-pointer group bg-[#f0f2f5] dark:bg-[#111b21]"
                >
                  <div className="w-16 h-16 rounded-full bg-[#00a884]/10 text-[#00a884] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <FaImage className="w-7 h-7" />
                  </div>
                  <p className="text-sm font-semibold text-[#111b21] dark:text-[#e9edef]">
                    Click to choose photo or video
                  </p>
                  <p className="text-xs text-[#8696a0] mt-1">
                    Supports JPG, PNG, GIF, MP4 (up to 50MB)
                  </p>
                </div>
              ) : (
                <div className="relative rounded-2xl overflow-hidden bg-black flex items-center justify-center max-h-[380px]">
                  {fileType === "video" ? (
                    <video
                      src={previewUrl}
                      controls
                      className="max-h-[360px] w-auto mx-auto object-contain"
                    />
                  ) : (
                    <img
                      src={previewUrl}
                      alt="Status Preview"
                      className="max-h-[360px] w-auto mx-auto object-contain"
                    />
                  )}
                  <button
                    onClick={handleClearFile}
                    className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-all shadow-md"
                    title="Remove media"
                  >
                    <FaTrash className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {selectedFile && (
                <div className="relative flex items-center gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-2 text-[#54656f] dark:text-[#aebac1] hover:text-[#00a884] transition-colors"
                    title="Add emoji"
                  >
                    <FaSmile className="w-5 h-5" />
                  </button>

                  <input
                    type="text"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Add a caption..."
                    className="flex-1 px-4 py-2.5 bg-[#f0f2f5] dark:bg-[#111b21] text-[#111b21] dark:text-[#e9edef] rounded-xl text-sm outline-none focus:ring-1 focus:ring-[#00a884]"
                    maxLength={200}
                  />

                  {showEmojiPicker && (
                    <div className="absolute bottom-12 left-0 z-50 bg-white dark:bg-[#202c33] p-2 rounded-2xl shadow-xl border border-[#e9edef] dark:border-[#313d45] flex items-center gap-1.5 flex-wrap max-w-xs animate-scale-up">
                      {QUICK_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => {
                            setCaption((prev) => prev + emoji);
                            setShowEmojiPicker(false);
                          }}
                          className="w-8 h-8 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center text-lg transition-transform hover:scale-125"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#8696a0] font-medium">
                  Tap palette to switch background color
                </span>
                <button
                  type="button"
                  onClick={cycleBgColor}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#f0f2f5] dark:bg-[#111b21] text-xs font-semibold text-[#111b21] dark:text-[#e9edef] hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                >
                  <FaPalette className="w-3.5 h-3.5 text-[#00a884]" />
                  Color
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-white shadow-sm ml-1"
                    style={{ backgroundColor: BG_COLORS[selectedBgIndex] }}
                  />
                </button>
              </div>

              <div
                className="relative rounded-2xl p-6 min-h-[260px] flex items-center justify-center transition-colors duration-300 shadow-inner"
                style={{ backgroundColor: BG_COLORS[selectedBgIndex] }}
              >
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Type a status..."
                  rows={4}
                  maxLength={500}
                  className="w-full bg-transparent text-white text-center font-bold text-xl md:text-2xl placeholder-white/60 resize-none outline-none drop-shadow-md"
                  autoFocus
                />
              </div>

              <div className="text-right text-xs text-[#8696a0]">
                {textContent.length}/500
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-5 py-4 border-t border-[#e9edef] dark:border-[#313d45] bg-[#f0f2f5] dark:bg-[#111b21]">
          <span className="text-xs text-[#8696a0]">
            Disappears automatically after 24 hours
          </span>

          <button
            onClick={handleSubmit}
            disabled={isUploading || (activeTab === "media" && !selectedFile) || (activeTab === "text" && !textContent.trim())}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#00a884] hover:bg-[#029070] text-white text-sm font-semibold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
          >
            {isUploading ? (
              <>
                <FaSpinner className="w-4 h-4 animate-spin" />
                Sharing...
              </>
            ) : (
              <>
                <FaPaperPlane className="w-3.5 h-3.5" />
                Share Status
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatusUploadModal;
