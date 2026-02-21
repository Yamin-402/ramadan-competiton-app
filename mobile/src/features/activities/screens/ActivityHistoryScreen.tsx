import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { activitiesApi } from "../../../api/endpoints/activities.api";
import { getApiErrorMessage } from "../../../api/client";
import { AppCard } from "../../../components/AppCard";
import { EmptyState } from "../../../components/EmptyState";
import { LoadingBlock } from "../../../components/LoadingBlock";
import { ScreenContainer } from "../../../components/ScreenContainer";
import { useAppTheme } from "../../../hooks/use-app-theme";
import { useI18n } from "../../../hooks/use-i18n";
import { useSettingsStore } from "../../../store/settings-store";
import { Activity } from "../../../types/domain";
import { formatPoints } from "../../../utils/format";
import { getRamadanDayNumber } from "../../../utils/ramadan";

interface DayGroup {
  key: string;
  ramadanDay: number;
  items: Activity[];
  dayPoints: number;
}

function toNumber(value: number | string): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function getCairoDayKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getCairoTimeLabel(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: "Africa/Cairo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function getCompetitionDayKey(activity: Activity): string {
  if (activity.competitionDate) {
    return activity.competitionDate;
  }

  return getCairoDayKey(new Date(activity.occurredAt));
}

function getRamadanDayByCompetitionDate(competitionDate: string) {
  const normalized = competitionDate.includes("T")
    ? competitionDate
    : `${competitionDate}T12:00:00.000Z`;

  return getRamadanDayNumber(new Date(normalized));
}

function formatSignedPoints(value: number | string) {
  const points = toNumber(value);
  if (points > 0) {
    return `+${formatPoints(points)}`;
  }
  if (points < 0) {
    return `-${formatPoints(Math.abs(points))}`;
  }
  return "0";
}

function getTaskTypeLabel(item: Activity, t: ReturnType<typeof useI18n>["t"]) {
  const flowType =
    item.task?.config && typeof item.task.config === "object"
      ? String((item.task.config as Record<string, unknown>).taskFlowType || "").toUpperCase()
      : "";
  if (flowType === "TIMED") {
    return t("tasks.typeTimed");
  }

  const type = item.task?.type || "NORMAL";
  if (type === "COUNTER") {
    return t("tasks.typeNumeric");
  }
  if (type === "CONDITIONAL") {
    return t("tasks.typeConditional");
  }
  if (type === "FORBIDDEN") {
    return t("tasks.categoryForbidden");
  }
  if (type === "STREAK") {
    return t("tasks.streakLabel");
  }
  return t("tasks.typeNormal");
}

export function ActivityHistoryScreen() {
  const { colors } = useAppTheme();
  const { t, isArabic } = useI18n();
  const tasksDesignVariant = useSettingsStore((state) => state.tasksDesignVariant);
  const isModernVariant = tasksDesignVariant === "modern";
  const isRamadanVariant = tasksDesignVariant === "ramadan_modern";
  const textAlign = isArabic ? "right" : "left";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Activity[]>([]);
  const [expandedByDay, setExpandedByDay] = useState<Record<string, boolean>>({});

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await activitiesApi.listMine(500);
      setRows(data);
      const firstActivity = data[0];
      if (firstActivity) {
        const firstDayKey = getCompetitionDayKey(firstActivity);
        setExpandedByDay({ [firstDayKey]: true });
      } else {
        setExpandedByDay({});
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not load history"));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData])
  );

  const groupedDays = useMemo<DayGroup[]>(() => {
    const taskRows = rows.filter((row) => row.type === "TASK_COMPLETION" && row.task);
    const map = new Map<string, DayGroup>();

    for (const row of taskRows) {
      const dayKey = getCompetitionDayKey(row);
      const existing = map.get(dayKey);

      if (!existing) {
        map.set(dayKey, {
          key: dayKey,
          ramadanDay: getRamadanDayByCompetitionDate(dayKey),
          items: [row],
          dayPoints: toNumber(row.effectivePoints),
        });
        continue;
      }

      existing.items.push(row);
      existing.dayPoints += toNumber(row.effectivePoints);
    }

    return Array.from(map.values())
      .map((day) => ({
        ...day,
        items: day.items.sort(
          (left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime()
        ),
      }))
      .sort((left, right) => right.key.localeCompare(left.key));
  }, [rows]);

  const overallPoints = useMemo(
    () =>
      rows
        .filter((row) => row.type === "TASK_COMPLETION" && row.task)
        .reduce((sum, row) => sum + toNumber(row.effectivePoints), 0),
    [rows]
  );
  const pointsGained = useMemo(
    () =>
      rows
        .filter((row) => row.type === "TASK_COMPLETION" && row.task)
        .map((row) => toNumber(row.effectivePoints))
        .filter((value) => value > 0)
        .reduce((sum, value) => sum + value, 0),
    [rows]
  );
  const pointsLost = useMemo(
    () =>
      rows
        .filter((row) => row.type === "TASK_COMPLETION" && row.task)
        .map((row) => toNumber(row.effectivePoints))
        .filter((value) => value < 0)
        .reduce((sum, value) => sum + Math.abs(value), 0),
    [rows]
  );

  const toggleDay = (key: string) => {
    setExpandedByDay((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const variantCardStyle = isModernVariant
    ? { borderColor: "#d7dfec", backgroundColor: "#f8fbff" }
    : isRamadanVariant
      ? { borderColor: "#ceb983", backgroundColor: "#fff8e7" }
      : undefined;
  const variantDayHeaderStyle = isModernVariant
    ? { backgroundColor: "#edf4ff", borderColor: "#d0deef" }
    : isRamadanVariant
      ? { backgroundColor: "#f9edd1", borderColor: "#d6bf8e" }
      : { borderColor: colors.border };
  const variantRowStyle = isModernVariant
    ? { backgroundColor: "#f5f9ff", borderColor: "#d8e3f2" }
    : isRamadanVariant
      ? { backgroundColor: "#fff5dc", borderColor: "#dbc89b" }
      : { borderColor: colors.border };

  return (
    <ScreenContainer>
      <Text style={[styles.title, { color: colors.textPrimary, textAlign }]}>{t("activityHistory.title")}</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary, textAlign }]}>
        {t("activityHistory.subtitle")}
      </Text>

      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

      {loading ? (
        <LoadingBlock />
      ) : groupedDays.length === 0 ? (
        <EmptyState title={t("activityHistory.noDataTitle")} subtitle={t("activityHistory.noDataSubtitle")} />
      ) : (
        <>
          <AppCard
            style={variantCardStyle}
          >
            <View style={styles.topSummaryRow}>
              <View style={[styles.metricItem, { borderColor: colors.border }]}>
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{t("activityHistory.dayTotal")}</Text>
                <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
                  {formatPoints(groupedDays[0]?.dayPoints || 0)}
                </Text>
              </View>
              <View style={[styles.metricItem, { borderColor: colors.border }]}>
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{t("activityHistory.overallTotal")}</Text>
                <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{formatPoints(overallPoints)}</Text>
              </View>
              <View style={[styles.metricItem, { borderColor: colors.border }]}>
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{t("activityHistory.pointsGained")}</Text>
                <Text style={[styles.metricValue, { color: colors.success }]}>{formatPoints(pointsGained)}</Text>
              </View>
              <View style={[styles.metricItem, { borderColor: colors.border }]}>
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{t("activityHistory.pointsLost")}</Text>
                <Text style={[styles.metricValue, { color: colors.danger }]}>{formatPoints(pointsLost)}</Text>
              </View>
            </View>
          </AppCard>

          {groupedDays.map((day) => {
            const isExpanded = expandedByDay[day.key] || false;
            const dayPointsGained = day.items
              .map((item) => toNumber(item.effectivePoints))
              .filter((value) => value > 0)
              .reduce((sum, value) => sum + value, 0);
            const dayPointsLost = day.items
              .map((item) => toNumber(item.effectivePoints))
              .filter((value) => value < 0)
              .reduce((sum, value) => sum + Math.abs(value), 0);
            const dayLabel =
              day.ramadanDay > 0
                ? t("activityHistory.ramadanDay", { day: day.ramadanDay })
                : t("activityHistory.nonRamadanDay", { date: day.key });

            return (
              <AppCard
                key={day.key}
                style={variantCardStyle}
              >
                <Pressable
                  onPress={() => toggleDay(day.key)}
                  style={[styles.dayHeader, variantDayHeaderStyle]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.dayTitle, { color: colors.textPrimary, textAlign }]}>
                      {dayLabel}
                    </Text>
                    <Text style={[styles.dayMeta, { color: colors.textSecondary, textAlign }]}>
                      {t("activityHistory.activities")}: {day.items.length} | {t("activityHistory.dayPoints")}:{" "}
                      {formatPoints(day.dayPoints)}
                    </Text>
                  </View>
                  <Text style={[styles.expandIcon, { color: colors.gold }]}>{isExpanded ? "-" : "+"}</Text>
                </Pressable>

                {isExpanded ? (
                  <View style={styles.dayContent}>
                    <View style={styles.daySummaryRow}>
                      <View style={[styles.daySummaryItem, { borderColor: colors.border }]}>
                        <Text style={[styles.daySummaryLabel, { color: colors.textSecondary }]}>
                          {t("activityHistory.dayTotal")}
                        </Text>
                        <Text style={[styles.daySummaryValue, { color: colors.textPrimary }]}>
                          {formatPoints(day.dayPoints)}
                        </Text>
                      </View>
                      <View style={[styles.daySummaryItem, { borderColor: colors.border }]}>
                        <Text style={[styles.daySummaryLabel, { color: colors.textSecondary }]}>
                          {t("activityHistory.pointsGained")}
                        </Text>
                        <Text style={[styles.daySummaryValue, { color: colors.success }]}>
                          {formatPoints(dayPointsGained)}
                        </Text>
                      </View>
                      <View style={[styles.daySummaryItem, { borderColor: colors.border }]}>
                        <Text style={[styles.daySummaryLabel, { color: colors.textSecondary }]}>
                          {t("activityHistory.pointsLost")}
                        </Text>
                        <Text style={[styles.daySummaryValue, { color: colors.danger }]}>
                          {formatPoints(dayPointsLost)}
                        </Text>
                      </View>
                    </View>
                    {day.items.map((item) => {
                      const counterAmount =
                        item.counterDeltas.length > 0
                          ? item.counterDeltas
                              .map((delta) => `${delta.counter.name}: ${formatPoints(delta.delta)}`)
                              .join(" | ")
                          : "-";

                      return (
                        <View key={item.id} style={[styles.row, variantRowStyle]}>
                          <View style={styles.rowTop}>
                            <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>{item.task?.title || item.type}</Text>
                            <Text
                              style={[
                                styles.rowPoints,
                                {
                                  color: toNumber(item.effectivePoints) >= 0 ? colors.success : colors.danger,
                                },
                              ]}
                            >
                              {formatSignedPoints(item.effectivePoints)}
                            </Text>
                          </View>

                          <Text style={[styles.rowMeta, { color: colors.textSecondary, textAlign }]}>
                            {t("activityHistory.time")}: {getCairoTimeLabel(new Date(item.occurredAt))}
                          </Text>
                          <Text style={[styles.rowMeta, { color: colors.textSecondary, textAlign }]}>
                            {t("activityHistory.taskType")}: {getTaskTypeLabel(item, t)}
                          </Text>
                          <Text style={[styles.rowMeta, { color: colors.textSecondary, textAlign }]}>
                            {item.isDuringFasting
                              ? t("activityHistory.duringFasting")
                              : t("activityHistory.outsideFasting")}
                          </Text>
                          {item.counterDeltas.length > 0 ? (
                            <Text style={[styles.rowMeta, { color: colors.textSecondary, textAlign }]}>
                              {t("activityHistory.amount")}: {counterAmount}
                            </Text>
                          ) : null}
                        </View>
                      );
                    })}
                  </View>
                ) : null}
              </AppCard>
            );
          })}
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
  topSummaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metricItem: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: "48%",
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: "700",
  },
  metricValue: {
    fontSize: 14,
    fontWeight: "800",
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  dayTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  dayMeta: {
    fontSize: 12,
  },
  expandIcon: {
    fontSize: 26,
    fontWeight: "700",
    lineHeight: 26,
  },
  dayContent: {
    gap: 8,
  },
  daySummaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  daySummaryItem: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: "31%",
  },
  daySummaryLabel: {
    fontSize: 11,
    fontWeight: "700",
  },
  daySummaryValue: {
    fontSize: 13,
    fontWeight: "800",
  },
  row: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    gap: 2,
  },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
  },
  rowPoints: {
    fontSize: 13,
    fontWeight: "700",
  },
  rowMeta: {
    fontSize: 12,
  },
  error: {
    fontSize: 13,
    fontWeight: "700",
  },
});
