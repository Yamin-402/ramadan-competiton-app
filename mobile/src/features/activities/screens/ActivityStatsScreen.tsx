import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
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
import { getRamadanDayNumber } from "../../../utils/ramadan";

interface RankedValue {
  label: string;
  value: number;
}

interface DailyPointBar {
  date: string;
  gained: number;
}

function toNumber(value: number | string): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function getDateKey(row: Activity): string {
  if (row.competitionDate) {
    return row.competitionDate;
  }
  return row.occurredAt.slice(0, 10);
}

function formatDateShort(dateKey: string): string {
  const parts = dateKey.split("-");
  if (parts.length !== 3) {
    return dateKey;
  }
  return `${parts[2]}/${parts[1]}`;
}

function formatDayLabel(dateKey: string, isArabic: boolean): string {
  const normalized = dateKey.includes("T") ? dateKey : `${dateKey}T12:00:00.000Z`;
  const ramadanDay = getRamadanDayNumber(new Date(normalized));
  if (ramadanDay > 0) {
    return isArabic ? `يوم ${ramadanDay}` : `Day ${ramadanDay}`;
  }
  return formatDateShort(dateKey);
}

function DailyPointsGraph({
  rows,
  colors,
  t,
  isArabic,
}: {
  rows: DailyPointBar[];
  colors: ReturnType<typeof useAppTheme>["colors"];
  t: ReturnType<typeof useI18n>["t"];
  isArabic: boolean;
}) {
  if (rows.length === 0) {
    return <Text style={{ color: colors.textSecondary }}>{t("activityStats.noDataShort")}</Text>;
  }

  const maxGained = Math.max(...rows.map((row) => row.gained), 1);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.graphScroll}>
      {rows.map((row) => {
        const heightPercent = Math.max((row.gained / maxGained) * 100, 6);
        return (
            <View key={row.date} style={styles.dayBarWrap}>
              <View style={[styles.barTrack, { backgroundColor: colors.cardSoft }]}>
                <View
                  style={[
                  styles.barFillVertical,
                  {
                    backgroundColor: colors.gold,
                    height: `${heightPercent}%`,
                  },
                ]}
              />
            </View>
            <Text style={[styles.dayBarLabel, { color: colors.textSecondary }]}>
              {formatDayLabel(row.date, isArabic)}
            </Text>
            <Text style={[styles.dayBarValue, { color: colors.textPrimary }]}>+{formatPoints(row.gained)}</Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

function CounterGraph({
  rows,
  colors,
  t,
}: {
  rows: RankedValue[];
  colors: ReturnType<typeof useAppTheme>["colors"];
  t: ReturnType<typeof useI18n>["t"];
}) {
  if (rows.length === 0) {
    return <Text style={{ color: colors.textSecondary }}>{t("activityStats.noDataShort")}</Text>;
  }

  const maxValue = Math.max(...rows.map((item) => Math.abs(item.value)), 1);
  return (
    <View style={styles.counterGraphWrap}>
      {rows.map((item) => {
        const widthPercent = `${Math.max((Math.abs(item.value) / maxValue) * 100, 8)}%` as `${number}%`;
        const isNegative = item.value < 0;
        return (
          <View key={item.label} style={styles.rankRow}>
            <View style={styles.rankHeader}>
              <Text style={[styles.rankLabel, { color: colors.textPrimary }]}>{item.label}</Text>
              <Text style={[styles.rankValue, { color: colors.textSecondary }]}>{formatPoints(item.value)}</Text>
            </View>
            <View style={[styles.barTrackHorizontal, { backgroundColor: colors.cardSoft }]}>
              <View
                style={[
                  styles.barFillHorizontal,
                  {
                    backgroundColor: isNegative ? colors.danger : colors.success,
                    width: widthPercent,
                  },
                ]}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
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

  const visibleRows = useMemo(
    () => rows.filter((row) => row.type !== "MANUAL_ADJUSTMENT" && row.type !== "SYSTEM"),
    [rows]
  );

  const stats = useMemo(() => {
    let totalPoints = 0;
    let fastingCount = 0;
    let forbiddenCount = 0;
    const taskTotals = new Map<string, number>();
    const counterTotals = new Map<string, number>();
    const dailyPoints = new Map<string, number>();

    for (const row of visibleRows) {
      const effective = toNumber(row.effectivePoints);
      totalPoints += effective;
      if (row.isDuringFasting) {
        fastingCount += 1;
      }
      if (row.isForbidden) {
        forbiddenCount += 1;
      }

      const taskName = row.task?.title || row.type;
      taskTotals.set(taskName, (taskTotals.get(taskName) || 0) + 1);

      const dateKey = getDateKey(row);
      if (effective > 0) {
        dailyPoints.set(dateKey, (dailyPoints.get(dateKey) || 0) + effective);
      }

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
      .slice(0, 6);

    const pointsByDay = Array.from(dailyPoints.entries())
      .map(([date, gained]) => ({ date, gained }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-10);

    return {
      totalActivities: visibleRows.length,
      totalPoints,
      fastingCount,
      forbiddenCount,
      topTasks,
      topCounters,
      pointsByDay,
    };
  }, [visibleRows]);

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
          <View style={[styles.barTrackHorizontal, { backgroundColor: colors.cardSoft }]}>
            <View style={[styles.barFillHorizontal, { backgroundColor: accentColor, width: widthPercent }]} />
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
      ) : visibleRows.length === 0 ? (
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
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              {t("activityStats.pointsTrend")}
            </Text>
            <DailyPointsGraph rows={stats.pointsByDay} colors={colors} t={t} isArabic={isArabic} />
          </AppCard>

          <AppCard>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t("activityStats.topTasks")}</Text>
            {renderRankedBars(stats.topTasks, colors.gold)}
          </AppCard>

          <AppCard>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              {t("activityStats.counterTrend")}
            </Text>
            <CounterGraph rows={stats.topCounters} colors={colors} t={t} />
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
  graphScroll: {
    paddingVertical: 8,
    gap: 10,
  },
  dayBarWrap: {
    width: 42,
    alignItems: "center",
    gap: 4,
  },
  barTrack: {
    width: 22,
    height: 110,
    borderRadius: 999,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  barFillVertical: {
    width: "100%",
    borderRadius: 999,
  },
  dayBarLabel: {
    fontSize: 10,
    fontWeight: "600",
  },
  dayBarValue: {
    fontSize: 10,
    fontWeight: "700",
  },
  counterGraphWrap: {
    gap: 10,
  },
  barTrackHorizontal: {
    width: "100%",
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
  },
  barFillHorizontal: {
    height: "100%",
    borderRadius: 999,
  },
  error: {
    fontSize: 13,
    fontWeight: "700",
  },
});
