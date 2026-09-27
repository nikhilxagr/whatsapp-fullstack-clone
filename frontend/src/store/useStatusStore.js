import { create } from "zustand";
import {
  getStatuses,
  getMyStatuses,
  createStatus as apiCreateStatus,
  viewStatus as apiViewStatus,
  deleteStatus as apiDeleteStatus,
} from "../services/statusService";
import useUserStore from "./useUserStore";
import { toast } from "react-toastify";

const useStatusStore = create((set, get) => ({
  statuses: [],
  myStatuses: [],
  isLoading: false,
  isUploading: false,

  activeGroup: null,
  activeStoryIndex: 0,

  isUploadModalOpen: false,
  uploadModalType: "media",

  fetchStatuses: async () => {
    try {
      set({ isLoading: true });
      const res = await getStatuses();
      const currentUserId = useUserStore.getState().user?._id;

      const filtered = (res.data || []).filter(
        (group) => group.user?._id?.toString() !== currentUserId?.toString()
      );
      set({ statuses: filtered, isLoading: false });
    } catch (err) {
      console.error("fetchStatuses error:", err);
      set({ isLoading: false });
    }
  },

  fetchMyStatus: async () => {
    try {
      const res = await getMyStatuses();
      set({ myStatuses: res.data || [] });
    } catch (err) {
      console.error("fetchMyStatus error:", err);
    }
  },

  fetchAllStatusData: async () => {
    const { fetchStatuses, fetchMyStatus } = get();
    await Promise.all([fetchStatuses(), fetchMyStatus()]);
  },

  uploadStatus: async (formData) => {
    try {
      set({ isUploading: true });
      const res = await apiCreateStatus(formData);
      if (res.data) {
        set((state) => ({
          myStatuses: [res.data, ...state.myStatuses],
          isUploading: false,
          isUploadModalOpen: false,
        }));
        toast.success("Status added successfully!");
      }
      return res.data;
    } catch (err) {
      console.error("uploadStatus error:", err);
      set({ isUploading: false });
      toast.error(err.response?.data?.message || "Failed to upload status.");
      throw err;
    }
  },

  markStatusAsViewed: async (statusId) => {
    const currentUserId = useUserStore.getState().user?._id;
    if (!statusId || !currentUserId) return;

    set((state) => {
      const updatedStatuses = state.statuses.map((group) => ({
        ...group,
        statuses: group.statuses.map((s) => {
          if (s._id === statusId) {
            const alreadyIn = s.viewers?.some(
              (v) => (v._id || v)?.toString() === currentUserId.toString()
            );
            if (!alreadyIn) {
              return {
                ...s,
                viewers: [...(s.viewers || []), currentUserId],
              };
            }
          }
          return s;
        }),
      }));
      return { statuses: updatedStatuses };
    });

    try {
      await apiViewStatus(statusId);
    } catch (err) {
      console.warn("markStatusAsViewed error:", err.message);
    }
  },

  deleteStatus: async (statusId) => {
    try {
      await apiDeleteStatus(statusId);
      set((state) => {
        const nextMyStatuses = state.myStatuses.filter((s) => s._id !== statusId);

        let nextActiveGroup = state.activeGroup;
        let nextIndex = state.activeStoryIndex;

        if (state.activeGroup?.user?._id === useUserStore.getState().user?._id) {
          if (nextMyStatuses.length === 0) {
            nextActiveGroup = null;
            nextIndex = 0;
          } else {
            nextActiveGroup = {
              ...state.activeGroup,
              statuses: nextMyStatuses,
            };
            if (nextIndex >= nextMyStatuses.length) {
              nextIndex = nextMyStatuses.length - 1;
            }
          }
        }

        return {
          myStatuses: nextMyStatuses,
          activeGroup: nextActiveGroup,
          activeStoryIndex: nextIndex,
        };
      });
      toast.success("Status deleted.");
    } catch (err) {
      console.error("deleteStatus error:", err);
      toast.error("Failed to delete status.");
    }
  },

  openViewer: (group, initialIndex = 0) => {
    if (!group || !group.statuses || group.statuses.length === 0) return;
    set({
      activeGroup: group,
      activeStoryIndex: Math.max(0, Math.min(initialIndex, group.statuses.length - 1)),
    });
  },

  closeViewer: () => {
    set({ activeGroup: null, activeStoryIndex: 0 });
  },

  setStoryIndex: (index) => {
    const { activeGroup } = get();
    if (!activeGroup) return;
    const maxIdx = activeGroup.statuses.length - 1;
    set({ activeStoryIndex: Math.max(0, Math.min(index, maxIdx)) });
  },

  nextStory: () => {
    const { activeGroup, activeStoryIndex, statuses, openViewer, closeViewer } = get();
    if (!activeGroup) return;

    if (activeStoryIndex < activeGroup.statuses.length - 1) {
      set({ activeStoryIndex: activeStoryIndex + 1 });
    } else {
      const currentUserId = useUserStore.getState().user?._id;
      const isMyStatus = activeGroup.user?._id?.toString() === currentUserId?.toString();

      if (isMyStatus) {
        if (statuses.length > 0) {
          openViewer(statuses[0], 0);
        } else {
          closeViewer();
        }
      } else {
        const currentGroupIdx = statuses.findIndex(
          (g) => g.user?._id?.toString() === activeGroup.user?._id?.toString()
        );
        if (currentGroupIdx !== -1 && currentGroupIdx < statuses.length - 1) {
          openViewer(statuses[currentGroupIdx + 1], 0);
        } else {
          closeViewer();
        }
      }
    }
  },

  prevStory: () => {
    const { activeGroup, activeStoryIndex, statuses, openViewer } = get();
    if (!activeGroup) return;

    if (activeStoryIndex > 0) {
      set({ activeStoryIndex: activeStoryIndex - 1 });
    } else {
      const currentUserId = useUserStore.getState().user?._id;
      const isMyStatus = activeGroup.user?._id?.toString() === currentUserId?.toString();

      if (!isMyStatus) {
        const currentGroupIdx = statuses.findIndex(
          (g) => g.user?._id?.toString() === activeGroup.user?._id?.toString()
        );
        if (currentGroupIdx > 0) {
          const prevGroup = statuses[currentGroupIdx - 1];
          openViewer(prevGroup, prevGroup.statuses.length - 1);
        }
      }
    }
  },

  openUploadModal: (type = "media") => {
    set({ isUploadModalOpen: true, uploadModalType: type });
  },

  closeUploadModal: () => {
    set({ isUploadModalOpen: false });
  },

  onNewStatus: (newStatus) => {
    const currentUserId = useUserStore.getState().user?._id;
    if (!newStatus || !newStatus.user) return;

    const statusOwnerId = (newStatus.user?._id || newStatus.user)?.toString();

    if (statusOwnerId === currentUserId?.toString()) {
      set((state) => {
        const exists = state.myStatuses.some((s) => s._id === newStatus._id);
        if (exists) return state;
        return { myStatuses: [newStatus, ...state.myStatuses] };
      });
      return;
    }

    set((state) => {
      const groupIdx = state.statuses.findIndex(
        (g) => g.user?._id?.toString() === statusOwnerId
      );

      if (groupIdx !== -1) {
        const updated = [...state.statuses];
        const group = updated[groupIdx];
        const statusExists = group.statuses.some((s) => s._id === newStatus._id);
        if (!statusExists) {
          updated[groupIdx] = {
            ...group,
            statuses: [newStatus, ...group.statuses],
          };
        }
        return { statuses: updated };
      } else {
        return {
          statuses: [
            {
              user: newStatus.user,
              statuses: [newStatus],
            },
            ...state.statuses,
          ],
        };
      }
    });
  },

  onStatusViewed: ({ statusId, viewer, totalViewers, viewers }) => {
    set((state) => ({
      myStatuses: state.myStatuses.map((s) => {
        if (s._id === statusId) {
          return {
            ...s,
            viewers: viewers || [...(s.viewers || []), viewer],
          };
        }
        return s;
      }),
    }));
  },

  onStatusDeleted: ({ statusId }) => {
    set((state) => {
      const updatedStatuses = state.statuses
        .map((group) => ({
          ...group,
          statuses: group.statuses.filter((s) => s._id !== statusId),
        }))
        .filter((group) => group.statuses.length > 0);

      const updatedMyStatuses = state.myStatuses.filter((s) => s._id !== statusId);

      return {
        statuses: updatedStatuses,
        myStatuses: updatedMyStatuses,
      };
    });
  },
}));

export default useStatusStore;
