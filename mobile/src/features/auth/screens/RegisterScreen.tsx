import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
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

type Props = NativeStackScreenProps<AuthStackParamList, "Register">;

export function RegisterScreen({ navigation }: Props) {
  const { colors } = useAppTheme();
  const { t, isArabic } = useI18n();
  const textAlign = isArabic ? "right" : "left";
  const appLanguage = useSettingsStore((state) => state.appLanguage);
  const setAppLanguage = useSettingsStore((state) => state.setAppLanguage);
  const setSession = useAuthStore((state) => state.setSession);

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [audience, setAudience] = useState<"SCHOOL" | "UNIVERSITY" | null>(null);
  const [schoolSystem, setSchoolSystem] = useState<"EGYPTIAN" | "FOREIGN" | null>(null);
  const [showEducationModal, setShowEducationModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitRegistration = async () => {
    setSubmitting(true);
    try {
      const session = await authApi.register({
        displayName: displayName.trim(),
        email: email.trim(),
        password,
        audience: audience || "UNIVERSITY",
        schoolSystem: audience === "SCHOOL" ? (schoolSystem ?? undefined) : undefined,
      });

      setSession(session.token, session.user);
    } catch (err) {
      setError(getApiErrorMessage(err, "Registration failed"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async () => {
    setError(null);
    if (!displayName.trim()) {
      setError(t("auth.displayNameRequired"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("auth.passwordMismatch"));
      return;
    }
    if (!audience || (audience === "SCHOOL" && !schoolSystem)) {
      setShowEducationModal(true);
      return;
    }

    await submitRegistration();
  };

  const onEducationContinue = async () => {
    if (!audience) {
      setError(t("auth.audienceRequired"));
      return;
    }
    if (audience === "SCHOOL" && !schoolSystem) {
      setError(t("auth.schoolSystemRequired"));
      return;
    }

    setShowEducationModal(false);
    await submitRegistration();
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

      <Text style={[styles.title, { color: colors.textPrimary, textAlign }]}>{t("auth.createYourAccount")}</Text>
      <AppCard>
        <AppTextInput
          label={t("auth.displayName")}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder={t("auth.namePlaceholder")}
        />
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
          placeholder={t("auth.minPasswordPlaceholder")}
        />
        <AppTextInput
          label={t("auth.confirmPassword")}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          autoCapitalize="none"
          placeholder={t("auth.confirmPasswordPlaceholder")}
        />
        {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
        <AppButton label={submitting ? t("auth.creating") : t("auth.create")} onPress={handleRegister} disabled={submitting} />
        <AppButton label={t("auth.backToLogin")} variant="ghost" onPress={() => navigation.goBack()} />
      </AppCard>

      <Modal
        animationType="fade"
        transparent
        visible={showEducationModal}
        onRequestClose={() => setShowEducationModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary, textAlign }]}>{t("auth.audiencePrompt")}</Text>

            <Text style={[styles.sectionLabel, { color: colors.textSecondary, textAlign }]}>{t("auth.audience")}</Text>
            <View style={styles.row}>
              <AppButton
                label={t("auth.university")}
                variant={audience === "UNIVERSITY" ? "primary" : "ghost"}
                onPress={() => {
                  setAudience("UNIVERSITY");
                  setSchoolSystem(null);
                }}
                style={styles.rowButton}
              />
              <AppButton
                label={t("auth.school")}
                variant={audience === "SCHOOL" ? "primary" : "ghost"}
                onPress={() => setAudience("SCHOOL")}
                style={styles.rowButton}
              />
            </View>

            {audience === "SCHOOL" ? (
              <>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary, textAlign }]}>
                  {t("auth.schoolSystem")}
                </Text>
                <View style={styles.row}>
                  <AppButton
                    label={t("auth.egyptian")}
                    variant={schoolSystem === "EGYPTIAN" ? "primary" : "ghost"}
                    onPress={() => setSchoolSystem("EGYPTIAN")}
                    style={styles.rowButton}
                  />
                  <AppButton
                    label={t("auth.foreign")}
                    variant={schoolSystem === "FOREIGN" ? "primary" : "ghost"}
                    onPress={() => setSchoolSystem("FOREIGN")}
                    style={styles.rowButton}
                  />
                </View>
              </>
            ) : null}

            <View style={styles.modalActions}>
              <AppButton label={t("auth.continue")} onPress={() => void onEducationContinue()} style={styles.rowButton} />
              <AppButton
                label={t("auth.cancel")}
                variant="ghost"
                onPress={() => setShowEducationModal(false)}
                style={styles.rowButton}
              />
            </View>
          </View>
        </View>
      </Modal>
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
    fontSize: 24,
    fontWeight: "800",
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  row: {
    flexDirection: "row",
    gap: 8,
  },
  rowButton: {
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.34)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  modalActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  error: {
    fontSize: 13,
    fontWeight: "600",
  },
});
