import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useMemo, useState } from "react";
import { Image, Linking, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { usersApi } from "../../../api/endpoints/users.api";
import { getApiErrorMessage } from "../../../api/client";
import { AppCard } from "../../../components/AppCard";
import { LoadingBlock } from "../../../components/LoadingBlock";
import { ScreenContainer } from "../../../components/ScreenContainer";
import { useAppTheme } from "../../../hooks/use-app-theme";
import { useI18n } from "../../../hooks/use-i18n";
import { formatPoints } from "../../../utils/format";
import { MoreStackParamList } from "../../../app/navigation/types";

type Props = NativeStackScreenProps<MoreStackParamList, "UserProfile">;

export function UserProfileScreen({ route }: Props) {
  const { colors } = useAppTheme();
  const { t, isArabic } = useI18n();
  const textAlign = isArabic ? "right" : "left";
  const { userId, fallbackDisplayName } = route.params;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Awaited<ReturnType<typeof usersApi.getPublicProfile>> | null>(null);
  const [imageOpen, setImageOpen] = useState(false);
  const [imageMenuOpen, setImageMenuOpen] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await usersApi.getPublicProfile(userId);
      setProfile(data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not load user profile"));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
    }, [loadProfile])
  );

  const displayName = profile?.displayName || fallbackDisplayName || t("profile.userFallback");
  const bio = profile?.bio || null;
  const avatarUrl = profile?.avatarUrl || null;
  const educationLabel =
    profile?.educationLevel === "SCHOOL"
      ? t("profile.educationSchool")
      : profile?.educationLevel === "UNIVERSITY"
        ? t("profile.educationUniversity")
        : null;
  const initials = useMemo(
    () =>
      (displayName || "U")
        .split(" ")
        .filter(Boolean)
        .map((part) => part[0])
        .slice(0, 2)
        .join("")
        .toUpperCase(),
    [displayName]
  );

  const openAvatar = () => {
    if (!avatarUrl) {
      return;
    }
    setImageMenuOpen(false);
    setImageOpen(true);
  };

  const closeAvatar = () => {
    setImageMenuOpen(false);
    setImageOpen(false);
  };

  const downloadAvatar = async () => {
    if (!avatarUrl) {
      return;
    }
    try {
      await Linking.openURL(avatarUrl);
    } catch {
      // no-op
    } finally {
      setImageMenuOpen(false);
    }
  };

  return (
    <ScreenContainer>
      <AppCard>
        <View style={styles.headerRow}>
          <Pressable onPress={openAvatar} disabled={!avatarUrl}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} resizeMode="cover" />
            ) : (
              <View style={[styles.avatar, { backgroundColor: colors.gold }]}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            )}
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={[styles.name, { color: colors.textPrimary, textAlign }]}>{displayName}</Text>
            {educationLabel ? (
              <Text style={[styles.bio, { color: colors.textSecondary, textAlign }]}>
                {t("profile.educationLevel")}: {educationLabel}
              </Text>
            ) : null}
            <Text style={[styles.bio, { color: colors.textSecondary, textAlign }]}>
              {t("leaderboard.total")}: {formatPoints(profile?.totalPoints || 0)}
            </Text>
          </View>
        </View>
      </AppCard>

      <AppCard>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary, textAlign }]}>{t("profile.bio")}</Text>
        <Text style={[styles.bio, { color: colors.textSecondary, textAlign }]}>{bio || t("profile.noBio")}</Text>
      </AppCard>

      {loading ? <LoadingBlock /> : null}
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

      {!loading && profile ? (
        <AppCard>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, textAlign }]}>{t("more.streaks")}</Text>
          {profile.streakSummary ? (
            <>
              <Text style={[styles.bio, { color: colors.textSecondary }]}>
                {t("profile.active")}: {profile.streakSummary.activeStreaks}
              </Text>
              <Text style={[styles.bio, { color: colors.textSecondary }]}>
                {t("profile.bestCurrent")}: {profile.streakSummary.bestCurrentStreak}
              </Text>
              <Text style={[styles.bio, { color: colors.textSecondary }]}>
                {t("profile.longest")}: {profile.streakSummary.longestStreak}
              </Text>
            </>
          ) : (
            <Text style={[styles.bio, { color: colors.textSecondary }]}>
              {t("profile.privateStreak")}
            </Text>
          )}
        </AppCard>
      ) : null}

      {!loading && !profile && !error ? (
        <AppCard>
          <Text style={[styles.bio, { color: colors.textSecondary, textAlign }]}>{t("profile.unavailable")}</Text>
        </AppCard>
      ) : null}

      <Modal transparent visible={imageOpen} animationType="fade" onRequestClose={closeAvatar}>
        <View style={styles.imageOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeAvatar} />
          <View style={styles.imageFrame}>
            {avatarUrl ? <Image source={{ uri: avatarUrl }} style={styles.expandedImage} resizeMode="contain" /> : null}
            <Pressable style={styles.imageMenuButton} onPress={() => setImageMenuOpen((prev) => !prev)}>
              <Text style={styles.imageMenuButtonText}>⋮</Text>
            </Pressable>
            {imageMenuOpen ? (
              <View style={[styles.imageMenu, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Pressable onPress={() => void downloadAvatar()} style={styles.imageMenuItem}>
                  <Text style={[styles.imageMenuText, { color: colors.textPrimary }]}>{t("profile.downloadPhoto")}</Text>
                </Pressable>
                <Pressable onPress={closeAvatar} style={styles.imageMenuItem}>
                  <Text style={[styles.imageMenuText, { color: colors.textSecondary }]}>{t("common.done")}</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  bio: {
    fontSize: 13,
    lineHeight: 18,
  },
  error: {
    fontSize: 13,
    fontWeight: "700",
  },
  imageOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.82)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  imageFrame: {
    width: "100%",
    maxWidth: 460,
    aspectRatio: 1,
    position: "relative",
  },
  expandedImage: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  imageMenuButton: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  imageMenuButtonText: {
    color: "#fff",
    fontSize: 20,
    lineHeight: 22,
    fontWeight: "700",
  },
  imageMenu: {
    position: "absolute",
    top: 48,
    right: 10,
    minWidth: 150,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  imageMenuItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  imageMenuText: {
    fontSize: 13,
    fontWeight: "700",
  },
});
