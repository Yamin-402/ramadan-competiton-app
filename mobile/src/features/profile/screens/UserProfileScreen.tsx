import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useMemo, useRef, useState } from "react";
import { Image, Linking, Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { usersApi } from "../../../api/endpoints/users.api";
import { getApiErrorMessage } from "../../../api/client";
import { AppCard } from "../../../components/AppCard";
import { LoadingBlock } from "../../../components/LoadingBlock";
import { ScreenContainer } from "../../../components/ScreenContainer";
import { useAppTheme } from "../../../hooks/use-app-theme";
import { useI18n } from "../../../hooks/use-i18n";
import { useAuthStore } from "../../../store/auth-store";
import { formatPoints } from "../../../utils/format";
import { MoreStackParamList } from "../../../app/navigation/types";
import { API_BASE_URL } from "../../../config/env";

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
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
      setToastMessage(t("profile.downloadStart"));
      const normalized = avatarUrl.trim();
      if (Platform.OS === "web") {
        await Linking.openURL(normalized);
        setToastMessage(t("profile.downloadOpened"));
      } else {
        const FileSystem = await import("expo-file-system");
        const MediaLibrary = await import("expo-media-library");
        const Sharing = await import("expo-sharing");

        const baseName = `profile_${userId}_${Date.now()}`;
        const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory || "";
        if (!baseDir) {
          throw new Error("File system directory is missing");
        }
        const safeBaseDir = baseDir.endsWith("/") ? baseDir : `${baseDir}/`;
        const { token } = useAuthStore.getState();
        let fileUri = "";
        let extension = "jpg";

        if (normalized.startsWith("data:")) {
          const match = normalized.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/);
          if (!match) {
            throw new Error("Invalid data url");
          }
          const mime = match[1];
          extension = mime.split("/")[1] || "jpg";
          fileUri = `${safeBaseDir}${baseName}.${extension}`;
          await FileSystem.writeAsStringAsync(fileUri, match[2], {
            encoding: FileSystem.EncodingType.Base64,
          });
        } else if (normalized.startsWith("file://")) {
          extension = normalized.split("?")[0].split(".").pop()?.toLowerCase() || "jpg";
          fileUri = `${safeBaseDir}${baseName}.${extension}`;
          await FileSystem.copyAsync({ from: normalized, to: fileUri });
        } else {
          let downloadUrl = normalized;
          if (!/^https?:\/\//i.test(downloadUrl)) {
            const base = API_BASE_URL.replace(/\/api\/v1$/i, "");
            downloadUrl = downloadUrl.startsWith("/") ? `${base}${downloadUrl}` : `${base}/${downloadUrl}`;
          }
          extension = downloadUrl.split("?")[0].split(".").pop()?.toLowerCase() || "jpg";
          fileUri = `${safeBaseDir}${baseName}.${extension}`;
          const downloadOptions = token ? { headers: { Authorization: `Bearer ${token}`} } : undefined;
          const download = await FileSystem.downloadAsync(downloadUrl, fileUri, downloadOptions);
          fileUri = download.uri;
        }

        const permission = await MediaLibrary.requestPermissionsAsync();
        const canSave =
          permission.granted === true ||
          permission.status === "granted" ||
          permission.status === "limited" ||
          permission.accessPrivileges === "limited";
        if (canSave) {
          try {
            await MediaLibrary.createAssetAsync(fileUri);
            setToastMessage(t("profile.downloadSaved"));
          } catch {
            await MediaLibrary.saveToLibraryAsync(fileUri);
            setToastMessage(t("profile.downloadSaved"));
          }
        } else {
          const canShare = await Sharing.isAvailableAsync();
          if (canShare) {
            await Sharing.shareAsync(fileUri, {
              mimeType: `image/${extension === "jpg" ? "jpeg" : extension}`,
              dialogTitle: t("profile.downloadPhoto"),
            });
            setToastMessage(t("profile.downloadShared"));
          } else {
            await Linking.openURL(avatarUrl);
            setToastMessage(t("profile.downloadOpened"));
          }
        }
      }
    } catch {
      setToastMessage(t("profile.downloadFailed"));
    } finally {
      setImageMenuOpen(false);
      toastTimerRef.current = setTimeout(() => {
        setToastMessage(null);
      }, 2200);
    }
  };

  const toastOverlay = toastMessage ? (
    <View style={styles.toast}>
      <Text style={styles.toastText}>{toastMessage}</Text>
    </View>
  ) : null;

  return (
    <ScreenContainer fixedOverlay={toastOverlay}>
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
              <Text style={styles.imageMenuButtonText}>...</Text>
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
  toast: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 28,
    backgroundColor: "rgba(0,0,0,0.82)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  toastText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
});

