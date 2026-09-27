import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
  FaEye,
  FaTrash,
  FaPause,
  FaPlay,
} from "react-icons/fa";
import useStatusStore from "../../store/useStatusStore";
import useUserStore from "../../store/useUserStore";
import { getAvatarUrl } from "../../utils/avatarUtil";
import formatTimestamp from "../../utils/formatTime";

const STORY_DURATION = 5000;

const StatusViewer = () => {
  const {
    activeGroup,
    activeStoryIndex,
    nextStory,
    prevStory,
    closeViewer,
    markStatusAsViewed,
    deleteStatus,
  } = useStatusStore();

  const { user: currentUser } = useUserStore();

  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showViewersSheet, setShowViewersSheet] = useState(false);

  const videoRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const holdTimeoutRef = useRef(null);

  const currentStatus = activeGroup?.statuses?.[activeStoryIndex];
  const isMyStatus =
    activeGroup?.user?._id?.toString() === currentUser?._id?.toString();

  useEffect(() => {
    if (currentStatus?._id && !isMyStatus) {
      markStatusAsViewed(currentStatus._id);
    }
  }, [currentStatus?._id, isMyStatus]);

  const clearTimer = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    const intervalTime = 50;
    const step = 100 / (STORY_DURATION / intervalTime);

    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearTimer();
          nextStory();
          return 0;
        }
        return prev + step;
      });
    }, intervalTime);
  }, [clearTimer, nextStory]);

  useEffect(() => {
    setProgress(0);
    if (!isPaused && !showViewersSheet) {
      startTimer();
    }
    return clearTimer;
  }, [activeStoryIndex, activeGroup?.user?._id, isPaused, showViewersSheet, startTimer, clearTimer]);

  const handleVideoLoaded = () => {
    if (videoRef.current) {
      const duration = videoRef.current.duration * 1000;
      clearTimer();
      const intervalTime = 50;
      const step = 100 / (duration / intervalTime);

      progressIntervalRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearTimer();
            nextStory();
            return 0;
          }
          return prev + step;
        });
      }, intervalTime);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!activeGroup) return;
      if (e.key === "Escape") closeViewer();
      if (e.key === "ArrowRight") nextStory();
      if (e.key === "ArrowLeft") prevStory();
      if (e.key === " ") setIsPaused((p) => !p);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeGroup, nextStory, prevStory, closeViewer]);

  const handlePointerDown = () => {
    holdTimeoutRef.current = setTimeout(() => {
      setIsPaused(true);
      clearTimer();
      if (videoRef.current) videoRef.current.pause();
    }, 200);
  };

  const handlePointerUp = () => {
    if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current);
    if (isPaused) {
      setIsPaused(false);
      startTimer();
      if (videoRef.current) videoRef.current.play().catch(() => {});
    }
  };

  const handleContainerClick = (e) => {
    if (e.target.closest("button") || e.target.closest(".controls-bar")) return;

    const { clientX, currentTarget } = e;
    const { left, width } = currentTarget.getBoundingClientRect();
    const clickX = clientX - left;

    if (clickX < width * 0.35) {
      prevStory();
    } else {
      nextStory();
    }
  };

  if (!activeGroup || !currentStatus) return null;

  const userAvatar = getAvatarUrl(activeGroup.user, activeGroup.user?.username);

  const formatStoryTime = (createdAt) => {
    if (!createdAt) return "";
    return formatTimestamp(createdAt);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center select-none backdrop-blur-md animate-fade-in">
      <button
        onClick={prevStory}
        className="hidden md:flex absolute left-8 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all hover:scale-110 active:scale-95 shadow-xl"
        title="Previous"
      >
        <FaChevronLeft className="w-5 h-5" />
      </button>

      <button
        onClick={nextStory}
        className="hidden md:flex absolute right-8 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all hover:scale-110 active:scale-95 shadow-xl"
        title="Next"
      >
        <FaChevronRight className="w-5 h-5" />
      </button>

      <div
        className="relative w-full max-w-md h-full md:h-[90vh] md:rounded-3xl overflow-hidden bg-[#111b21] flex flex-col justify-between shadow-2xl"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onClick={handleContainerClick}
      >
        <div className="absolute top-0 left-0 right-0 z-30 p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
          <div className="flex items-center gap-1.5 mb-3">
            {activeGroup.statuses.map((_, idx) => {
              let fillPercent = 0;
              if (idx < activeStoryIndex) fillPercent = 100;
              else if (idx === activeStoryIndex) fillPercent = progress;

              return (
                <div
                  key={idx}
                  className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden"
                >
                  <div
                    className="h-full bg-white transition-all duration-75 rounded-full"
                    style={{ width: `${fillPercent}%` }}
                  />
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-white controls-bar">
            <div className="flex items-center gap-3">
              <img
                src={userAvatar}
                alt={activeGroup.user?.username}
                className="w-10 h-10 rounded-full object-cover border-2 border-white/50"
              />
              <div>
                <h3 className="text-sm font-semibold leading-tight">
                  {isMyStatus ? "My status" : activeGroup.user?.username}
                </h3>
                <span className="text-[11px] text-white/70">
                  {formatStoryTime(currentStatus.createdAt)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPaused(!isPaused);
                }}
                className="p-2 rounded-full hover:bg-white/10 text-white/80 transition-colors"
                title={isPaused ? "Play" : "Pause"}
              >
                {isPaused ? (
                  <FaPlay className="w-3.5 h-3.5" />
                ) : (
                  <FaPause className="w-3.5 h-3.5" />
                )}
              </button>

              {isMyStatus && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm("Delete this status update?")) {
                      deleteStatus(currentStatus._id);
                    }
                  }}
                  className="p-2 rounded-full hover:bg-white/10 text-red-400 hover:text-red-300 transition-colors"
                  title="Delete this status"
                >
                  <FaTrash className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeViewer();
                }}
                className="p-2 rounded-full hover:bg-white/10 text-white transition-colors"
                title="Close"
              >
                <FaTimes className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center overflow-hidden relative">
          {currentStatus.contentType === "video" ? (
            <video
              ref={videoRef}
              src={currentStatus.content}
              autoPlay
              playsInline
              onLoadedMetadata={handleVideoLoaded}
              className="w-full h-full object-contain"
            />
          ) : currentStatus.contentType === "image" ? (
            <img
              src={currentStatus.content}
              alt="Status"
              className="w-full h-full object-contain"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center p-8 text-center transition-colors duration-500"
              style={{
                backgroundColor: currentStatus.backgroundColor || "#00a884",
              }}
            >
              <p className="text-white text-2xl md:text-3xl font-bold leading-relaxed break-words max-w-sm drop-shadow-md select-text">
                {currentStatus.content}
              </p>
            </div>
          )}

          {currentStatus.caption && (
            <div className="absolute bottom-16 left-4 right-4 z-20 pointer-events-none">
              <div className="bg-black/60 backdrop-blur-md text-white text-sm px-4 py-2 rounded-2xl text-center shadow-lg border border-white/10 max-w-md mx-auto">
                {currentStatus.caption}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 z-30 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex justify-center controls-bar">
          {isMyStatus ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowViewersSheet(true);
                setIsPaused(true);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white text-xs font-semibold shadow-lg transition-all hover:scale-105 active:scale-95"
            >
              <FaEye className="w-4 h-4 text-[#00a884]" />
              {currentStatus.viewers?.length || 0} views
            </button>
          ) : (
            <div className="text-white/60 text-xs text-center">
              Tap left or right to navigate
            </div>
          )}
        </div>

        {showViewersSheet && isMyStatus && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-x-0 bottom-0 max-h-[60%] bg-[#202c33] rounded-t-3xl shadow-2xl z-40 flex flex-col p-5 animate-slide-up border-t border-[#313d45]"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#313d45]">
              <div className="flex items-center gap-2">
                <FaEye className="w-4 h-4 text-[#00a884]" />
                <h4 className="text-sm font-semibold text-white">
                  Viewed by {currentStatus.viewers?.length || 0}
                </h4>
              </div>
              <button
                onClick={() => {
                  setShowViewersSheet(false);
                  setIsPaused(false);
                }}
                className="p-1 rounded-full text-white/70 hover:bg-white/10"
              >
                <FaTimes className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-[#313d45] mt-2">
              {currentStatus.viewers && currentStatus.viewers.length > 0 ? (
                currentStatus.viewers.map((viewer, idx) => {
                  const vUser = typeof viewer === "object" ? viewer : null;
                  const vName = vUser?.username || "Contact";
                  const vAvatar = getAvatarUrl(vUser, vName);

                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-3"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={vAvatar}
                          alt={vName}
                          className="w-9 h-9 rounded-full object-cover"
                        />
                        <span className="text-sm font-medium text-white">
                          {vName}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-white/50 text-xs">
                  No views yet
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatusViewer;
