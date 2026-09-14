import { create } from "zustand";
import { persist } from "zustand/middleware";

const useLoginStore = create(
  persist(
    (set) => ({
      step: 1,
      userPhoneData: null,
      setStep: (step) => set({ step }),
      setUserPhoneData: (data) => set({ userPhoneData: data }),
      resetLoginState: () => set({ step: 1, userPhoneData: null }),
    }),
    {
      name: "login-storage",
      partialize: (state) => ({
        step: state.step,
        userPhoneData: state.userPhoneData,
      }),
    }
  )
);

export default useLoginStore;