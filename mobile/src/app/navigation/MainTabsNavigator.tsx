import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Image, ImageSourcePropType, StyleSheet, View } from "react-native";
import { DailyQuestionsScreen } from "../../features/daily-questions/screens/DailyQuestionsScreen";
import { ForbiddenTasksScreen } from "../../features/tasks/screens/ForbiddenTasksScreen";
import { TasksScreen } from "../../features/tasks/screens/TasksScreen";
import { useAppTheme } from "../../hooks/use-app-theme";
import { useI18n } from "../../hooks/use-i18n";
import { useSettingsStore } from "../../store/settings-store";
import { getLayoutPalette } from "../../theme/layout-palette";
import { MoreStackNavigator } from "./MoreStackNavigator";
import { MainTabParamList } from "./types";

const Tab = createBottomTabNavigator<MainTabParamList>();

// TODO: add your local images in mobile/assets/images and replace null with:
// e.g. TasksTab: require("../../../assets/images/tab-tasks.png")
const tabImageByRoute: Record<keyof MainTabParamList, ImageSourcePropType | null> = {
  TasksTab: require("../../images/notes.png"),
  ForbiddenTab: require("../../images/no-entry (1).png"),
  DailyQuestionsTab: require("../../images/quiz2.png"),
  MoreTab: require("../../images/ellipsis2.png"),
};

export function MainTabsNavigator() {
  const { colors, mode } = useAppTheme();
  const { t } = useI18n();
  const variant = useSettingsStore((state) => state.tasksDesignVariant);
  const palette = getLayoutPalette(variant, colors, mode);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: {
          backgroundColor: palette.topNavBackground,
        },
        headerTintColor: palette.topNavText,
        headerTitleStyle: {
          fontWeight: "700",
        },
        tabBarStyle: {
          backgroundColor: palette.bottomNavBackground,
          borderTopColor: palette.bottomNavBorder,
          height: 68,
        },
        tabBarActiveTintColor: palette.tabActive,
        tabBarInactiveTintColor: palette.tabInactive,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
          marginBottom: 8,
        },
        tabBarIcon: ({ focused }) => {
          const source = tabImageByRoute[route.name as keyof MainTabParamList];
          if (!source) {
            return <View style={styles.imagePlaceholder} />;
          }

          return (
            <Image
              source={source}
              style={[
                styles.tabImage,
                { opacity: focused ? 1 : 0.65 },
              ]}
            />
          );
        },
      })}
    >
      <Tab.Screen
        name="TasksTab"
        component={TasksScreen}
        options={{
          title: t("nav.tasks"),
        }}
      />
      <Tab.Screen
        name="ForbiddenTab"
        component={ForbiddenTasksScreen}
        options={{
          title: t("nav.forbidden"),
        }}
      />
      <Tab.Screen
        name="DailyQuestionsTab"
        component={DailyQuestionsScreen}
        options={{
          title: t("nav.dailyQuestions"),
        }}
      />
      <Tab.Screen
        name="MoreTab"
        component={MoreStackNavigator}
        options={{
          title: t("nav.more"),
          headerShown: false,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  imagePlaceholder: {
    width: 22,
    height: 22,
  },
  tabImage: {
    width: 22,
    height: 22,
  },
});
