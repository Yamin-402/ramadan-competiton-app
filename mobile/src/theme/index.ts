import { Theme } from "@react-navigation/native";
import { AppColors, darkColors, lightColors } from "./colors";

export type ResolvedThemeMode = "light" | "dark";

export interface AppTheme {
  mode: ResolvedThemeMode;
  colors: AppColors;
  navigationTheme: Theme;
}

function buildNavigationTheme(mode: ResolvedThemeMode, colors: AppColors): Theme {
  return {
    dark: mode === "dark",
    colors: {
      primary: colors.gold,
      background: colors.background,
      card: colors.header,
      text: colors.textPrimary,
      border: colors.border,
      notification: colors.danger,
    },
  };
}

export function createAppTheme(mode: ResolvedThemeMode): AppTheme {
  const colors = mode === "dark" ? darkColors : lightColors;

  return {
    mode,
    colors,
    navigationTheme: buildNavigationTheme(mode, colors),
  };
}
