import { create } from "zustand";
import { persist } from "zustand/middleware";

const applyThemeToDOM = (theme) => {
  if (typeof document !== "undefined") {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }
};

const useThemeStore = create(
  persist(
    (set, get) => ({
      theme: "light",
      setTheme: (theme) => {
        applyThemeToDOM(theme);
        set({ theme });
      },
      toggleTheme: () => {
        const nextTheme = get().theme === "dark" ? "light" : "dark";
        applyThemeToDOM(nextTheme);
        set({ theme: nextTheme });
      },
    }),
    {
      name: "theme-storage",
      onRehydrateStorage: () => (state) => {
        if (state?.theme) {
          applyThemeToDOM(state.theme);
        }
      },
    }
  )
);

export default useThemeStore;
