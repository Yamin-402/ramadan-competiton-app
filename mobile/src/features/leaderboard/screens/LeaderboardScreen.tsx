import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { leaderboardApi } from "../../../api/endpoints/leaderboard.api";
import { getApiErrorMessage } from "../../../api/client";
import { PaginatedMeta } from "../../../types/api";
import { LeaderboardItem } from "../../../types/domain";
import { formatPoints } from "../../../utils/format";
import { AppButton } from "../../../components/AppButton";
import { AppCard } from "../../../components/AppCard";
import { EmptyState } from "../../../components/EmptyState";
import { LoadingBlock } from "../../../components/LoadingBlock";
import { ScreenContainer } from "../../../components/ScreenContainer";
import { useAppTheme } from "../../../hooks/use-app-theme";
import { useI18n } from "../../../hooks/use-i18n";
import { useSettingsStore } from "../../../store/settings-store";

const PAGE_SIZE = 20;

export function LeaderboardScreen() {
  const { colors } = useAppTheme();
  const { t, isArabic } = useI18n();
  const tasksDesignVariant = useSettingsStore((state) => state.tasksDesignVariant);
  const textAlign = isArabic ? "right" : "left";
  const navigation = useNavigation<any>();
  const [rows, setRows] = useState<LeaderboardItem[]>([]);
  const [meta, setMeta] = useState<PaginatedMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(async (page: number, append: boolean) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const response = await leaderboardApi.get(page, PAGE_SIZE);
      setRows((prev) => (append ? [...prev, ...response.data] : response.data));
      setMeta(response.meta || null);
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not load leaderboard"));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetchPage(1, false);
    }, [fetchPage])
  );

  const loadMore = async () => {
    if (!meta?.hasNextPage || loadingMore) {
      return;
    }
    const next = meta.page + 1;
    await fetchPage(next, true);
  };

  const isModernVariant = tasksDesignVariant === "modern";
  const modernCardStyle = isModernVariant
    ? { backgroundColor: "#f8fbff", borderColor: "#d7dfec" }
    : undefined;

  return (
    <ScreenContainer>
      <Text style={[styles.title, { color: colors.textPrimary, textAlign }]}>{t("leaderboard.title")}</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary, textAlign }]}>
        {t("leaderboard.subtitle")}
      </Text>

      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

      {loading ? (
        <LoadingBlock />
      ) : rows.length === 0 ? (
        <EmptyState title={t("leaderboard.noData")} />
      ) : (
        <>
          {rows.map((item) => (
            <Pressable
              key={`${item.rank}-${item.user?.id || "anon"}`}
              onPress={() => {
                if (item.user) {
                  navigation.navigate("UserProfile", {
                    userId: item.user.id,
                    fallbackDisplayName: item.user.displayName,
                    fallbackEmail: item.user.email,
                  });
                }
              }}
            >
              <AppCard style={modernCardStyle}>
                <View style={styles.row}>
                  <Text style={[styles.rank, { color: colors.gold }]}>#{item.rank}</Text>
                  {item.user?.avatarUrl ? (
                    <Image source={{ uri: item.user.avatarUrl }} style={styles.avatarImage} resizeMode="cover" />
                  ) : (
                    <View style={[styles.avatarPlaceholder, { backgroundColor: colors.gold }]}>
                      <Text style={styles.avatarPlaceholderText}>
                        {(item.user?.displayName || item.user?.email || "U").trim().charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.name, { color: colors.textPrimary }]}>
                      {item.user?.displayName || item.user?.email || t("leaderboard.unknownUser")}
                    </Text>
                    <Text style={[styles.points, { color: colors.textSecondary }]}>
                      {t("leaderboard.total")}: {formatPoints(item.totalPoints)} | {t("leaderboard.public")}:{" "}
                      {formatPoints(item.publicScore)}
                    </Text>
                  </View>
                </View>
              </AppCard>
            </Pressable>
          ))}

          {meta?.hasNextPage ? (
            <AppButton
              label={loadingMore ? t("common.loading") : t("common.loadMore")}
              onPress={() => void loadMore()}
              disabled={loadingMore}
              variant="ghost"
            />
          ) : null}
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rank: {
    fontSize: 18,
    fontWeight: "800",
    width: 42,
  },
  name: {
    fontSize: 15,
    fontWeight: "700",
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarPlaceholderText: {
    color: "#1a1607",
    fontWeight: "800",
    fontSize: 16,
  },
  points: {
    fontSize: 13,
  },
  error: {
    fontSize: 13,
    fontWeight: "700",
  },
});
