import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { activitiesApi } from "../../../api/endpoints/activities.api";
import { getApiErrorMessage } from "../../../api/client";
import { AppCard } from "../../../components/AppCard";
import { EmptyState } from "../../../components/EmptyState";
import { LoadingBlock } from "../../../components/LoadingBlock";
import { ScreenContainer } from "../../../components/ScreenContainer";
import { useAppTheme } from "../../../hooks/use-app-theme";
import { useI18n } from "../../../hooks/use-i18n";
import { Activity } from "../../../types/domain";
import { formatPoints } from "../../../utils/format";

interface RankedValue {
  label: string;
  value: number;
}

function toNumber(value: number | string): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function ActivityStatsScreen() {
  const { colors } = useAppTheme();
  const { t, isArabic } = useI18n();
  const textAlign = isArabic ? "right" : "left";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Activity[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await activitiesApi.listMine(500);
      setRows(data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not load statistics"));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData])
  );

  const stats = useMemo(() => {
    let totalPoints = 0;
    let fastingCount = 0;
    let forbiddenCount = 0;
    const taskTotals = new Map<string, number>();
    const counterTotals = new Map<string, number>();

    for (const row of rows) {
      totalPoints += toNumber(row.effectivePoints);
      if (row.isDuringFasting) {
        fastingCount += 1;
      }
      if (row.isForbidden) {
        forbiddenCount += 1;
      }

      const taskName = row.task?.title || row.type;
      taskTotals.set(taskName, (taskTotals.get(taskName) || 0) + 1);

      for (const counterDelta of row.counterDeltas) {
        const label = counterDelta.counter.unit
          ? `${counterDelta.counter.name} (${counterDelta.counter.unit})`
          : counterDelta.counter.name;
        counterTotals.set(label, (counterTotals.get(label) || 0) + toNumber(counterDelta.delta));
      }
    }

    const topTasks = Array.from(taskTotals.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const topCounters = Array.from(counterTotals.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
      .slice(0, 5);

    return {
      totalActivities: rows.length,
      totalPoints,
      fastingCount,
      forbiddenCount,
      topTasks,
      topCounters,
    };
  }, [rows]);

  const renderRankedBars = (items: RankedValue[], accentColor: string) => {
    if (items.length === 0) {
      return <Text style={{ color: colors.textSecondary }}>{t("activityStats.noDataShort")}</Text>;
    }

    const maxValue = Math.max(...items.map((item) => Math.abs(item.value)), 1);
    return items.map((item) => {
      const widthPercent = `${Math.max((Math.abs(item.value) / maxValue) * 100, 8)}%` as `${number}%`;
      return (
        <View key={item.label} style={styles.rankRow}>
          <View style={styles.rankHeader}>
            <Text style={[styles.rankLabel, { color: colors.textPrimary }]}>{item.label}</Text>
            <Text style={[styles.rankValue, { color: colors.textSecondary }]}>{formatPoints(item.value)}</Text>
          </View>
          <View style={[styles.barTrack, { backgroundColor: colors.cardSoft }]}>
            <View style={[styles.barFill, { backgroundColor: accentColor, width: widthPercent }]} />
          </View>
        </View>
      );
    });
  };

  return (
    <ScreenContainer>
      <Text style={[styles.title, { color: colors.textPrimary, textAlign }]}>{t("activityStats.title")}</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary, textAlign }]}>
        {t("activityStats.subtitle")}
      </Text>

      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

      {loading ? (
        <LoadingBlock />
      ) : rows.length === 0 ? (
        <EmptyState title={t("activityStats.noDataTitle")} subtitle={t("activityStats.noDataSubtitle")} />
      ) : (
        <>
          <AppCard>
            <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{stats.totalActivities}</Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
              {t("activityStats.totalLogged")}
            </Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
              {t("activityStats.totalPoints")}: {formatPoints(stats.totalPoints)}
            </Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
              {t("activityStats.duringFasting")}: {stats.fastingCount} | {t("activityStats.forbiddenLogs")}:{" "}
              {stats.forbiddenCount}
            </Text>
          </AppCard>

          <AppCard>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t("activityStats.topTasks")}</Text>
            {renderRankedBars(stats.topTasks, colors.gold)}
          </AppCard>

          <AppCard>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              {t("activityStats.counterTotals")}
            </Text>
            {renderRankedBars(stats.topCounters, colors.success)}
          </AppCard>
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
  metricValue: {
    fontSize: 28,
    fontWeight: "800",
  },
  metricLabel: {
    fontSize: 13,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  rankRow: {
    gap: 4,
  },
  rankHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  rankLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  rankValue: {
    fontSize: 12,
    fontWeight: "700",
  },
  barTrack: {
    width: "100%",
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 999,
  },
  error: {
    fontSize: 13,
    fontWeight: "700",
  },
});
