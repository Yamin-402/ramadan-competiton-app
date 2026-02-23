import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useMemo, useState } from "react";
import { Image, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { streaksApi } from "../../../api/endpoints/streaks.api";
import { usersApi } from "../../../api/endpoints/users.api";
import { getApiErrorMessage } from "../../../api/client";
import { AppButton } from "../../../components/AppButton";
import { AppCard } from "../../../components/AppCard";
import { AppTextInput } from "../../../components/AppTextInput";
import { ScreenContainer } from "../../../components/ScreenContainer";
import { useAppTheme } from "../../../hooks/use-app-theme";
import { useI18n } from "../../../hooks/use-i18n";
import { useAuthStore } from "../../../store/auth-store";
import {
  AppLanguage,
  TasksDesignVariant,
  ThemePreference,
  useSettingsStore,
} from "../../../store/settings-store";

const themeOptions: ThemePreference[] = ["system", "light", "dark"];
const layoutOptions: TasksDesignVariant[] = ["classic", "ramadan_modern", "modern"];
const languageOptions: AppLanguage[] = ["en", "ar"];

function resolveEducationLevelLabel(
  tags: Array<{ tag: { key: string } }> | undefined,
  t: ReturnType<typeof useI18n>["t"]
) {
  if (!tags || tags.length === 0) {
    return null;
  }

  const keys = tags.map((item) => item.tag.key.toLowerCase());
  if (keys.some((key) => key.includes("school"))) {
    return t("profile.educationSchool");
  }
  if (keys.some((key) => key.includes("university") || key.includes("uni"))) {
    return t("profile.educationUniversity");
  }

  return null;
}

export function ProfileScreen() {
  const { colors, mode } = useAppTheme();
  const { t, isArabic } = useI18n();
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const logout = useAuthStore((state) => state.logout);
  const themePreference = useSettingsStore((state) => state.themePreference);
  const setThemePreference = useSettingsStore((state) => state.setThemePreference);
  const tasksDesignVariant = useSettingsStore((state) => state.tasksDesignVariant);
  const setTasksDesignVariant = useSettingsStore((state) => state.setTasksDesignVariant);
  const appLanguage = useSettingsStore((state) => state.appLanguage);
  const setAppLanguage = useSettingsStore((state) => state.setAppLanguage);
  const navigation = useNavigation<any>();
  const textAlign = isArabic ? "right" : "left";
  const isModernVariant = tasksDesignVariant === "modern";
  const modernCardStyle = isModernVariant
    ? mode === "dark"
      ? { backgroundColor: colors.card, borderColor: colors.border }
      : { backgroundColor: "#f8fbff", borderColor: "#d7dfec" }
    : undefined;

  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || "");
  const [isStreakPublic, setIsStreakPublic] = useState(user?.isStreakPublic ?? true);
  const [streakSummary, setStreakSummary] = useState({
    active: 0,
    bestCurrent: 0,
    longest: 0,
  });
  const [saving, setSaving] = useState(false);
  const [pickingAvatar, setPickingAvatar] = useState(false);
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initials = useMemo(() => {
    const base = (displayName || user?.email || "R").trim();
    const letters = base
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

    return letters || "R";
  }, [displayName, user?.email]);

  const loadProfile = useCallback(async () => {
    setLoadingProfile(true);
    setError(null);
    try {
      const [profile, streakRows] = await Promise.all([
        usersApi.getMyProfile(),
        streaksApi.listMine(),
      ]);
      updateUser(profile);
      setDisplayName(profile.displayName || "");
      setBio(profile.bio || "");
      setAvatarUrl(profile.avatarUrl || "");
      setIsStreakPublic(profile.isStreakPublic ?? true);

      const currentStreaks = streakRows.map((row) => row.currentStreak);
      const longestStreaks = streakRows.map((row) => row.longestStreak);
      setStreakSummary({
        active: currentStreaks.filter((value) => value > 0).length,
        bestCurrent: currentStreaks.length > 0 ? Math.max(...currentStreaks) : 0,
        longest: longestStreaks.length > 0 ? Math.max(...longestStreaks) : 0,
      });
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not load profile"));
    } finally {
      setLoadingProfile(false);
    }
  }, [updateUser]);

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
    }, [loadProfile])
  );

  const saveProfile = async () => {
    setSaving(true);
    setError(null);
    try {
      const profile = await usersApi.updateMyProfile({
        displayName: displayName.trim() || null,
        bio: bio.trim() || null,
        avatarUrl: avatarUrl.trim() || null,
        isStreakPublic,
      });
      updateUser(profile);
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not save profile"));
    } finally {
      setSaving(false);
    }
  };

  const educationLevel = useMemo(
    () => resolveEducationLevelLabel(user?.tags, t),
    [t, user?.tags]
  );

  const pickAvatar = async () => {
    setError(null);
    setPickingAvatar(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError("Photo library permission is required.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });

      if (result.canceled || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      if (!asset) {
        return;
      }
      if (asset.base64) {
        const mime = asset.mimeType || "image/jpeg";
        setAvatarUrl(`data:${mime};base64,${asset.base64}`);
        return;
      }

      setAvatarUrl(asset.uri);
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not pick image"));
    } finally {
      setPickingAvatar(false);
    }
  };

  const removeAvatar = () => {
    setAvatarUrl("");
    setAvatarModalVisible(false);
  };

  return (
    <ScreenContainer>
      <Text style={[styles.pageTitle, { color: colors.textPrimary, textAlign }]}>
        {t("more.profile") || "Profile"}
      </Text>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        <AppCard style={modernCardStyle}>
          <View style={styles.headerRow}>
            <Pressable onPress={() => setAvatarModalVisible(true)} style={styles.avatarPressable}>
              <View>
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.avatarImage} resizeMode="cover" />
                ) : (
                  <View style={[styles.avatar, { backgroundColor: colors.gold }]}>
                    <Text style={styles.avatarText}>{initials}</Text>
                  </View>
                )}
                <View style={[styles.avatarBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Ionicons name="camera-outline" size={14} color={colors.textPrimary} />
                </View>
              </View>
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={[styles.name, { color: colors.textPrimary }]}>
                {displayName || user?.email || t("profile.userFallback")}
              </Text>
              <Text style={[styles.email, { color: colors.textSecondary }]}>{user?.email}</Text>
              <Text style={[styles.photoHint, { color: colors.textSecondary }]}>
                {t("profile.changePhotoHint")}
              </Text>
              {educationLevel ? (
                <Text style={[styles.email, { color: colors.textSecondary }]}>
                  {t("profile.educationLevel")}: {educationLevel}
                </Text>
              ) : null}
            </View>
          </View>
        </AppCard>

        <AppCard style={modernCardStyle}>
          <AppTextInput label={t("profile.displayName")} value={displayName} onChangeText={setDisplayName} />
          <AppTextInput
            label={t("profile.bio")}
            value={bio}
            onChangeText={setBio}
            multiline
            placeholder={t("profile.bioPlaceholder")}
          />
          <View style={styles.privacyRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary, textAlign }]}>
                {t("profile.visibilityTitle")}
              </Text>
              <Text style={[styles.privacyHint, { color: colors.textSecondary, textAlign }]}>
                {t("profile.visibilityHint")}
              </Text>
            </View>
            <Switch value={isStreakPublic} onValueChange={setIsStreakPublic} />
          </View>
          <AppButton
            label={saving ? t("common.saving") : loadingProfile ? t("profile.loadingProfile") : t("profile.save")}
            onPress={() => void saveProfile()}
            disabled={saving || loadingProfile}
          />
        </AppCard>

        <AppCard style={modernCardStyle}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, textAlign }]}>
            {t("profile.streakSummary")}
          </Text>
          <Text style={[styles.email, { color: colors.textSecondary, textAlign }]}>
            {t("profile.active")}: {streakSummary.active} | {t("profile.bestCurrent")}:{" "}
            {streakSummary.bestCurrent}
          </Text>
          <Text style={[styles.email, { color: colors.textSecondary, textAlign }]}>
            {t("profile.longest")}: {streakSummary.longest}
          </Text>
        </AppCard>


        <AppCard style={modernCardStyle}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, textAlign }]}>
            {t("profile.titleLayout")}
          </Text>
          <View style={styles.optionPillsRow}>
            {layoutOptions.map((option) => {
              const selected = tasksDesignVariant === option;
              return (
                <Pressable
                  key={option}
                  onPress={() => setTasksDesignVariant(option)}
                  style={[
                    styles.optionPill,
                    {
                      borderColor: selected ? colors.gold : colors.border,
                      backgroundColor: selected ? `${colors.gold}22` : "transparent",
                    },
                  ]}
                >
                  <Text style={{ color: colors.textPrimary, fontWeight: "700" }}>
                    {option === "classic"
                      ? t("profile.layoutClassic")
                      : option === "ramadan_modern"
                        ? t("profile.layoutRamadan")
                        : t("profile.layoutModern")}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.sectionTitle, styles.subSectionTitle, { color: colors.textPrimary, textAlign }]}>
            {t("profile.titleTheme")}
          </Text>
          <View style={styles.optionPillsRow}>
            {themeOptions.map((option) => {
              const selected = themePreference === option;
              return (
                <Pressable
                  key={option}
                  onPress={() => setThemePreference(option)}
                  style={[
                    styles.optionPill,
                    {
                      borderColor: selected ? colors.gold : colors.border,
                      backgroundColor: selected ? `${colors.gold}22` : "transparent",
                    },
                  ]}
                >
                  <Text style={{ color: colors.textPrimary, fontWeight: "700" }}>
                    {option === "system"
                      ? t("profile.themeSystem")
                      : option === "light"
                        ? t("profile.themeLight")
                        : t("profile.themeDark")}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.sectionTitle, styles.subSectionTitle, { color: colors.textPrimary, textAlign }]}>
            {t("profile.titleLanguage")}
          </Text>
          <View style={styles.optionPillsRow}>
            {languageOptions.map((option) => {
              const selected = appLanguage === option;
              return (
                <Pressable
                  key={option}
                  onPress={() => setAppLanguage(option)}
                  style={[
                    styles.optionPill,
                    {
                      borderColor: selected ? colors.gold : colors.border,
                      backgroundColor: selected ? `${colors.gold}22` : "transparent",
                    },
                  ]}
                >
                  <Text style={{ color: colors.textPrimary, fontWeight: "700" }}>
                    {option === "en" ? t("profile.langEnglish") : t("profile.langArabic")}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </AppCard>

        <AppButton
          label={t("profile.replayGuide")}
          variant="ghost"
          onPress={() => navigation.navigate("Guide")}
        />

        {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

        <AppButton label={t("common.logout")} variant="danger" onPress={logout} />

        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal
        visible={avatarModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAvatarModalVisible(false)}
      >
        <Pressable
          style={[styles.modalOverlay, { backgroundColor: "rgba(0,0,0,0.45)" }]}
          onPress={() => setAvatarModalVisible(false)}
        >
          <Pressable
            style={[
              styles.modalCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
            onPress={() => undefined}
          >
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.modalAvatarPreview} resizeMode="cover" />
            ) : (
              <View style={[styles.modalAvatarPreview, styles.avatar, { backgroundColor: colors.gold }]}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            )}
            <AppButton
              label={pickingAvatar ? t("common.loading") : t("profile.pickPhoto")}
              onPress={() => void pickAvatar()}
              variant="ghost"
              disabled={pickingAvatar}
            />
            {avatarUrl ? (
              <AppButton label={t("profile.removePhoto")} onPress={removeAvatar} variant="danger" />
            ) : null}
            <AppButton
              label={t("common.done")}
              onPress={() => setAvatarModalVisible(false)}
              variant="ghost"
            />
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  pageTitle: {
    fontSize: 34,
    fontWeight: "bold",
    marginBottom: 20,
    marginTop: 10,
    paddingHorizontal: 4,
  },
  scrollContainer: {
    gap: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarPressable: {
    position: "relative",
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarBadge: {
    position: "absolute",
    right: -4,
    bottom: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#1a1607",
    fontWeight: "800",
    fontSize: 24,
  },
  name: {
    fontSize: 18,
    fontWeight: "800",
  },
  email: {
    fontSize: 13,
  },
  photoHint: {
    fontSize: 12,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 8,
  },
  subSectionTitle: {
    marginTop: 10,
  },
  optionPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  optionPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  privacyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 12,
  },
  privacyHint: {
    fontSize: 12,
    lineHeight: 17,
  },
  error: {
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    marginVertical: 8,
  },
  modalOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 360,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  modalAvatarPreview: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignSelf: "center",
  },
});
