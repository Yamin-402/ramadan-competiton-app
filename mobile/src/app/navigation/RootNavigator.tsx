import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { LoadingBlock } from "../../components/LoadingBlock";
import { useI18n } from "../../hooks/use-i18n";
import { useAuthStore } from "../../store/auth-store";
import { View } from "react-native";
import { AuthNavigator } from "./AuthNavigator";
import { MainTabsNavigator } from "./MainTabsNavigator";
import { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const hydrated = useAuthStore((state) => state.hydrated);
  const user = useAuthStore((state) => state.user);
  const { t } = useI18n();

  if (!hydrated) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <LoadingBlock label={t("app.preparing")} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <Stack.Screen name="Main" component={MainTabsNavigator} />
      ) : (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      )}
    </Stack.Navigator>
  );
}
