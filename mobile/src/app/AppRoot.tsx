import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GlobalNotificationOverlay } from "../components/GlobalNotificationOverlay";
import { GlobalAnnouncementPopup } from "../components/GlobalAnnouncementPopup";
import { LoadingBlock } from "../components/LoadingBlock";
import { useAppTheme } from "../hooks/use-app-theme";
import { useI18n } from "../hooks/use-i18n";
import { useSettingsStore } from "../store/settings-store";
import { isRamadanActive } from "../utils/ramadan";
import { RootNavigator } from "./navigation/RootNavigator";
import { navigationRef } from "./navigation/navigationRef";

export function AppRoot() {
  const settingsHydrated = useSettingsStore((state) => state.hydrated);
  const tasksDesignVariant = useSettingsStore((state) => state.tasksDesignVariant);
  const setTasksDesignVariant = useSettingsStore((state) => state.setTasksDesignVariant);
  const theme = useAppTheme();
  const { t, isArabic } = useI18n();

  useEffect(() => {
    if (!settingsHydrated) {
      return;
    }

    if (isRamadanActive() && tasksDesignVariant === "classic") {
      setTasksDesignVariant("ramadan_nights");
    }
  }, [settingsHydrated, setTasksDesignVariant, tasksDesignVariant]);

  if (!settingsHydrated) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <LoadingBlock label={t("app.loadingSettings")} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, direction: isArabic ? "rtl" : "ltr" }}>
        <NavigationContainer
          theme={theme.navigationTheme}
          ref={navigationRef}
        >
          <RootNavigator />
        </NavigationContainer>
        <GlobalAnnouncementPopup />
        <GlobalNotificationOverlay />
        <StatusBar
          style={tasksDesignVariant === "ramadan_nights" || theme.mode === "dark" ? "light" : "dark"}
          translucent={false}
          backgroundColor={theme.navigationTheme.colors.card}
        />
      </View>
    </SafeAreaProvider>
  );
}
