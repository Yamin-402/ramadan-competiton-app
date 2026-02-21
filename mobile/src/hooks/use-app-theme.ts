import { useColorScheme } from "react-native";
import { useMemo } from "react";
import { useSettingsStore } from "../store/settings-store";
import { createAppTheme, ResolvedThemeMode } from "../theme";

export function useAppTheme() {
  const preference = useSettingsStore((state) => state.themePreference);
  const system = useColorScheme();

  const mode: ResolvedThemeMode =
    preference === "system" ? (system === "dark" ? "dark" : "light") : preference;

  return useMemo(() => createAppTheme(mode), [mode]);
}
