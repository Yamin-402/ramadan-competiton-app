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
  onboardingSeenByUserId: Record<string, boolean>;
  hydrated: boolean;
  setThemePreference: (preference: ThemePreference) => void;
  setTasksDesignVariant: (variant: TasksDesignVariant) => void;
  setAppLanguage: (language: AppLanguage) => void;
  markOnboardingSeen: (userId: number) => void;
  hasSeenOnboarding: (userId: number) => boolean;
  setHydrated: (value: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      themePreference: "system",
      tasksDesignVariant: "classic",
      appLanguage: "en",
      onboardingSeenByUserId: {},
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
      markOnboardingSeen: (userId) => {
        const key = String(userId);
        set((state) => ({
          onboardingSeenByUserId: {
            ...state.onboardingSeenByUserId,
            [key]: true,
          },
        }));
      },
      hasSeenOnboarding: (userId) => {
        const key = String(userId);
        return Boolean(get().onboardingSeenByUserId[key]);
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
