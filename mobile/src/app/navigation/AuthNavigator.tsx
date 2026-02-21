import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { LoginScreen } from "../../features/auth/screens/LoginScreen";
import { RegisterScreen } from "../../features/auth/screens/RegisterScreen";
import { useAppTheme } from "../../hooks/use-app-theme";
import { useI18n } from "../../hooks/use-i18n";
import { AuthStackParamList } from "./types";

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  const { colors } = useAppTheme();
  const { t } = useI18n();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.header,
        },
        headerTintColor: colors.gold,
        headerTitleStyle: {
          fontWeight: "700",
        },
      }}
    >
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{
          title: t("auth.signIn"),
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{
          title: t("auth.createAccount"),
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}
