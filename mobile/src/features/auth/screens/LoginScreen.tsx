import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { authApi } from "../../../api/endpoints/auth.api";
import { getApiErrorMessage } from "../../../api/client";
import { AppButton } from "../../../components/AppButton";
import { AppCard } from "../../../components/AppCard";
import { AppTextInput } from "../../../components/AppTextInput";
import { ScreenContainer } from "../../../components/ScreenContainer";
import { useAppTheme } from "../../../hooks/use-app-theme";
import { useI18n } from "../../../hooks/use-i18n";
import { useAuthStore } from "../../../store/auth-store";
import { useSettingsStore } from "../../../store/settings-store";
import { AuthStackParamList } from "../../../app/navigation/types";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

export function LoginScreen({ navigation }: Props) {
  const { colors } = useAppTheme();
  const { t, isArabic } = useI18n();
  const textAlign = isArabic ? "right" : "left";
  const appLanguage = useSettingsStore((state) => state.appLanguage);
  const setAppLanguage = useSettingsStore((state) => state.setAppLanguage);
  const setSession = useAuthStore((state) => state.setSession);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const session = await authApi.createSession({
        email: email.trim(),
        password,
      });
      setSession(session.token, session.user);
    } catch (err) {
      setError(getApiErrorMessage(err, "Login failed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer safeAreaEdges={["top", "left", "right", "bottom"]}>
      <View style={[styles.languageFloatingRow, { justifyContent: isArabic ? "flex-start" : "flex-end" }]}>
        <Pressable
          onPress={() => setAppLanguage("en")}
          style={[
            styles.languageChip,
            {
              borderColor: appLanguage === "en" ? colors.gold : colors.border,
              backgroundColor: appLanguage === "en" ? colors.gold : colors.card,
            },
          ]}
        >
          <Text style={{ color: appLanguage === "en" ? "#1d1809" : colors.textPrimary, fontWeight: "700" }}>
            EN
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setAppLanguage("ar")}
          style={[
            styles.languageChip,
            {
              borderColor: appLanguage === "ar" ? colors.gold : colors.border,
              backgroundColor: appLanguage === "ar" ? colors.gold : colors.card,
            },
          ]}
        >
          <Text style={{ color: appLanguage === "ar" ? "#1d1809" : colors.textPrimary, fontWeight: "700" }}>
            AR
          </Text>
        </Pressable>
      </View>

      <Text style={[styles.title, { color: colors.textPrimary, textAlign }]}>{t("auth.appTitle")}</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary, textAlign }]}>
        {t("auth.subtitle")}
      </Text>

      <AppCard>
        <AppTextInput
          label={t("auth.email")}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder={t("auth.emailPlaceholder")}
        />
        <AppTextInput
          label={t("auth.password")}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          placeholder={t("auth.passwordPlaceholder")}
        />
        {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
        <AppButton label={submitting ? t("auth.signingIn") : t("auth.signIn")} onPress={handleLogin} disabled={submitting} />
      </AppCard>

      <View style={styles.footer}>
        <Text style={{ color: colors.textSecondary }}>{t("auth.noAccount")}</Text>
        <AppButton label={t("auth.createAccount")} variant="ghost" onPress={() => navigation.navigate("Register")} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  languageFloatingRow: {
    flexDirection: "row",
    gap: 8,
  },
  languageChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  error: {
    fontSize: 13,
    fontWeight: "600",
  },
  footer: {
    gap: 10,
    marginTop: 8,
  },
});
