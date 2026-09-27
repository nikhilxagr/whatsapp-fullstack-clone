import React, { useEffect, useState } from "react";
import {
  FaArrowLeft,
  FaPlus,
  FaCamera,
  FaPen,
  FaChevronDown,
  FaChevronUp,
  FaCircleNotch,
} from "react-icons/fa";
import useStatusStore from "../../store/useStatusStore";
import useUserStore from "../../store/useUserStore";
import StatusRing from "./StatusRing";
import { getAvatarUrl } from "../../utils/avatarUtil";
import formatTimestamp from "../../utils/formatTime";

const StatusSection = ({ onBack }) => {
  const { user: currentUser } = useUserStore();
  const {
    statuses,
    myStatuses,
    isLoading,
    fetchAllStatusData,
    openViewer,
    openUploadModal,
  } = useStatusStore();

  const [showViewedList, setShowViewedList] = useState(true);

  useEffect(() => {
    fetchAllStatusData();
  }, [fetchAllStatusData]);

  const currentUserId = currentUser?._id?.toString();

  const recentGroups = [];
  const viewedGroups = [];

  statuses.forEach((group) => {
    if (!group.statuses || group.statuses.length === 0) return;

    const hasUnviewed = group.statuses.some((status) => {
      const isViewed = status.viewers?.some(
        (v) => (v._id || v)?.toString() === currentUserId
      );
      return !isViewed;
    });

    if (hasUnviewed) {
      recentGroups.push(group);
    } else {
      viewedGroups.push(group);
    }
  });

  const hasMyStatuses = myStatuses && myStatuses.length > 0;
  const myLatestStatus = hasMyStatuses ? myStatuses[0] : null;

  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    return formatTimestamp(dateStr);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#111b21] border-r border-[#e9edef] dark:border-[#222e35] relative">
      <div className="h-16 px-4 bg-[#008069] dark:bg-[#202c33] text-white flex items-center justify-between flex-shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
            title="Back to chats"
          >
            <FaArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-base font-semibold">Status</h1>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => openUploadModal("text")}
            className="p-2 rounded-full hover:bg-white/10 text-white/90 hover:text-white transition-colors"
            title="Text Status"
          >
            <FaPen className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => openUploadModal("media")}
            className="p-2 rounded-full hover:bg-white/10 text-white/90 hover:text-white transition-colors"
            title="Add Media Status"
          >
            <FaCamera className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        <div className="flex items-center justify-between p-2 rounded-xl hover:bg-[#f0f2f5] dark:hover:bg-[#202c33] transition-colors group">
          <div
            onClick={() => {
              if (hasMyStatuses) {
                openViewer({ user: currentUser, statuses: myStatuses }, 0);
              } else {
                openUploadModal("media");
              }
            }}
            className="flex items-center gap-3.5 flex-1 cursor-pointer"
          >
            <div className="relative">
              {hasMyStatuses ? (
                <StatusRing
                  totalSegments={myStatuses.length}
                  unviewedSegments={myStatuses.length}
                  size={52}
                >
                  <img
                    src={getAvatarUrl(currentUser, currentUser?.username)}
                    alt="My Status"
                    className="w-10 h-10 rounded-full object-cover"
                  />
                </StatusRing>
              ) : (
                <div className="relative">
                  <img
                    src={getAvatarUrl(currentUser, currentUser?.username)}
                    alt="My Status"
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-[#00a884] text-white flex items-center justify-center text-[10px] font-bold border-2 border-white dark:border-[#111b21] shadow">
                    <FaPlus className="w-2 h-2" />
                  </span>
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-[#111b21] dark:text-[#e9edef] truncate">
                My status
              </h3>
              <p className="text-xs text-[#8696a0] truncate mt-0.5">
                {hasMyStatuses
                  ? formatTime(myLatestStatus?.createdAt)
                  : "Tap to add status update"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => openUploadModal("text")}
              className="p-2 rounded-full text-[#54656f] dark:text-[#aebac1] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              title="Add text status"
            >
              <FaPen className="w-3.5 h-3.5 text-[#00a884]" />
            </button>
            <button
              onClick={() => openUploadModal("media")}
              className="p-2 rounded-full text-[#54656f] dark:text-[#aebac1] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              title="Add photo/video status"
            >
              <FaCamera className="w-3.5 h-3.5 text-[#00a884]" />
            </button>
          </div>
        </div>

        {isLoading && (
          <div className="flex justify-center py-6 text-[#00a884]">
            <FaCircleNotch className="w-6 h-6 animate-spin" />
          </div>
        )}

        {recentGroups.length > 0 && (
          <div className="pt-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#008069] dark:text-[#00a884] px-2 block mb-2">
              Recent updates ({recentGroups.length})
            </span>
            <div className="space-y-1">
              {recentGroups.map((group) => {
                const unviewedCount = group.statuses.filter((s) => {
                  return !s.viewers?.some(
                    (v) => (v._id || v)?.toString() === currentUserId
                  );
                }).length;

                const latestTime = group.statuses[0]?.createdAt;

                return (
                  <div
                    key={group.user?._id}
                    onClick={() => openViewer(group, 0)}
                    className="flex items-center gap-3.5 p-2 rounded-xl cursor-pointer hover:bg-[#f0f2f5] dark:hover:bg-[#202c33] transition-colors"
                  >
                    <StatusRing
                      totalSegments={group.statuses.length}
                      unviewedSegments={unviewedCount}
                      size={52}
                    >
                      <img
                        src={getAvatarUrl(group.user, group.user?.username)}
                        alt={group.user?.username}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    </StatusRing>

                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-[#111b21] dark:text-[#e9edef] truncate">
                        {group.user?.username || "Contact"}
                      </h4>
                      <p className="text-xs text-[#8696a0] truncate mt-0.5">
                        {formatTime(latestTime)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {viewedGroups.length > 0 && (
          <div className="pt-2 border-t border-[#e9edef] dark:border-[#222e35]">
            <button
              onClick={() => setShowViewedList(!showViewedList)}
              className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#8696a0] hover:text-[#111b21] dark:hover:text-[#e9edef] transition-colors"
            >
              <span>Viewed updates ({viewedGroups.length})</span>
              {showViewedList ? (
                <FaChevronUp className="w-3 h-3" />
              ) : (
                <FaChevronDown className="w-3 h-3" />
              )}
            </button>

            {showViewedList && (
              <div className="space-y-1 mt-1">
                {viewedGroups.map((group) => {
                  const latestTime = group.statuses[0]?.createdAt;

                  return (
                    <div
                      key={group.user?._id}
                      onClick={() => openViewer(group, 0)}
                      className="flex items-center gap-3.5 p-2 rounded-xl cursor-pointer hover:bg-[#f0f2f5] dark:hover:bg-[#202c33] transition-colors opacity-80 hover:opacity-100"
                    >
                      <StatusRing
                        totalSegments={group.statuses.length}
                        unviewedSegments={0}
                        size={52}
                      >
                        <img
                          src={getAvatarUrl(group.user, group.user?.username)}
                          alt={group.user?.username}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      </StatusRing>

                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-[#111b21] dark:text-[#e9edef] truncate">
                          {group.user?.username || "Contact"}
                        </h4>
                        <p className="text-xs text-[#8696a0] truncate mt-0.5">
                          {formatTime(latestTime)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {!isLoading && recentGroups.length === 0 && viewedGroups.length === 0 && (
          <div className="text-center py-12 px-4 text-[#8696a0]">
            <div className="w-16 h-16 rounded-full bg-[#f0f2f5] dark:bg-[#202c33] flex items-center justify-center mx-auto mb-3 text-[#00a884]">
              <FaCamera className="w-7 h-7 opacity-50" />
            </div>
            <h4 className="text-sm font-semibold text-[#111b21] dark:text-[#e9edef] mb-1">
              No recent updates
            </h4>
            <p className="text-xs max-w-xs mx-auto leading-relaxed">
              When your contacts share status updates, they will appear here. Tap the camera to share yours!
            </p>
          </div>
        )}
      </div>

      <div className="absolute bottom-5 right-5 flex flex-col items-center gap-3 z-20">
        <button
          onClick={() => openUploadModal("text")}
          className="w-10 h-10 rounded-full bg-[#f0f2f5] dark:bg-[#202c33] hover:bg-[#e9edef] dark:hover:bg-[#2a3942] text-[#54656f] dark:text-[#aebac1] flex items-center justify-center shadow-lg transition-all hover:scale-110 active:scale-95"
          title="Type text status"
        >
          <FaPen className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => openUploadModal("media")}
          className="w-13 h-13 rounded-full bg-[#00a884] hover:bg-[#029070] text-white flex items-center justify-center shadow-xl transition-all hover:scale-110 active:scale-95"
          title="Add photo/video status"
        >
          <FaCamera className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default StatusSection;
