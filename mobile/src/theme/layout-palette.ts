import { TasksDesignVariant } from "../store/settings-store";
import { AppColors } from "./colors";

export interface LayoutPalette {
  topNavBackground: string;
  topNavText: string;
  bottomNavBackground: string;
  bottomNavBorder: string;
  tabActive: string;
  tabInactive: string;
}

export function getLayoutPalette(
  variant: TasksDesignVariant,
  colors: AppColors,
  mode: "light" | "dark"
): LayoutPalette {
  if (variant === "ramadan_modern") {
    return {
      topNavBackground: mode === "dark" ? "#0d2a1f" : "#114431",
      topNavText: "#d9b96a",
      bottomNavBackground: mode === "dark" ? "#0b241a" : "#103a2b",
      bottomNavBorder: mode === "dark" ? "#2c4f40" : "#2a573f",
      tabActive: "#d9b96a",
      tabInactive: mode === "dark" ? "#88a595" : "#89a08f",
    };
  }

  if (variant === "ramadan_nights") {
    return {
      topNavBackground: mode === "dark" ? "#120c2a" : "#1e1642",
      topNavText: "#dfd0ff",
      bottomNavBackground: mode === "dark" ? "#0f0924" : "#17103a",
      bottomNavBorder: mode === "dark" ? "#342a63" : "#3c3170",
      tabActive: "#f2c75a",
      tabInactive: mode === "dark" ? "#9d93c9" : "#b5acd9",
    };
  }

  if (variant === "modern") {
    return {
      topNavBackground: mode === "dark" ? "#162232" : "#f6f8fc",
      topNavText: mode === "dark" ? "#d6e4ff" : "#334a6b",
      bottomNavBackground: mode === "dark" ? "#111b29" : "#edf2fb",
      bottomNavBorder: mode === "dark" ? "#2b3e58" : "#d2dced",
      tabActive: mode === "dark" ? "#7eb0ff" : "#2f6bdc",
      tabInactive: mode === "dark" ? "#8296b4" : "#7f92ad",
    };
  }

  return {
    topNavBackground: colors.header,
    topNavText: colors.gold,
    bottomNavBackground: colors.header,
    bottomNavBorder: colors.border,
    tabActive: colors.tabActive,
    tabInactive: colors.tabInactive,
  };
}
