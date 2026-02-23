import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import { Dispatch, SetStateAction, useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { activitiesApi } from "../../../api/endpoints/activities.api";
import { streaksApi } from "../../../api/endpoints/streaks.api";
import { tasksApi } from "../../../api/endpoints/tasks.api";
import { getApiErrorMessage } from "../../../api/client";
import { AppButton } from "../../../components/AppButton";
import { AppCard } from "../../../components/AppCard";
import { EmptyState } from "../../../components/EmptyState";
import { LoadingBlock } from "../../../components/LoadingBlock";
import { ScreenContainer } from "../../../components/ScreenContainer";
import { TaskItemCard } from "../../../components/TaskItemCard";
import { TopToast } from "../../../components/TopToast";
import { useAppTheme } from "../../../hooks/use-app-theme";
import { useI18n } from "../../../hooks/use-i18n";
import { useSettingsStore } from "../../../store/settings-store";
import { Task } from "../../../types/domain";
import { formatPoints } from "../../../utils/format";
import { pointsEvents } from "../../../events/points-events";
import {
  getStreakDaysLeft,
  getStreakGoalDays,
  getConditionalInlineTasks,
  getTaskCategory,
  getDailyCompletionLimit,
  getTaskInteractionKind,
  isAutoConditionalBonusTask,
  isTimedTask,
  isStreakEnabledTask,
  TaskInteractionKind,
} from "../task-presentation";
import {
  FastingSelection,
  getDefaultFastingSelection,
  toIsDuringFasting,
} from "../fasting-selection";

const ALL_CATEGORY = "__ALL__";

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

function getTypeLabel(task: Task, interactionKind: TaskInteractionKind, t: ReturnType<typeof useI18n>["t"]) {
  if (isTimedTask(task)) {
    return t("tasks.typeTimed");
  }

  if (interactionKind === "NUMERIC") {
    return t("tasks.typeNumeric");
  }
  if (interactionKind === "CONDITIONAL") {
    return t("tasks.typeConditional");
  }
  return t("tasks.typeYesNo");
}

function RamadanTimingToggle({
  value,
  onChange,
  t,
}: {
  value: FastingSelection;
  onChange: (value: FastingSelection) => void;
  t: ReturnType<typeof useI18n>["t"];
}) {
  return (
    <View style={styles.ramadanTimingWrap}>
      <Text style={styles.ramadanTimingLabel}>{t("tasks.timing")}</Text>
      <View style={styles.ramadanTimingRow}>
        <Pressable
          onPress={() => onChange("FASTING")}
          style={[styles.ramadanTimingButton, value === "FASTING" && styles.ramadanTimingButtonActive]}
        >
          <Text style={[styles.ramadanTimingButtonText, value === "FASTING" && styles.ramadanTimingButtonTextActive]}>
            {t("tasks.fasting")}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => onChange("IFTAR")}
          style={[styles.ramadanTimingButton, value === "IFTAR" && styles.ramadanTimingButtonActive]}
        >
          <Text style={[styles.ramadanTimingButtonText, value === "IFTAR" && styles.ramadanTimingButtonTextActive]}>
            {t("tasks.iftar")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function ModernTimingToggle({
  value,
  onChange,
  t,
}: {
  value: FastingSelection;
  onChange: (value: FastingSelection) => void;
  t: ReturnType<typeof useI18n>["t"];
}) {
  return (
    <View style={styles.modernTimingWrap}>
      <Text style={styles.modernTimingLabel}>{t("tasks.timing")}</Text>
      <View style={styles.modernTimingRow}>
        <Pressable
          onPress={() => onChange("FASTING")}
          style={[styles.modernTimingButton, value === "FASTING" && styles.modernTimingButtonActive]}
        >
          <Text style={[styles.modernTimingButtonText, value === "FASTING" && styles.modernTimingButtonTextActive]}>
            {t("tasks.fasting")}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => onChange("IFTAR")}
          style={[styles.modernTimingButton, value === "IFTAR" && styles.modernTimingButtonActive]}
        >
          <Text style={[styles.modernTimingButtonText, value === "IFTAR" && styles.modernTimingButtonTextActive]}>
            {t("tasks.iftar")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export function TasksScreen() {
  const { colors } = useAppTheme();
  const { t, isArabic } = useI18n();
  const tasksDesignVariant = useSettingsStore((state) => state.tasksDesignVariant);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [streakByTaskId, setStreakByTaskId] = useState<Record<number, number>>({});
  const [amountByTaskId, setAmountByTaskId] = useState<Record<number, string>>({});
  const [defaultFastingSelection, setDefaultFastingSelection] = useState<FastingSelection>(
    getDefaultFastingSelection()
  );
  const [todayCompletionCountByTaskId, setTodayCompletionCountByTaskId] = useState<Record<number, number>>({});
  const [selectedInlineTaskKeysByTaskId, setSelectedInlineTaskKeysByTaskId] = useState<
    Record<number, string[]>
  >({});
  const [fastingSelectionByTaskId, setFastingSelectionByTaskId] = useState<
    Record<number, FastingSelection>
  >({});
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORY);
  const [loading, setLoading] = useState(true);
  const [submittingTaskId, setSubmittingTaskId] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (showLoader = true) => {
    if (showLoader) {
      setLoading(true);
    }
    setError(null);

    try {
      const [allTasks, streaks, fastingStatus, todayStatus] = await Promise.all([
        tasksApi.listAvailable(),
        streaksApi.listMine(),
        activitiesApi.getFastingStatus(),
        activitiesApi.getTodayTaskStatus(),
      ]);
      const visibleTasks = allTasks
        .filter((task) => task.type !== "FORBIDDEN")
        .sort((left, right) => {
          const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : Number.NaN;
          const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : Number.NaN;
          if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) {
            return leftTime - rightTime;
          }

          return left.id - right.id;
        });
      const nextDefaultSelection = fastingStatus.isDuringFasting ? "FASTING" : "IFTAR";
      setDefaultFastingSelection(nextDefaultSelection);
      setTasks(visibleTasks);
      setTodayCompletionCountByTaskId(() => {
        const next: Record<number, number> = {};
        for (const row of todayStatus.counts) {
          next[row.taskId] = row.count;
        }
        return next;
      });
      setFastingSelectionByTaskId((current) => {
        const next = { ...current };
        for (const task of visibleTasks) {
          if (!next[task.id]) {
            next[task.id] = nextDefaultSelection;
          }
        }
        return next;
      });
      setSelectedInlineTaskKeysByTaskId((current) => {
        const next: Record<number, string[]> = {};
        for (const task of visibleTasks) {
          const options = getConditionalInlineTasks(task, isArabic ? "ar" : "en");
          const allowed = new Set(options.map((item) => item.key));
          const existing = current[task.id] || [];
          next[task.id] = existing.filter((key) => allowed.has(key));
        }
        return next;
      });

      const nextStreakMap: Record<number, number> = {};
      for (const streak of streaks) {
        nextStreakMap[streak.taskId] = streak.currentStreak;
      }
      setStreakByTaskId(nextStreakMap);

      const nextCategories = new Set(
        visibleTasks.map((task) => getTaskCategory(task, isArabic ? "ar" : "en"))
      );
      setSelectedCategory((current) =>
        current !== ALL_CATEGORY && !nextCategories.has(current) ? ALL_CATEGORY : current
      );
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not load tasks"));
    } finally {
      setLoading(false);
    }
  }, [isArabic]);

  useFocusEffect(
    useCallback(() => {
      void loadData(true);
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

  const handleRefresh = async () => {
    await loadData(false);
  };

  const handleLogTask = async (task: Task) => {
    setError(null);
    setSuccessMessage(null);
    const dailyLimit = getDailyCompletionLimit(task);
    const currentCount = todayCompletionCountByTaskId[task.id] || 0;
    if (dailyLimit !== null && currentCount >= dailyLimit) {
      setError(t("tasks.alreadyLoggedToday"));
      return;
    }
    const requiresAmount = requiresActivityAmount(task);
    const amountRaw = amountByTaskId[task.id]?.trim() || "";
    const fastingSelection = fastingSelectionByTaskId[task.id] || defaultFastingSelection;
    const inlineTaskOptions = getConditionalInlineTasks(task, isArabic ? "ar" : "en");
    const selectedInlineTaskKeys = selectedInlineTaskKeysByTaskId[task.id] || [];

    let parsedAmount: number | undefined;
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

    if (inlineTaskOptions.length > 0 && selectedInlineTaskKeys.length === 0) {
      setError(t("tasks.inlineSelectRequired"));
      return;
    }

    setSubmittingTaskId(task.id);
    try {
      const activity = await activitiesApi.createTaskCompletion({
        taskId: task.id,
        amount: parsedAmount,
        isDuringFasting: toIsDuringFasting(fastingSelection),
        metadata:
          inlineTaskOptions.length > 0
            ? {
                selectedInlineTaskKeys,
              }
            : undefined,
      });
      setTodayCompletionCountByTaskId((prev) => ({ ...prev, [task.id]: (prev[task.id] || 0) + 1 }));
      setSuccessMessage(
        t("tasks.loggedPoints", {
          points: getSignedPointsLabel(activity.effectivePoints),
        })
      );
      pointsEvents.notify();
      setAmountByTaskId((prev) => ({ ...prev, [task.id]: "" }));
      await loadData(false);
    } catch (err) {
      const message = getApiErrorMessage(err, "Could not log task");
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

  const categories = useMemo(
    () => [ALL_CATEGORY, ...Array.from(new Set(tasks.map((task) => getTaskCategory(task, isArabic ? "ar" : "en"))))],
    [isArabic, tasks]
  );

  const filteredTasks = useMemo(() => {
    if (selectedCategory === ALL_CATEGORY) {
      return tasks;
    }
    return tasks.filter((task) => getTaskCategory(task, isArabic ? "ar" : "en") === selectedCategory);
  }, [isArabic, selectedCategory, tasks]);

  const streakSummary = useMemo(() => {
    const streakValues = Object.values(streakByTaskId);
    const activeStreaks = streakValues.filter((value) => value > 0).length;
    const bestCurrentStreak = streakValues.length > 0 ? Math.max(...streakValues) : 0;
    return { activeStreaks, bestCurrentStreak };
  }, [streakByTaskId]);

  return (
    <ScreenContainer fixedOverlay={successMessage ? <TopToast message={successMessage} tone="success" /> : null}>
      {tasksDesignVariant === "classic" ? (
        <ClassicTasksView
          colors={colors}
          isArabic={isArabic}
          loading={loading}
          error={error}
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          filteredTasks={filteredTasks}
          streakSummary={streakSummary}
          streakByTaskId={streakByTaskId}
          amountByTaskId={amountByTaskId}
          todayCompletionCountByTaskId={todayCompletionCountByTaskId}
          selectedInlineTaskKeysByTaskId={selectedInlineTaskKeysByTaskId}
          fastingSelectionByTaskId={fastingSelectionByTaskId}
          defaultFastingSelection={defaultFastingSelection}
          onAmountByTaskIdChange={setAmountByTaskId}
          onFastingSelectionChange={setFastingSelectionByTaskId}
          onToggleInlineTaskKey={(taskId, key) =>
            setSelectedInlineTaskKeysByTaskId((prev) => {
              const current = prev[taskId] || [];
              const hasKey = current.includes(key);
              return {
                ...prev,
                [taskId]: hasKey ? current.filter((item) => item !== key) : [...current, key],
              };
            })
          }
          onLogTask={handleLogTask}
          submittingTaskId={submittingTaskId}
          successMessage={successMessage}
          onRefresh={handleRefresh}
          t={t}
        />
      ) : null}

      {tasksDesignVariant === "ramadan_modern" ? (
        <RamadanModernTasksView
          colors={colors}
          isArabic={isArabic}
          loading={loading}
          error={error}
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          filteredTasks={filteredTasks}
          streakSummary={streakSummary}
          streakByTaskId={streakByTaskId}
          amountByTaskId={amountByTaskId}
          todayCompletionCountByTaskId={todayCompletionCountByTaskId}
          selectedInlineTaskKeysByTaskId={selectedInlineTaskKeysByTaskId}
          fastingSelectionByTaskId={fastingSelectionByTaskId}
          defaultFastingSelection={defaultFastingSelection}
          onAmountByTaskIdChange={setAmountByTaskId}
          onFastingSelectionChange={setFastingSelectionByTaskId}
          onToggleInlineTaskKey={(taskId, key) =>
            setSelectedInlineTaskKeysByTaskId((prev) => {
              const current = prev[taskId] || [];
              const hasKey = current.includes(key);
              return {
                ...prev,
                [taskId]: hasKey ? current.filter((item) => item !== key) : [...current, key],
              };
            })
          }
          onLogTask={handleLogTask}
          submittingTaskId={submittingTaskId}
          successMessage={successMessage}
          onRefresh={handleRefresh}
          t={t}
        />
      ) : null}

      {tasksDesignVariant === "modern" ? (
        <ModernTasksView
          colors={colors}
          isArabic={isArabic}
          loading={loading}
          error={error}
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          filteredTasks={filteredTasks}
          streakSummary={streakSummary}
          streakByTaskId={streakByTaskId}
          amountByTaskId={amountByTaskId}
          todayCompletionCountByTaskId={todayCompletionCountByTaskId}
          selectedInlineTaskKeysByTaskId={selectedInlineTaskKeysByTaskId}
          fastingSelectionByTaskId={fastingSelectionByTaskId}
          defaultFastingSelection={defaultFastingSelection}
          onAmountByTaskIdChange={setAmountByTaskId}
          onFastingSelectionChange={setFastingSelectionByTaskId}
          onToggleInlineTaskKey={(taskId, key) =>
            setSelectedInlineTaskKeysByTaskId((prev) => {
              const current = prev[taskId] || [];
              const hasKey = current.includes(key);
              return {
                ...prev,
                [taskId]: hasKey ? current.filter((item) => item !== key) : [...current, key],
              };
            })
          }
          onLogTask={handleLogTask}
          submittingTaskId={submittingTaskId}
          successMessage={successMessage}
          onRefresh={handleRefresh}
          t={t}
        />
      ) : null}
    </ScreenContainer>
  );
}

interface TasksViewProps {
  colors: ReturnType<typeof useAppTheme>["colors"];
  isArabic: boolean;
  loading: boolean;
  error: string | null;
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  filteredTasks: Task[];
  streakSummary: {
    activeStreaks: number;
    bestCurrentStreak: number;
  };
  streakByTaskId: Record<number, number>;
  amountByTaskId: Record<number, string>;
  todayCompletionCountByTaskId: Record<number, number>;
  selectedInlineTaskKeysByTaskId: Record<number, string[]>;
  fastingSelectionByTaskId: Record<number, FastingSelection>;
  defaultFastingSelection: FastingSelection;
  onAmountByTaskIdChange: Dispatch<SetStateAction<Record<number, string>>>;
  onFastingSelectionChange: Dispatch<SetStateAction<Record<number, FastingSelection>>>;
  onToggleInlineTaskKey: (taskId: number, key: string) => void;
  onLogTask: (task: Task) => Promise<void>;
  submittingTaskId: number | null;
  successMessage: string | null;
  onRefresh: () => Promise<void>;
  t: ReturnType<typeof useI18n>["t"];
}

function getCategoryLabel(category: string, t: ReturnType<typeof useI18n>["t"]) {
  if (category === ALL_CATEGORY) {
    return t("tasks.categoryAll");
  }

  const normalized = category.trim().toLowerCase();
  if (normalized === "study") {
    return t("tasks.categoryStudy");
  }
  if (normalized === "prayers") {
    return t("tasks.categoryPrayers");
  }
  if (normalized === "other") {
    return t("tasks.categoryOther");
  }
  if (normalized === "forbidden") {
    return t("tasks.categoryForbidden");
  }

  return category;
}

function CategoryRail({
  categories,
  selectedCategory,
  onSelectCategory,
  colors,
  t,
  compact = false,
}: {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  colors: ReturnType<typeof useAppTheme>["colors"];
  t: ReturnType<typeof useI18n>["t"];
  compact?: boolean;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={compact ? styles.categoryRowCompact : styles.categoryRow}
    >
      {categories.map((category) => {
        const active = category === selectedCategory;
        return (
          <Pressable
            key={category}
            onPress={() => onSelectCategory(category)}
            style={[
              compact ? styles.categoryChipCompact : styles.categoryChip,
              {
                borderColor: active ? colors.gold : colors.border,
                backgroundColor: active ? colors.gold : colors.card,
              },
            ]}
          >
            <Text style={{ color: active ? "#1b1507" : colors.textPrimary, fontWeight: "700" }}>
              {getCategoryLabel(category, t)}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function ClassicTasksView({
  colors,
  isArabic,
  loading,
  error,
  categories,
  selectedCategory,
  onSelectCategory,
  filteredTasks,
  streakSummary,
  streakByTaskId,
  amountByTaskId,
  todayCompletionCountByTaskId,
  selectedInlineTaskKeysByTaskId,
  fastingSelectionByTaskId,
  defaultFastingSelection,
  onAmountByTaskIdChange,
  onFastingSelectionChange,
  onToggleInlineTaskKey,
  onLogTask,
  submittingTaskId,
  successMessage,
  onRefresh,
  t,
}: TasksViewProps) {
  return (
    <>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{t("tasks.title")}</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {t("tasks.subtitle")}
      </Text>

      <AppCard>
        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{t("tasks.summaryTitle")}</Text>
        <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>
          {t("tasks.activeStreaks")}: {streakSummary.activeStreaks} | {t("tasks.bestCurrentStreak")}:{" "}
          {streakSummary.bestCurrentStreak}
        </Text>
      </AppCard>

      <View>
        <AppButton label={t("common.refresh")} variant="ghost" onPress={() => void onRefresh()} />
      </View>

      <CategoryRail
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={onSelectCategory}
        colors={colors}
        t={t}
      />

      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

      {loading ? (
        <LoadingBlock />
      ) : filteredTasks.length === 0 ? (
        <EmptyState title={t("tasks.noTasksTitle")} subtitle={t("tasks.noTasksSubtitle")} />
      ) : (
        <View style={styles.list}>
          {filteredTasks.map((task) => (
            <TaskItemCard
              key={task.id}
              task={task}
              categoryLabel={getCategoryLabel(getTaskCategory(task, isArabic ? "ar" : "en"), t)}
              amountValue={amountByTaskId[task.id] || ""}
              onAmountChange={(value) => onAmountByTaskIdChange((prev) => ({ ...prev, [task.id]: value }))}
              onLog={() => void onLogTask(task)}
              logging={submittingTaskId === task.id}
              streakCount={streakByTaskId[task.id] || 0}
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
                onFastingSelectionChange((prev) => ({ ...prev, [task.id]: value }))
              }
              inlineTasks={getConditionalInlineTasks(task, isArabic ? "ar" : "en")}
              selectedInlineTaskKeys={selectedInlineTaskKeysByTaskId[task.id] || []}
              onToggleInlineTaskKey={(key) => onToggleInlineTaskKey(task.id, key)}
            />
          ))}
        </View>
      )}
    </>
  );
}

function RamadanModernTasksView({
  colors,
  isArabic,
  loading,
  error,
  categories,
  selectedCategory,
  onSelectCategory,
  filteredTasks,
  streakSummary,
  streakByTaskId,
  amountByTaskId,
  todayCompletionCountByTaskId,
  selectedInlineTaskKeysByTaskId,
  fastingSelectionByTaskId,
  defaultFastingSelection,
  onAmountByTaskIdChange,
  onFastingSelectionChange,
  onToggleInlineTaskKey,
  onLogTask,
  submittingTaskId,
  successMessage,
  onRefresh,
  t,
}: TasksViewProps) {
  return (
    <>
      <LinearGradient
        colors={["#0f3e2c", "#14543b", "#b79342"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.ramadanHero}
      >
        <View style={styles.ramadanHeroRow}>
          <Text style={styles.ramadanMoon}>☾</Text>
          <Text style={styles.ramadanHeroEyebrow}>{t("tasks.ramadanLayoutEyebrow")}</Text>
        </View>
        <Text style={styles.ramadanHeroTitle}>{t("tasks.ramadanLayoutTitle")}</Text>
        <Text style={styles.ramadanHeroSubtitle}>
          {t("tasks.ramadanLayoutSubtitle")}
        </Text>
        <View style={styles.ramadanStatsRow}>
          <View style={styles.ramadanStatBlock}>
            <Text style={styles.ramadanStatValue}>{streakSummary.activeStreaks}</Text>
            <Text style={styles.ramadanStatLabel}>{t("tasks.activeStreaks")}</Text>
          </View>
          <View style={styles.ramadanStatBlock}>
            <Text style={styles.ramadanStatValue}>{streakSummary.bestCurrentStreak}</Text>
            <Text style={styles.ramadanStatLabel}>{t("tasks.bestCurrentStreak")}</Text>
          </View>
          <Pressable style={styles.ramadanRefreshPill} onPress={() => void onRefresh()}>
            <Text style={styles.ramadanRefreshText}>{t("common.refresh")}</Text>
          </Pressable>
        </View>
      </LinearGradient>

      <CategoryRail
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={onSelectCategory}
        colors={colors}
        t={t}
        compact
      />

      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

      {loading ? (
        <LoadingBlock />
      ) : filteredTasks.length === 0 ? (
        <EmptyState title={t("tasks.noTasksTitle")} subtitle={t("tasks.noTasksSubtitle")} />
      ) : (
        <View style={styles.listRamadan}>
          {filteredTasks.map((task) => (
            <RamadanTaskCard
              key={task.id}
              task={task}
              categoryLabel={getCategoryLabel(getTaskCategory(task, isArabic ? "ar" : "en"), t)}
              amountValue={amountByTaskId[task.id] || ""}
              onAmountChange={(value) => onAmountByTaskIdChange((prev) => ({ ...prev, [task.id]: value }))}
              onLog={() => void onLogTask(task)}
              logging={submittingTaskId === task.id}
              streakCount={streakByTaskId[task.id] || 0}
              showStreak={isStreakEnabledTask(task)}
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
                onFastingSelectionChange((prev) => ({ ...prev, [task.id]: value }))
              }
              inlineTasks={getConditionalInlineTasks(task, isArabic ? "ar" : "en")}
              selectedInlineTaskKeys={selectedInlineTaskKeysByTaskId[task.id] || []}
              onToggleInlineTaskKey={(key) => onToggleInlineTaskKey(task.id, key)}
              t={t}
            />
          ))}
        </View>
      )}
    </>
  );
}

function ModernTasksView({
  colors,
  isArabic,
  loading,
  error,
  categories,
  selectedCategory,
  onSelectCategory,
  filteredTasks,
  streakSummary,
  streakByTaskId,
  amountByTaskId,
  todayCompletionCountByTaskId,
  selectedInlineTaskKeysByTaskId,
  fastingSelectionByTaskId,
  defaultFastingSelection,
  onAmountByTaskIdChange,
  onFastingSelectionChange,
  onToggleInlineTaskKey,
  onLogTask,
  submittingTaskId,
  successMessage,
  onRefresh,
  t,
}: TasksViewProps) {
  return (
    <>
      <View style={styles.modernHeader}>
        <Text style={[styles.modernHeaderTitle, { color: colors.textPrimary }]}>{t("tasks.modernWorkspace")}</Text>
        <AppButton label={t("common.refresh")} variant="ghost" onPress={() => void onRefresh()} />
      </View>

      <View style={styles.modernMetricsRow}>
        <AppCard style={{ ...styles.modernMetricCard, backgroundColor: "#f6f8fb", borderColor: "#dce4ef" }}>
          <Text style={styles.modernMetricValue}>{streakSummary.activeStreaks}</Text>
          <Text style={styles.modernMetricLabel}>{t("tasks.activeStreaks")}</Text>
        </AppCard>
        <AppCard style={{ ...styles.modernMetricCard, backgroundColor: "#f6f8fb", borderColor: "#dce4ef" }}>
          <Text style={styles.modernMetricValue}>{streakSummary.bestCurrentStreak}</Text>
          <Text style={styles.modernMetricLabel}>{t("tasks.bestStreak")}</Text>
        </AppCard>
      </View>

      <CategoryRail
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={onSelectCategory}
        colors={colors}
        t={t}
      />

      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

      {loading ? (
        <LoadingBlock />
      ) : filteredTasks.length === 0 ? (
        <EmptyState title={t("tasks.noTasksTitle")} subtitle={t("tasks.noTasksSubtitle")} />
      ) : (
        <View style={styles.modernList}>
          {filteredTasks.map((task) => (
            <ModernTaskCard
              key={task.id}
              task={task}
              categoryLabel={getCategoryLabel(getTaskCategory(task, isArabic ? "ar" : "en"), t)}
              amountValue={amountByTaskId[task.id] || ""}
              onAmountChange={(value) => onAmountByTaskIdChange((prev) => ({ ...prev, [task.id]: value }))}
              onLog={() => void onLogTask(task)}
              logging={submittingTaskId === task.id}
              streakCount={streakByTaskId[task.id] || 0}
              showStreak={isStreakEnabledTask(task)}
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
                onFastingSelectionChange((prev) => ({ ...prev, [task.id]: value }))
              }
              inlineTasks={getConditionalInlineTasks(task, isArabic ? "ar" : "en")}
              selectedInlineTaskKeys={selectedInlineTaskKeysByTaskId[task.id] || []}
              onToggleInlineTaskKey={(key) => onToggleInlineTaskKey(task.id, key)}
              t={t}
            />
          ))}
        </View>
      )}
    </>
  );
}

function RamadanTaskCard({
  task,
  categoryLabel,
  amountValue,
  onAmountChange,
  onLog,
  logging,
  streakCount,
  showStreak,
  completedToday,
  fastingSelection,
  onFastingSelectionChange,
  inlineTasks,
  selectedInlineTaskKeys,
  onToggleInlineTaskKey,
  t,
}: {
  task: Task;
  categoryLabel: string;
  amountValue: string;
  onAmountChange: (value: string) => void;
  onLog: () => void;
  logging: boolean;
  streakCount: number;
  showStreak: boolean;
  completedToday: boolean;
  fastingSelection: FastingSelection;
  onFastingSelectionChange: (value: FastingSelection) => void;
  inlineTasks: Array<{ key: string; label: string }>;
  selectedInlineTaskKeys: string[];
  onToggleInlineTaskKey: (key: string) => void;
  t: ReturnType<typeof useI18n>["t"];
}) {
  const [expanded, setExpanded] = useState(false);
  const interactionKind = getTaskInteractionKind(task);
  const showAmount = interactionKind === "NUMERIC";
  const streakGoalDays = getStreakGoalDays(task);
  const streakDaysLeft = getStreakDaysLeft(task, streakCount);
  const isAutoConditional = isAutoConditionalBonusTask(task);

  return (
    <LinearGradient
      colors={["#fff8e6", "#f5e8c7"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.ramadanTaskCard}
    >
      <View style={styles.ramadanTaskTop}>
        <View style={styles.ramadanTaskLeft}>
          <Text style={styles.ramadanTaskTitle}>{task.title}</Text>
          <Text style={styles.ramadanTaskMeta}>{categoryLabel} | {getTypeLabel(task, interactionKind, t)}</Text>
        </View>
        <Text style={styles.ramadanTaskPoints}>+{task.basePoints}</Text>
      </View>

      {showStreak ? (
        <View style={styles.ramadanBadges}>
          <Text style={styles.ramadanBadge}>
            {t("tasks.streakLabel")}: {streakCount}
          </Text>
          {streakGoalDays ? (
            <Text style={styles.ramadanBadge}>
              {t("tasks.streakGoal")}: {streakCount}/{streakGoalDays}
            </Text>
          ) : null}
          {streakDaysLeft !== null ? (
            <Text style={styles.ramadanBadge}>{t("tasks.streakLeft", { days: streakDaysLeft })}</Text>
          ) : null}
        </View>
      ) : null}

      {expanded ? (
        <View style={styles.ramadanDetailBox}>
          <Text style={styles.ramadanDetailLine}>
            {interactionKind === "CONDITIONAL"
              ? t("tasks.conditionalHint")
              : task.description || t("tasks.noDescription")}
          </Text>
        </View>
      ) : null}

      <Pressable onPress={() => setExpanded((prev) => !prev)}>
        <Text style={styles.ramadanExpandText}>
          {expanded ? t("common.hideDetails") : t("common.showDetails")}
        </Text>
      </Pressable>

      {inlineTasks.length > 0 ? (
        <View style={styles.inlineTaskGroup}>
          <Text style={styles.ramadanTimingLabel}>{t("tasks.inlineMinorTasks")}</Text>
          <View style={styles.inlineTaskChips}>
            {inlineTasks.map((item) => {
              const checked = selectedInlineTaskKeys.includes(item.key);
              return (
                <Pressable
                  key={item.key}
                  onPress={() => onToggleInlineTaskKey(item.key)}
                  style={[
                    styles.inlineTaskChip,
                    checked ? styles.inlineTaskChipActiveRamadan : null,
                  ]}
                >
                  <Text style={[styles.inlineTaskChipText, checked ? styles.inlineTaskChipTextActiveRamadan : null]}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {showAmount ? (
        <TextInput
          value={amountValue}
          onChangeText={onAmountChange}
          keyboardType="numeric"
          placeholder={isTimedTask(task) ? t("tasks.enterMinutes") : t("tasks.enterCount")}
          placeholderTextColor="#8d7f58"
          style={styles.ramadanInput}
        />
      ) : null}

      <RamadanTimingToggle value={fastingSelection} onChange={onFastingSelectionChange} t={t} />

      <View style={styles.ramadanActions}>
        <AppButton
          label={
            logging
              ? t("common.saving")
              : isAutoConditional
                ? t("tasks.autoReward")
                : completedToday
                  ? t("tasks.completedToday")
                  : t("common.done")
          }
          onPress={onLog}
          disabled={logging || completedToday || isAutoConditional}
          style={styles.growButton}
        />
      </View>
    </LinearGradient>
  );
}

function ModernTaskCard({
  task,
  categoryLabel,
  amountValue,
  onAmountChange,
  onLog,
  logging,
  streakCount,
  showStreak,
  completedToday,
  fastingSelection,
  onFastingSelectionChange,
  inlineTasks,
  selectedInlineTaskKeys,
  onToggleInlineTaskKey,
  t,
}: {
  task: Task;
  categoryLabel: string;
  amountValue: string;
  onAmountChange: (value: string) => void;
  onLog: () => void;
  logging: boolean;
  streakCount: number;
  showStreak: boolean;
  completedToday: boolean;
  fastingSelection: FastingSelection;
  onFastingSelectionChange: (value: FastingSelection) => void;
  inlineTasks: Array<{ key: string; label: string }>;
  selectedInlineTaskKeys: string[];
  onToggleInlineTaskKey: (key: string) => void;
  t: ReturnType<typeof useI18n>["t"];
}) {
  const [expanded, setExpanded] = useState(false);
  const interactionKind = getTaskInteractionKind(task);
  const showAmount = interactionKind === "NUMERIC";
  const streakGoalDays = getStreakGoalDays(task);
  const streakDaysLeft = getStreakDaysLeft(task, streakCount);
  const isAutoConditional = isAutoConditionalBonusTask(task);

  return (
    <View style={styles.modernTaskCard}>
      <View style={styles.modernAccent} />
      <View style={styles.modernTaskBody}>
        <View style={styles.modernTaskHead}>
          <View style={{ flex: 1 }}>
            <Text style={styles.modernTaskTitle}>{task.title}</Text>
            <Text style={styles.modernTaskType}>
              {categoryLabel} | {getTypeLabel(task, interactionKind, t)}
            </Text>
          </View>
          <Text style={styles.modernTaskPts}>+{task.basePoints}</Text>
        </View>

        {showStreak ? (
          <View style={styles.modernMiniStats}>
            <Text style={styles.modernMiniStat}>
              {t("tasks.streakLabel")} {streakCount}
            </Text>
            {streakGoalDays ? (
              <Text style={styles.modernMiniStat}>
                {t("tasks.streakGoal")} {streakCount}/{streakGoalDays}
              </Text>
            ) : null}
            {streakDaysLeft !== null ? (
              <Text style={styles.modernMiniStat}>{t("tasks.streakLeft", { days: streakDaysLeft })}</Text>
            ) : null}
          </View>
        ) : null}

        <Pressable onPress={() => setExpanded((prev) => !prev)}>
          <Text style={styles.modernDetailToggle}>
            {expanded ? t("common.hideDetails") : t("common.showDetails")}
          </Text>
        </Pressable>

        {expanded ? (
          <View style={styles.modernConditionsBox}>
            <Text style={styles.modernConditionLine}>
              {interactionKind === "CONDITIONAL"
                ? t("tasks.conditionalHint")
                : task.description || t("tasks.noDescription")}
            </Text>
          </View>
        ) : null}

        {inlineTasks.length > 0 ? (
          <View style={styles.inlineTaskGroup}>
            <Text style={styles.modernTimingLabel}>{t("tasks.inlineMinorTasks")}</Text>
            <View style={styles.inlineTaskChips}>
              {inlineTasks.map((item) => {
                const checked = selectedInlineTaskKeys.includes(item.key);
                return (
                  <Pressable
                    key={item.key}
                    onPress={() => onToggleInlineTaskKey(item.key)}
                    style={[
                      styles.inlineTaskChip,
                      checked ? styles.inlineTaskChipActiveModern : null,
                    ]}
                  >
                    <Text style={[styles.inlineTaskChipText, checked ? styles.inlineTaskChipTextActiveModern : null]}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {showAmount ? (
          <TextInput
            value={amountValue}
            onChangeText={onAmountChange}
            keyboardType="numeric"
            placeholder={isTimedTask(task) ? t("tasks.enterMinutes") : t("tasks.enterCount")}
            placeholderTextColor="#8a94a0"
            style={styles.modernInput}
          />
        ) : null}

        <ModernTimingToggle value={fastingSelection} onChange={onFastingSelectionChange} t={t} />

        <View style={styles.modernActions}>
          <AppButton
            label={
              logging
                ? t("common.saving")
                : isAutoConditional
                  ? t("tasks.autoReward")
                  : completedToday
                    ? t("tasks.completedToday")
                    : t("common.done")
            }
            onPress={onLog}
            disabled={logging || completedToday || isAutoConditional}
            style={styles.growButton}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  variantPickerCard: {
    gap: 10,
  },
  variantPickerTitle: {
    fontSize: 13,
    fontWeight: "800",
  },
  variantPickerRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  variantButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  summaryLabel: {
    fontSize: 12,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "700",
  },
  categoryRow: {
    gap: 8,
  },
  categoryRowCompact: {
    gap: 8,
    paddingVertical: 3,
  },
  categoryChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  categoryChipCompact: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  error: {
    fontSize: 13,
    fontWeight: "700",
  },
  list: {
    gap: 10,
  },
  ramadanHero: {
    borderRadius: 24,
    padding: 18,
    gap: 12,
  },
  ramadanHeroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  ramadanMoon: {
    color: "#f5e7bc",
    fontSize: 20,
  },
  ramadanHeroEyebrow: {
    color: "#f1e3b7",
    fontSize: 12,
    fontWeight: "700",
  },
  ramadanHeroTitle: {
    color: "#fff7de",
    fontSize: 24,
    fontWeight: "900",
  },
  ramadanHeroSubtitle: {
    color: "#ece1c3",
    fontSize: 13,
    lineHeight: 18,
  },
  ramadanStatsRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  ramadanStatBlock: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 108,
  },
  ramadanStatValue: {
    color: "#fff9e8",
    fontSize: 17,
    fontWeight: "900",
  },
  ramadanStatLabel: {
    color: "#ecdbad",
    fontSize: 11,
  },
  ramadanRefreshPill: {
    marginLeft: "auto",
    backgroundColor: "rgba(25, 18, 7, 0.28)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  ramadanRefreshText: {
    color: "#fff4d4",
    fontWeight: "800",
  },
  listRamadan: {
    gap: 12,
  },
  ramadanTaskCard: {
    borderRadius: 20,
    padding: 14,
    gap: 10,
  },
  ramadanTaskTop: {
    flexDirection: "row",
    gap: 8,
  },
  ramadanTaskLeft: {
    flex: 1,
  },
  ramadanTaskTitle: {
    color: "#1f372c",
    fontSize: 16,
    fontWeight: "900",
  },
  ramadanTaskMeta: {
    color: "#4c5c50",
    fontSize: 12,
    marginTop: 1,
  },
  ramadanTaskPoints: {
    color: "#7e5d1f",
    fontWeight: "900",
  },
  ramadanBadges: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  ramadanBadge: {
    backgroundColor: "rgba(81, 62, 26, 0.12)",
    color: "#5a4720",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 11,
    fontWeight: "700",
    overflow: "hidden",
  },
  ramadanDescription: {
    color: "#2f4a3d",
    lineHeight: 18,
    fontSize: 13,
  },
  ramadanDetailBox: {
    backgroundColor: "rgba(255, 255, 255, 0.52)",
    borderRadius: 12,
    padding: 10,
    gap: 2,
  },
  ramadanDetailLine: {
    color: "#3d5648",
    fontSize: 12,
    lineHeight: 17,
  },
  ramadanTimingWrap: {
    gap: 6,
  },
  ramadanTimingLabel: {
    color: "#4d5b52",
    fontSize: 12,
    fontWeight: "700",
  },
  ramadanTimingRow: {
    flexDirection: "row",
    gap: 8,
  },
  ramadanTimingButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 9,
    alignItems: "center",
    backgroundColor: "rgba(81, 62, 26, 0.1)",
  },
  ramadanTimingButtonActive: {
    backgroundColor: "#d6b56b",
  },
  ramadanTimingButtonText: {
    color: "#5b4722",
    fontSize: 12,
    fontWeight: "800",
  },
  ramadanTimingButtonTextActive: {
    color: "#1e1708",
  },
  ramadanExpandText: {
    color: "#5d4519",
    fontSize: 12,
    fontWeight: "800",
  },
  ramadanInput: {
    borderWidth: 1,
    borderColor: "#ceb983",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "rgba(255,255,255,0.76)",
    color: "#24382f",
  },
  ramadanActions: {
    flexDirection: "row",
    gap: 8,
  },
  growButton: {
    flex: 1,
  },
  modernHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  modernHeaderTitle: {
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  modernMetricsRow: {
    flexDirection: "row",
    gap: 8,
  },
  modernMetricCard: {
    flex: 1,
    padding: 10,
  },
  modernMetricValue: {
    color: "#2a323d",
    fontSize: 18,
    fontWeight: "900",
  },
  modernMetricLabel: {
    color: "#5c6774",
    fontSize: 11,
  },
  modernList: {
    gap: 10,
  },
  modernTaskCard: {
    borderRadius: 16,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dde3ed",
    flexDirection: "row",
    overflow: "hidden",
  },
  modernAccent: {
    width: 6,
    backgroundColor: "#3f7df3",
  },
  modernTaskBody: {
    flex: 1,
    padding: 12,
    gap: 8,
  },
  modernTaskHead: {
    flexDirection: "row",
    gap: 8,
  },
  modernTaskTitle: {
    color: "#1f2733",
    fontSize: 15,
    fontWeight: "800",
  },
  modernTaskType: {
    color: "#6b7785",
    fontSize: 12,
    marginTop: 1,
  },
  modernTaskPts: {
    color: "#2a57ae",
    fontWeight: "800",
    fontSize: 13,
  },
  modernMiniStats: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  modernMiniStat: {
    backgroundColor: "#eef3fb",
    color: "#526579",
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: "hidden",
    fontWeight: "700",
  },
  modernTaskDesc: {
    color: "#2c3948",
    fontSize: 13,
    lineHeight: 18,
  },
  modernDetailToggle: {
    color: "#3563ba",
    fontSize: 12,
    fontWeight: "800",
  },
  modernConditionsBox: {
    backgroundColor: "#f5f8fd",
    borderRadius: 10,
    padding: 9,
    gap: 2,
  },
  modernConditionLine: {
    color: "#516273",
    fontSize: 12,
    lineHeight: 17,
  },
  modernTimingWrap: {
    gap: 6,
  },
  modernTimingLabel: {
    color: "#5f6f83",
    fontSize: 12,
    fontWeight: "700",
  },
  modernTimingRow: {
    flexDirection: "row",
    gap: 8,
  },
  modernTimingButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d8e0ed",
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: "center",
    backgroundColor: "#f8fbff",
  },
  modernTimingButtonActive: {
    borderColor: "#3f7df3",
    backgroundColor: "#eaf2ff",
  },
  modernTimingButtonText: {
    color: "#4f637a",
    fontSize: 12,
    fontWeight: "800",
  },
  modernTimingButtonTextActive: {
    color: "#1c4da8",
  },
  modernInput: {
    borderWidth: 1,
    borderColor: "#d7dfec",
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: "#f8faff",
    color: "#293446",
  },
  modernActions: {
    flexDirection: "row",
    gap: 8,
  },
  inlineTaskGroup: {
    gap: 6,
  },
  inlineTaskChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  inlineTaskChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderColor: "#d0d8e6",
    backgroundColor: "transparent",
  },
  inlineTaskChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#5b6677",
  },
  inlineTaskChipActiveRamadan: {
    borderColor: "#caa34f",
    backgroundColor: "rgba(202,163,79,0.2)",
  },
  inlineTaskChipTextActiveRamadan: {
    color: "#4d3a16",
  },
  inlineTaskChipActiveModern: {
    borderColor: "#3f7df3",
    backgroundColor: "#eaf2ff",
  },
  inlineTaskChipTextActiveModern: {
    color: "#1c4da8",
  },
  bgOrb: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255, 216, 128, 0.16)",
  },
  bgOrbTop: {
    width: 260,
    height: 260,
    top: -90,
    right: -80,
  },
  bgOrbBottom: {
    width: 220,
    height: 220,
    bottom: -60,
    left: -70,
  },
  bgStripeA: {
    position: "absolute",
    width: 320,
    height: 120,
    top: 220,
    left: -110,
    transform: [{ rotate: "-20deg" }],
    backgroundColor: "rgba(246, 220, 156, 0.08)",
    borderRadius: 30,
  },
  bgStripeB: {
    position: "absolute",
    width: 280,
    height: 100,
    bottom: 180,
    right: -90,
    transform: [{ rotate: "-22deg" }],
    backgroundColor: "rgba(246, 220, 156, 0.07)",
    borderRadius: 26,
  },
  bgModernGlow: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(67, 122, 255, 0.12)",
  },
  bgModernGlowTop: {
    width: 240,
    height: 240,
    top: -80,
    left: -60,
  },
  bgModernGlowBottom: {
    width: 220,
    height: 220,
    bottom: -70,
    right: -60,
  },
  bgModernStripeA: {
    position: "absolute",
    width: 320,
    height: 110,
    top: 180,
    right: -120,
    transform: [{ rotate: "-18deg" }],
    backgroundColor: "rgba(72, 118, 216, 0.08)",
    borderRadius: 24,
  },
  bgModernStripeB: {
    position: "absolute",
    width: 280,
    height: 100,
    bottom: 220,
    left: -100,
    transform: [{ rotate: "-16deg" }],
    backgroundColor: "rgba(72, 118, 216, 0.07)",
    borderRadius: 24,
  },
});


