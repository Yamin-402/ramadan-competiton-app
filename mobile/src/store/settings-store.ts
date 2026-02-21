import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createStorage } from "../utils/web-storage";

export type ThemePreference = "system" | "light" | "dark";
export type TasksDesignVariant = "classic" | "ramadan_modern" | "modern";
export type AppLanguage = "en" | "ar";

interface SettingsState {
  themePreference: ThemePreference;
  tasksDesignVariant: TasksDesignVariant;
  appLanguage: AppLanguage;
  hydrated: boolean;
  setThemePreference: (preference: ThemePreference) => void;
  setTasksDesignVariant: (variant: TasksDesignVariant) => void;
  setAppLanguage: (language: AppLanguage) => void;
  setHydrated: (value: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      themePreference: "system",
      tasksDesignVariant: "classic",
      appLanguage: "en",
      hydrated: false,
      setThemePreference: (themePreference) => {
        set({ themePreference });
      },
      setTasksDesignVariant: (tasksDesignVariant) => {
        set({ tasksDesignVariant });
      },
      setAppLanguage: (appLanguage) => {
        set({ appLanguage });
      },
      setHydrated: (value) => {
        set({ hydrated: value });
      },
    }),
    {
      name: "ramadan-settings",
      storage: createJSONStorage(() => createStorage()),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);
