import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useLoginStore = create(
  persist(
    (set) => ({
      step: 1,
      userPhoneData: null,
      setStep: (step) => set({ step }),
      setUserPhoneData: (userPhoneData) => set({ userPhoneData }),
      resetLoginStore: () => set({ step: 1, userPhoneData: null }),
    }),
    {
      name: 'login-storage',
    }
  )
);

export default useLoginStore;