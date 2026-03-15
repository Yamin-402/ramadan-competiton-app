import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { activitiesApi } from "../../../api/endpoints/activities.api";
import { tasksApi } from "../../../api/endpoints/tasks.api";
import { getApiErrorMessage } from "../../../api/client";
import { AppButton } from "../../../components/AppButton";
import { EmptyState } from "../../../components/EmptyState";
import { LoadingBlock } from "../../../components/LoadingBlock";
import { ScreenContainer } from "../../../components/ScreenContainer";
import { TaskItemCard } from "../../../components/TaskItemCard";
import { TopToast } from "../../../components/TopToast";
import { useAppTheme } from "../../../hooks/use-app-theme";
import { useI18n } from "../../../hooks/use-i18n";
import { useCompetitionStore } from "../../../store/competition-store";
import { Task } from "../../../types/domain";
import { getDailyCompletionLimit, getTaskCategory, getTaskInteractionKind } from "../task-presentation";
import {
  FastingSelection,
  getDefaultFastingSelection,
  toIsDuringFasting,
} from "../fasting-selection";
import { formatPoints } from "../../../utils/format";
import { pointsEvents } from "../../../events/points-events";

function requiresActivityAmount(task: Task): boolean {
  return getTaskInteractionKind(task) === "NUMERIC";
}

function getSignedPointsLabel(value: number | string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return "0";
  }
  if (parsed > 0) {
    return `+${formatPoints(parsed)}`;
  }
  if (parsed < 0) {
    return `-${formatPoints(Math.abs(parsed))}`;
  }
  return "0";
}

export function ForbiddenTasksScreen() {
  const { colors } = useAppTheme();
  const { t, isArabic } = useI18n();
  const competition = useCompetitionStore((state) => state.state);
  const isCompetitionClosed = competition ? !competition.isOpen && !competition.canAct : false;
  const textAlign = isArabic ? "right" : "left";
  const [defaultFastingSelection, setDefaultFastingSelection] = useState<FastingSelection>(
    getDefaultFastingSelection()
  );
  const [tasks, setTasks] = useState<Task[]>([]);
  const [amountByTaskId, setAmountByTaskId] = useState<Record<number, string>>({});
  const [fastingSelectionByTaskId, setFastingSelectionByTaskId] = useState<
    Record<number, FastingSelection>
  >({});
  const [todayCompletionCountByTaskId, setTodayCompletionCountByTaskId] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [submittingTaskId, setSubmittingTaskId] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [all, fastingStatus, todayStatus] = await Promise.all([
        tasksApi.listAvailable(),
        activitiesApi.getFastingStatus(),
        activitiesApi.getTodayTaskStatus(),
      ]);
      const nextDefaultSelection = fastingStatus.isDuringFasting ? "FASTING" : "IFTAR";
      setDefaultFastingSelection(nextDefaultSelection);
      const forbiddenTasks = all.filter((task) => task.type === "FORBIDDEN");
      setTasks(forbiddenTasks);
      setTodayCompletionCountByTaskId(() => {
        const next: Record<number, number> = {};
        for (const row of todayStatus.counts) {
          next[row.taskId] = row.count;
        }
        return next;
      });
      setFastingSelectionByTaskId((current) => {
        const next = { ...current };
        for (const task of forbiddenTasks) {
          if (!next[task.id]) {
            next[task.id] = nextDefaultSelection;
          }
        }
        return next;
      });
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not load forbidden tasks"));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData])
  );

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timer = setTimeout(() => {
      setSuccessMessage(null);
    }, 2400);

    return () => clearTimeout(timer);
  }, [successMessage]);

  const handleLogForbidden = async (task: Task) => {
    setError(null);
    setSuccessMessage(null);
    if (isCompetitionClosed) {
      setError(t("competition.closedMessage"));
      return;
    }
    const dailyLimit = getDailyCompletionLimit(task);
    const currentCount = todayCompletionCountByTaskId[task.id] || 0;
    if (dailyLimit !== null && currentCount >= dailyLimit) {
      setError(t("tasks.alreadyLoggedToday"));
      return;
    }

    const amountRaw = amountByTaskId[task.id]?.trim() || "";
    const requiresAmount = requiresActivityAmount(task);
    let parsedAmount: number | undefined = undefined;

    if (requiresAmount) {
      if (!amountRaw) {
        setError(t("tasks.amountRequired", { task: task.title }));
        return;
      }

      const value = Number(amountRaw);
      if (Number.isNaN(value)) {
        setError(t("tasks.amountInvalid", { task: task.title }));
        return;
      }

      parsedAmount = value;
    }

    setSubmittingTaskId(task.id);
    try {
      const fastingSelection = fastingSelectionByTaskId[task.id] || defaultFastingSelection;
      const activity = await activitiesApi.createTaskCompletion({
        taskId: task.id,
        amount: parsedAmount,
        isDuringFasting: toIsDuringFasting(fastingSelection),
      });
      setTodayCompletionCountByTaskId((prev) => ({ ...prev, [task.id]: (prev[task.id] || 0) + 1 }));
      setSuccessMessage(
        t("tasks.loggedPoints", {
          points: getSignedPointsLabel(activity.effectivePoints),
        })
      );
      pointsEvents.notify();
      setAmountByTaskId((prev) => ({ ...prev, [task.id]: "" }));
      await loadData();
    } catch (err) {
      const message = getApiErrorMessage(err, "Could not log forbidden task");
      if (message.toLowerCase().includes("already logged")) {
        setTodayCompletionCountByTaskId((prev) => ({ ...prev, [task.id]: Math.max(prev[task.id] || 1, 1) }));
        setError(t("tasks.alreadyLoggedToday"));
      } else {
        setError(message);
      }
    } finally {
      setSubmittingTaskId(null);
    }
  };

  return (
    <ScreenContainer fixedOverlay={successMessage ? <TopToast message={successMessage} tone="error" /> : null}>
      <View style={[styles.warningBox, { borderColor: colors.warning, backgroundColor: colors.cardSoft }]}>
        <Text style={[styles.warningTitle, { color: colors.warning, textAlign }]}>
          {t("forbidden.title")}
        </Text>
        <Text style={[styles.warningText, { color: colors.textSecondary, textAlign }]}>
          {t("forbidden.subtitle")}
        </Text>
      </View>

      {isCompetitionClosed ? (
        <View style={[styles.closedBox, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Text style={[styles.warningTitle, { color: colors.textPrimary, textAlign }]}>
            {t("competition.closedTitle")}
          </Text>
          <Text style={[styles.warningText, { color: colors.textSecondary, textAlign }]}>
            {t("competition.closedMessage")}
          </Text>
        </View>
      ) : null}

      <AppButton label={t("common.refresh")} variant="ghost" onPress={() => void loadData()} />
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

      {loading ? (
        <LoadingBlock />
      ) : tasks.length === 0 ? (
        <EmptyState title={t("forbidden.noTasksTitle")} subtitle={t("forbidden.noTasksSubtitle")} />
      ) : (
        tasks.map((task) => (
          (() => {
            const categoryValue = getTaskCategory(task, isArabic ? "ar" : "en");
            return (
          <TaskItemCard
            key={task.id}
            task={task}
            categoryLabel={
              categoryValue.toLowerCase() === "forbidden" ? t("tasks.categoryForbidden") : categoryValue
            }
            amountValue={amountByTaskId[task.id] || ""}
            onAmountChange={(value) => setAmountByTaskId((prev) => ({ ...prev, [task.id]: value }))}
            onLog={() => void handleLogForbidden(task)}
            logging={submittingTaskId === task.id}
            forbiddenStyle
            completedToday={
              (() => {
                const limit = getDailyCompletionLimit(task);
                if (limit === null) {
                  return false;
                }
                return (todayCompletionCountByTaskId[task.id] || 0) >= limit;
              })()
            }
            fastingSelection={fastingSelectionByTaskId[task.id] || defaultFastingSelection}
            onFastingSelectionChange={(value) =>
              setFastingSelectionByTaskId((prev) => ({ ...prev, [task.id]: value }))
            }
            actionsDisabled={isCompetitionClosed}
          />
            );
          })()
        ))
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  warningBox: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  warningText: {
    fontSize: 13,
    lineHeight: 18,
  },
  closedBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  error: {
    fontSize: 13,
    fontWeight: "700",
  },
});
