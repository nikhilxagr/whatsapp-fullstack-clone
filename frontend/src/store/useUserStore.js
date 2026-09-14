import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useUserStore = create(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      allUsers: [],
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setAllUsers: (allUsers) => set({ allUsers }),
      clearUser: () => set({ user: null, isAuthenticated: false }),
    }),
    {
      name: 'user-storage',
    }
  )
);

export default useUserStore;
