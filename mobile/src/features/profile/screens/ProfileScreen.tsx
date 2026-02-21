import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useMemo, useState } from "react";
import { Image, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
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
  const { colors } = useAppTheme();
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
  const textAlign = isArabic ? "right" : "left";
  const isModernVariant = tasksDesignVariant === "modern";
  const modernCardStyle = isModernVariant
    ? { backgroundColor: "#f8fbff", borderColor: "#d7dfec" }
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
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} resizeMode="cover" />
            ) : (
              <View style={[styles.avatar, { backgroundColor: colors.gold }]}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={[styles.name, { color: colors.textPrimary }]}>
                {displayName || user?.email || t("profile.userFallback")}
              </Text>
              <Text style={[styles.email, { color: colors.textSecondary }]}>{user?.email}</Text>
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
          <AppTextInput
            label={t("profile.avatarUrl")}
            value={avatarUrl}
            onChangeText={setAvatarUrl}
            autoCapitalize="none"
            placeholder={t("profile.avatarHint")}
          />
          <AppButton
            label={pickingAvatar ? t("common.loading") : t("profile.pickPhoto")}
            onPress={() => void pickAvatar()}
            variant="ghost"
            disabled={pickingAvatar}
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
          <View style={styles.themeOptions}>
            {layoutOptions.map((option) => (
              <AppButton
                key={option}
                label={
                  option === "classic"
                    ? t("profile.layoutClassic")
                    : option === "ramadan_modern"
                      ? t("profile.layoutRamadan")
                      : t("profile.layoutModern")
                }
                variant={tasksDesignVariant === option ? "primary" : "ghost"}
                onPress={() => setTasksDesignVariant(option)}
              />
            ))}
          </View>
        </AppCard>

        <AppCard style={modernCardStyle}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, textAlign }]}>
            {t("profile.titleLanguage")}
          </Text>
          <View style={styles.themeOptions}>
            {languageOptions.map((option) => (
              <AppButton
                key={option}
                label={option === "en" ? t("profile.langEnglish") : t("profile.langArabic")}
                variant={appLanguage === option ? "primary" : "ghost"}
                onPress={() => setAppLanguage(option)}
              />
            ))}
          </View>
        </AppCard>

        {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

        <AppButton label={t("common.logout")} variant="danger" onPress={logout} />

        <View style={{ height: 40 }} />
      </ScrollView>
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 8,
  },
  themeOptions: {
    gap: 8,
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
});
