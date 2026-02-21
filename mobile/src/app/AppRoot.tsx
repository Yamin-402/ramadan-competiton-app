import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GlobalNotificationOverlay } from "../components/GlobalNotificationOverlay";
import { LoadingBlock } from "../components/LoadingBlock";
import { useAppTheme } from "../hooks/use-app-theme";
import { useI18n } from "../hooks/use-i18n";
import { useSettingsStore } from "../store/settings-store";
import { RootNavigator } from "./navigation/RootNavigator";
import { navigationRef } from "./navigation/navigationRef";

export function AppRoot() {
  const settingsHydrated = useSettingsStore((state) => state.hydrated);
  const theme = useAppTheme();
  const { t, isArabic } = useI18n();

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
        <GlobalNotificationOverlay />
        <StatusBar
          style={theme.mode === "dark" ? "light" : "dark"}
          translucent={false}
          backgroundColor={theme.navigationTheme.colors.card}
        />
      </View>
    </SafeAreaProvider>
  );
}
