import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { AppState, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GlobalNotificationOverlay } from "../components/GlobalNotificationOverlay";
import { GlobalAnnouncementPopup } from "../components/GlobalAnnouncementPopup";
import { CompetitionWinnersOverlay } from "../components/CompetitionWinnersOverlay";
import { LoadingBlock } from "../components/LoadingBlock";
import { useAppTheme } from "../hooks/use-app-theme";
import { useI18n } from "../hooks/use-i18n";
import { useSettingsStore } from "../store/settings-store";
import { isRamadanActive } from "../utils/ramadan";
import { RootNavigator } from "./navigation/RootNavigator";
import { useAuthStore } from "../store/auth-store";
import { useCompetitionStore } from "../store/competition-store";
import { navigationRef } from "./navigation/navigationRef";

export function AppRoot() {
  const settingsHydrated = useSettingsStore((state) => state.hydrated);
  const tasksDesignVariant = useSettingsStore((state) => state.tasksDesignVariant);
  const setTasksDesignVariant = useSettingsStore((state) => state.setTasksDesignVariant);
  const authHydrated = useAuthStore((state) => state.hydrated);
  const userId = useAuthStore((state) => state.user?.id);
  const loadCompetition = useCompetitionStore((state) => state.load);
  const clearCompetition = useCompetitionStore((state) => state.clear);
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

  useEffect(() => {
    if (!authHydrated) {
      return;
    }
    if (userId) {
      void loadCompetition();
    } else {
      clearCompetition();
    }
  }, [authHydrated, userId, loadCompetition, clearCompetition]);

  useEffect(() => {
    if (!authHydrated || !userId) {
      return;
    }

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void loadCompetition();
      }
    });

    return () => subscription.remove();
  }, [authHydrated, loadCompetition, userId]);

  useEffect(() => {
    if (!authHydrated || !userId) {
      return;
    }

    const intervalId = setInterval(() => {
      void loadCompetition();
    }, 30000);

    return () => clearInterval(intervalId);
  }, [authHydrated, loadCompetition, userId]);


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
        <CompetitionWinnersOverlay />
        <StatusBar
          style={tasksDesignVariant === "ramadan_nights" || theme.mode === "dark" ? "light" : "dark"}
          translucent={false}
          backgroundColor={theme.navigationTheme.colors.card}
        />
      </View>
    </SafeAreaProvider>
  );
}
