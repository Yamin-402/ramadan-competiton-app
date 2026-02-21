import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { View } from "react-native";
import { ActivityHistoryScreen } from "../../features/activities/screens/ActivityHistoryScreen";
import { ActivityStatsScreen } from "../../features/activities/screens/ActivityStatsScreen";
import { LeaderboardScreen } from "../../features/leaderboard/screens/LeaderboardScreen";
import { MoneyScreen } from "../../features/money/screens/MoneyScreen";
import { MoreMenuScreen } from "../../features/more/screens/MoreMenuScreen";
import { NotificationsScreen } from "../../features/notifications/screens/NotificationsScreen";
import { ProfileScreen } from "../../features/profile/screens/ProfileScreen";
import { UserProfileScreen } from "../../features/profile/screens/UserProfileScreen";
import { StreaksScreen } from "../../features/streaks/screens/StreaksScreen";
import { MoreHeaderStatus } from "../../components/MoreHeaderStatus";
import { useAppTheme } from "../../hooks/use-app-theme";
import { useI18n } from "../../hooks/use-i18n";
import { useSettingsStore } from "../../store/settings-store";
import { getLayoutPalette } from "../../theme/layout-palette";
import { MoreStackParamList } from "./types";

const Stack = createNativeStackNavigator<MoreStackParamList>();

export function MoreStackNavigator() {
  const { colors, mode } = useAppTheme();
  const { t } = useI18n();
  const variant = useSettingsStore((state) => state.tasksDesignVariant);
  const palette = getLayoutPalette(variant, colors, mode);

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: palette.topNavBackground,
        },
        statusBarColor: palette.topNavBackground,
        statusBarStyle: mode === "dark" ? "light" : "dark",
        statusBarTranslucent: false,
        headerTintColor: palette.topNavText,
        headerTitleStyle: {
          fontWeight: "700",
        },
        headerRight: () => (
          <View style={{ marginRight: 8 }}>
            <MoreHeaderStatus />
          </View>
        ),
        contentStyle: {
          backgroundColor: "transparent",
        },
      }}
    >
      <Stack.Screen name="MoreMenu" component={MoreMenuScreen} options={{ title: t("more.title") }} />
      <Stack.Screen name="Leaderboard" component={LeaderboardScreen} options={{ title: t("more.leaderboard") }} />
      <Stack.Screen name="Streaks" component={StreaksScreen} options={{ title: t("more.streaks") }} />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: t("more.notifications") }}
      />
      <Stack.Screen name="Money" component={MoneyScreen} options={{ title: t("more.money") }} />
      <Stack.Screen name="ActivityStats" component={ActivityStatsScreen} options={{ title: t("more.stats") }} />
      <Stack.Screen
        name="ActivityHistory"
        component={ActivityHistoryScreen}
        options={{ title: t("more.history") }}
      />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: t("more.profile") }} />
      <Stack.Screen
        name="UserProfile"
        component={UserProfileScreen}
        options={{ title: t("profile.publicProfileTitle") }}
      />
    </Stack.Navigator>
  );
}
