import { create } from "zustand";

// Login store — not persisted (sensitive data like passwords should never sit in localStorage)
const useLoginStore = create((set) => ({
  // 'register' | 'login'
  mode: "login",
  // Step within register flow: 1 = credentials, 2 = OTP, 3 = profile
  step: 1,
  // Holds data to carry between steps (email used, selected country etc.)
  pendingData: null,

  setMode: (mode) => set({ mode, step: 1, pendingData: null }),
  setStep: (step) => set({ step }),
  setPendingData: (data) => set({ pendingData: data }),
  resetLoginState: () => set({ mode: "login", step: 1, pendingData: null }),
}));

export default useLoginStore;