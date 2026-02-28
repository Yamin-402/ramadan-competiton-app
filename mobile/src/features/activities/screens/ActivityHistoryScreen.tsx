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

function getActivityMetadata(item: Activity): Record<string, unknown> | null {
  if (!item.metadata || typeof item.metadata !== "object" || Array.isArray(item.metadata)) {
    return null;
  }

  return item.metadata as Record<string, unknown>;
}

function getTaskSnapshot(item: Activity) {
  const metadata = getActivityMetadata(item);
  const snapshotRaw = metadata?.taskSnapshot;
  const snapshot =
    snapshotRaw && typeof snapshotRaw === "object" && !Array.isArray(snapshotRaw)
      ? (snapshotRaw as Record<string, unknown>)
      : null;

  const flowTypeFromTask =
    item.task?.config && typeof item.task.config === "object"
      ? String((item.task.config as Record<string, unknown>).taskFlowType || "").toUpperCase()
      : "";
  const flowTypeFromSnapshot =
    snapshot && typeof snapshot.flowType === "string" ? snapshot.flowType.trim().toUpperCase() : "";

  return {
    title:
      (snapshot && typeof snapshot.title === "string" ? snapshot.title : null) ||
      item.task?.title ||
      null,
    type:
      (snapshot && typeof snapshot.type === "string" ? snapshot.type.trim().toUpperCase() : null) ||
      item.task?.type ||
      null,
    flowType: flowTypeFromSnapshot || flowTypeFromTask || "",
    basePoints:
      (snapshot && Number.isFinite(Number(snapshot.basePoints)) ? Number(snapshot.basePoints) : null) ||
      Number(item.task?.basePoints),
  };
}

function getTaskTypeLabel(item: Activity, t: ReturnType<typeof useI18n>["t"]) {
  if (item.type === "DAILY_QUESTION_ANSWER") {
    return t("activityHistory.dailyQuestion");
  }
  if (item.type === "MANUAL_ADJUSTMENT") {
    return t("activityHistory.manualAdjustment");
  }

  const snapshot = getTaskSnapshot(item);
  const flowType = snapshot.flowType;
  if (flowType === "TIMED") {
    return t("tasks.typeTimed");
  }

  const type = snapshot.type || "NORMAL";
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

function getActivityTitle(item: Activity, t: ReturnType<typeof useI18n>["t"]) {
  if (item.type === "DAILY_QUESTION_ANSWER") {
    return t("activityHistory.dailyQuestion");
  }
  if (item.type === "MANUAL_ADJUSTMENT") {
    return t("activityHistory.manualAdjustment");
  }

  return getTaskSnapshot(item).title || t("activityHistory.taskEntry");
}

function getAnswerTypeLabel(
  answerType: unknown,
  t: ReturnType<typeof useI18n>["t"]
): string | null {
  const type = typeof answerType === "string" ? answerType.trim().toUpperCase() : "";
  if (!type) {
    return null;
  }

  if (type === "TEXT") {
    return t("activityHistory.answerTypeText");
  }
  if (type === "SINGLE_CHOICE") {
    return t("activityHistory.answerTypeSingleChoice");
  }
  if (type === "MULTIPLE_CHOICE") {
    return t("activityHistory.answerTypeMultipleChoice");
  }
  if (type === "BOOLEAN") {
    return t("activityHistory.answerTypeBoolean");
  }

  return type;
}

function getTaskFlowType(item: Activity): string {
  return getTaskSnapshot(item).flowType;
}

function normalizeInlineTaskKey(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

function getInlineTaskLabelFromTaskConfig(
  item: Activity,
  key: string,
  isArabic: boolean
): string | null {
  const config = item.task?.config;
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return null;
  }

  const rawInlineTasks = (config as Record<string, unknown>).conditionalInlineTasks;
  if (!Array.isArray(rawInlineTasks)) {
    return null;
  }

  const wanted = normalizeInlineTaskKey(key);
  const matched = rawInlineTasks.find((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return false;
    }
    const row = entry as Record<string, unknown>;
    return normalizeInlineTaskKey(row.key) === wanted;
  });

  if (!matched || typeof matched !== "object" || Array.isArray(matched)) {
    return null;
  }

  const row = matched as Record<string, unknown>;
  const labelAr = typeof row.titleAr === "string" ? row.titleAr.trim() : "";
  const labelEn = typeof row.titleEn === "string" ? row.titleEn.trim() : "";
  const label = isArabic ? labelAr || labelEn : labelEn || labelAr;
  return label || null;
}

function friendlyInlineKeyLabel(key: string): string {
  const cleaned = key.replace(/[_-]+/g, " ").trim();
  if (!cleaned) {
    return key;
  }

  return cleaned;
}

function resolveEnteredAmount(item: Activity): number | null {
  const snapshot = getTaskSnapshot(item);
  const flowType = snapshot.flowType;
  const isAmountTask =
    flowType === "TIMED" || flowType === "COUNTER" || snapshot.type === "COUNTER";
  if (!isAmountTask) {
    return null;
  }

  const metadata = getActivityMetadata(item);
  if (!metadata) {
    return null;
  }

  const directAmount = Number(metadata.activityAmount);
  if (Number.isFinite(directAmount)) {
    return directAmount;
  }

  const pointUnits = Number(metadata.pointUnits);
  if (Number.isFinite(pointUnits)) {
    if (flowType === "TIMED") {
      return pointUnits * 60;
    }
    return pointUnits;
  }

  const effectiveBasePoints = Math.abs(toNumber(item.basePoints));
  const taskBasePoints = Math.abs(Number(snapshot.basePoints));
  if (Number.isFinite(taskBasePoints) && taskBasePoints > 0 && Number.isFinite(effectiveBasePoints)) {
    const units = effectiveBasePoints / taskBasePoints;
    if (Number.isFinite(units) && units > 0) {
      if (snapshot.flowType === "TIMED") {
        return units * 60;
      }
      return units;
    }
  }

  return null;
}

function getInlineMinorTaskLabels(
  item: Activity,
  isArabic: boolean
): string[] {
  const metadata = getActivityMetadata(item);
  if (!metadata) {
    return [];
  }

  const selectedInlineTasksRaw = metadata.selectedInlineTasks;
  if (Array.isArray(selectedInlineTasksRaw)) {
    const labels = selectedInlineTasksRaw
      .map((entry) => {
        if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
          return null;
        }

        const row = entry as Record<string, unknown>;
        const labelAr = typeof row.titleAr === "string" ? row.titleAr.trim() : "";
        const labelEn = typeof row.titleEn === "string" ? row.titleEn.trim() : "";
        const label = isArabic ? labelAr || labelEn : labelEn || labelAr;
        return label || null;
      })
      .filter((label): label is string => Boolean(label));

    if (labels.length > 0) {
      return labels;
    }
  }

  const selectedInlineTaskKeysRaw = metadata.selectedInlineTaskKeys;
  if (!Array.isArray(selectedInlineTaskKeysRaw)) {
    return [];
  }

  return selectedInlineTaskKeysRaw
    .map((value) => String(value).trim())
    .filter(Boolean)
    .map((key) => getInlineTaskLabelFromTaskConfig(item, key, isArabic) || friendlyInlineKeyLabel(key));
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
    const taskRows = rows.filter((row) =>
      row.type === "TASK_COMPLETION" ||
      row.type === "DAILY_QUESTION_ANSWER" ||
      row.type === "MANUAL_ADJUSTMENT"
    );
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
        .filter(
          (row) =>
            row.type === "TASK_COMPLETION" ||
            row.type === "DAILY_QUESTION_ANSWER" ||
            row.type === "MANUAL_ADJUSTMENT"
        )
        .reduce((sum, row) => sum + toNumber(row.effectivePoints), 0),
    [rows]
  );
  const pointsGained = useMemo(
    () =>
      rows
        .filter(
          (row) =>
            row.type === "TASK_COMPLETION" ||
            row.type === "DAILY_QUESTION_ANSWER" ||
            row.type === "MANUAL_ADJUSTMENT"
        )
        .map((row) => toNumber(row.effectivePoints))
        .filter((value) => value > 0)
        .reduce((sum, value) => sum + value, 0),
    [rows]
  );
  const pointsLost = useMemo(
    () =>
      rows
        .filter(
          (row) =>
            row.type === "TASK_COMPLETION" ||
            row.type === "DAILY_QUESTION_ANSWER" ||
            row.type === "MANUAL_ADJUSTMENT"
        )
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
                      const enteredAmount = resolveEnteredAmount(item);
                      const snapshot = getTaskSnapshot(item);
                      const metadata = getActivityMetadata(item);
                      const flowType = getTaskFlowType(item);
                      const isAmountTask =
                        item.type === "TASK_COMPLETION" &&
                        (flowType === "TIMED" || flowType === "COUNTER" || snapshot.type === "COUNTER");
                      const counterAmount =
                        item.counterDeltas.length > 0
                          ? item.counterDeltas
                              .map((delta) => `${delta.counter.name}: ${formatPoints(delta.delta)}`)
                              .join(" | ")
                          : "-";
                      const showAmount = isAmountTask && (enteredAmount !== null || item.counterDeltas.length > 0);
                      const amountLabel =
                        enteredAmount !== null
                          ? snapshot.flowType === "TIMED"
                            ? `${formatPoints(Math.round(enteredAmount))} ${t("activityHistory.minutes")}`
                            : formatPoints(enteredAmount)
                          : counterAmount;
                      const inlineMinorTasks = getInlineMinorTaskLabels(item, isArabic);
                      const dailyQuestionResult =
                        item.type === "DAILY_QUESTION_ANSWER"
                          ? metadata?.isCorrect === true
                            ? t("activityHistory.correct")
                            : metadata?.isCorrect === false
                              ? t("activityHistory.wrong")
                              : t("daily.pending")
                          : null;
                      const dailyQuestionAnswerType =
                        item.type === "DAILY_QUESTION_ANSWER"
                          ? getAnswerTypeLabel(metadata?.answerType, t) || t("activityHistory.answerTypeUnknown")
                          : null;

                      return (
                        <View key={item.id} style={[styles.row, variantRowStyle]}>
                          <View style={styles.rowTop}>
                            <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>
                              {getActivityTitle(item, t)}
                            </Text>
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
                          {item.type === "TASK_COMPLETION" ? (
                            <Text style={[styles.rowMeta, { color: colors.textSecondary, textAlign }]}>
                              {item.isDuringFasting
                                ? t("activityHistory.duringFasting")
                                : t("activityHistory.outsideFasting")}
                            </Text>
                          ) : null}
                          {showAmount ? (
                            <Text style={[styles.rowMeta, { color: colors.textSecondary, textAlign }]}>
                              {t("activityHistory.amount")}: {amountLabel}
                            </Text>
                          ) : null}
                          {item.type === "MANUAL_ADJUSTMENT" && item.note ? (
                            <Text style={[styles.rowMeta, { color: colors.textSecondary, textAlign }]}>
                              {t("activityHistory.note")}: {item.note}
                            </Text>
                          ) : null}
                          {item.type === "DAILY_QUESTION_ANSWER" && dailyQuestionResult ? (
                            <Text style={[styles.rowMeta, { color: colors.textSecondary, textAlign }]}>
                              {t("activityHistory.dailyResult")}: {dailyQuestionResult}
                            </Text>
                          ) : null}
                          {item.type === "DAILY_QUESTION_ANSWER" ? (
                            <Text style={[styles.rowMeta, { color: colors.textSecondary, textAlign }]}>
                              {t("activityHistory.answerType")}: {dailyQuestionAnswerType}
                            </Text>
                          ) : null}
                          {item.type === "TASK_COMPLETION" &&
                          snapshot.type === "CONDITIONAL" &&
                          inlineMinorTasks.length > 0 ? (
                            <Text style={[styles.rowMeta, { color: colors.textSecondary, textAlign }]}>
                              {t("activityHistory.minorTasks")}: {inlineMinorTasks.join(" | ")}
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
