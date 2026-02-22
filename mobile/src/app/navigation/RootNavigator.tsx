import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { LoadingBlock } from "../../components/LoadingBlock";
import { OnboardingGuideScreen } from "../../features/onboarding/screens/OnboardingGuideScreen";
import { useI18n } from "../../hooks/use-i18n";
import { useAuthStore } from "../../store/auth-store";
import { useSettingsStore } from "../../store/settings-store";
import { View } from "react-native";
import { AuthNavigator } from "./AuthNavigator";
import { MainTabsNavigator } from "./MainTabsNavigator";
import { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const hydrated = useAuthStore((state) => state.hydrated);
  const settingsHydrated = useSettingsStore((state) => state.hydrated);
  const user = useAuthStore((state) => state.user);
  const onboardingSeenByUserId = useSettingsStore((state) => state.onboardingSeenByUserId);
  const { t } = useI18n();
  const shouldShowOnboarding = user ? !onboardingSeenByUserId[String(user.id)] : false;

  if (!hydrated || !settingsHydrated) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <LoadingBlock label={t("app.preparing")} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        shouldShowOnboarding ? (
          <Stack.Screen
            name="Onboarding"
            component={OnboardingGuideScreen}
            initialParams={{ mode: "first_login" }}
          />
        ) : (
          <Stack.Screen name="Main" component={MainTabsNavigator} />
        )
      ) : (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      )}
    </Stack.Navigator>
  );
}
