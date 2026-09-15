import { create } from "zustand";
import { persist } from "zustand/middleware";

const useLayoutStore = create(
  persist(
    (set) => ({
      activeTab: "chats",
      selectedContact: null,
      showThemeModal: false,
      showStatusModal: false,
      statusPreviewData: null,

      setActiveTab: (tab) => set({ activeTab: tab }),
      setSelectedContact: (contact) => set({ selectedContact: contact }),
      clearSelectedContact: () => set({ selectedContact: null }),
      setShowThemeModal: (show) => set({ showThemeModal: show }),
      setShowStatusModal: (show) => set({ showStatusModal: show }),
      setStatusPreviewData: (data) => set({ statusPreviewData: data }),
    }),
    {
      name: "layout-storage",
      partialize: (state) => ({
        activeTab: state.activeTab,
        selectedContact: state.selectedContact,
      }),
    }
  )
);

export default useLayoutStore;
