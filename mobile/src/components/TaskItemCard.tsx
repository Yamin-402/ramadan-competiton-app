import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  getStreakBonusPoints,
  getStreakDaysLeft,
  getStreakGoalDays,
  getTaskInteractionKind,
  isAutoConditionalBonusTask,
  isTimedTask,
  isStreakEnabledTask,
  TaskInteractionKind,
} from "../features/tasks/task-presentation";
import { FastingSelection } from "../features/tasks/fasting-selection";
import { Task } from "../types/domain";
import { AppButton } from "./AppButton";
import { AppCard } from "./AppCard";
import { AppTextInput } from "./AppTextInput";
import { FastingSelectionToggle } from "./FastingSelectionToggle";
import { useAppTheme } from "../hooks/use-app-theme";
import { useI18n } from "../hooks/use-i18n";
import { formatPoints } from "../utils/format";

interface TaskItemCardProps {
  task: Task;
  categoryLabel: string;
  amountValue: string;
  onAmountChange: (value: string) => void;
  onLog: () => void;
  logging: boolean;
  streakCount?: number;
  forbiddenStyle?: boolean;
  fastingSelection: FastingSelection;
  onFastingSelectionChange: (value: FastingSelection) => void;
  completedToday?: boolean;
  inlineTasks?: Array<{ key: string; label: string }>;
  selectedInlineTaskKeys?: string[];
  onToggleInlineTaskKey?: (key: string) => void;
  actionsDisabled?: boolean;
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

export function TaskItemCard({
  task,
  categoryLabel,
  amountValue,
  onAmountChange,
  onLog,
  logging,
  streakCount = 0,
  forbiddenStyle = false,
  fastingSelection,
  onFastingSelectionChange,
  completedToday = false,
  inlineTasks = [],
  selectedInlineTaskKeys = [],
  onToggleInlineTaskKey,
  actionsDisabled = false,
}: TaskItemCardProps) {
  const { colors } = useAppTheme();
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const interactionKind = getTaskInteractionKind(task);
  const showAmount = interactionKind === "NUMERIC";
  const isTimed = isTimedTask(task);
  const showStreak = isStreakEnabledTask(task);
  const isAutoConditional = isAutoConditionalBonusTask(task);
  const streakGoalDays = getStreakGoalDays(task);
  const streakDaysLeft = getStreakDaysLeft(task, streakCount);
  const streakBonusPoints = getStreakBonusPoints(task);

  return (
    <AppCard
      style={{
        borderColor: forbiddenStyle ? colors.danger : colors.border,
        backgroundColor: forbiddenStyle ? colors.cardSoft : colors.card,
      }}
    >
      <View style={styles.row}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{task.title}</Text>
        <Text style={[styles.points, { color: forbiddenStyle ? colors.danger : colors.gold }]}>
          {formatPoints(task.basePoints)} {t("overlay.points")}
        </Text>
      </View>

      <View style={styles.chipsRow}>
        <Text
          numberOfLines={1}
          style={[styles.chip, { color: colors.textPrimary, borderColor: colors.border }]}
        >
          {categoryLabel}
        </Text>
        <Text
          numberOfLines={1}
          style={[styles.chip, { color: colors.textPrimary, borderColor: colors.border }]}
        >
          {getTypeLabel(task, interactionKind, t)}
        </Text>
        {showStreak ? (
          <Text
            numberOfLines={1}
            style={[styles.chip, { color: colors.success, borderColor: colors.success }]}
          >
            {t("tasks.streakLabel")}: {streakCount}
          </Text>
        ) : null}
        {showStreak && streakGoalDays ? (
          <Text
            numberOfLines={1}
            style={[styles.chip, { color: colors.textPrimary, borderColor: colors.border }]}
          >
            {t("tasks.streakGoal")}: {streakCount}/{streakGoalDays}
          </Text>
        ) : null}
        {showStreak && streakDaysLeft !== null ? (
          <Text
            numberOfLines={1}
            style={[styles.chip, { color: colors.textSecondary, borderColor: colors.border }]}
          >
            {t("tasks.streakLeft", { days: streakDaysLeft })}
          </Text>
        ) : null}
        {showStreak && streakBonusPoints ? (
          <Text
            numberOfLines={1}
            style={[styles.chip, { color: colors.gold, borderColor: colors.gold }]}
          >
            {t("tasks.streakBonus")}: {formatPoints(streakBonusPoints)}
          </Text>
        ) : null}
      </View>

      <Pressable onPress={() => setExpanded((prev) => !prev)} style={styles.detailsToggle}>
        <Text style={{ color: colors.gold, fontWeight: "700" }}>
          {expanded ? t("common.hideDetails") : t("common.showDetails")}
        </Text>
      </Pressable>

      {expanded ? (
        <View style={[styles.detailsBox, { borderColor: colors.border }]}>
          {task.description ? (
            <Text style={[styles.description, { color: colors.textSecondary }]}>{task.description}</Text>
          ) : (
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {interactionKind === "CONDITIONAL" ? t("tasks.conditionalHint") : t("tasks.noDescription")}
            </Text>
          )}
        </View>
      ) : null}

      {inlineTasks.length > 0 ? (
        <View style={styles.inlineTasksWrap}>
          <Text style={[styles.inlineTasksLabel, { color: colors.textSecondary }]}>{t("tasks.inlineMinorTasks")}</Text>
          <View style={styles.inlineTasksList}>
            {inlineTasks.map((item) => {
              const checked = selectedInlineTaskKeys.includes(item.key);
              return (
                <Pressable
                  key={item.key}
                  onPress={() => onToggleInlineTaskKey?.(item.key)}
                  style={[
                    styles.inlineTaskTodoItem,
                    {
                      borderColor: checked ? colors.gold : colors.border,
                      backgroundColor: checked ? `${colors.gold}20` : "transparent",
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.inlineTaskTodoCheck,
                      {
                        borderColor: checked ? colors.gold : colors.border,
                        backgroundColor: checked ? colors.gold : "transparent",
                      },
                    ]}
                  >
                    {checked ? <Text style={styles.inlineTaskTodoCheckMark}>✓</Text> : null}
                  </View>
                  <Text style={{ color: checked ? colors.textPrimary : colors.textSecondary, fontWeight: "700", flex: 1 }}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      <FastingSelectionToggle value={fastingSelection} onChange={onFastingSelectionChange} />

      {showAmount ? (
        <AppTextInput
          label={isTimed ? t("tasks.timedMinutes") : t("tasks.counterValue")}
          value={amountValue}
          onChangeText={onAmountChange}
          keyboardType="numeric"
          placeholder={isTimed ? t("tasks.enterMinutes") : t("tasks.enterCount")}
          autoCapitalize="none"
        />
      ) : null}

      <AppButton
        label={
          logging
            ? t("common.saving")
            : isAutoConditional
              ? t("tasks.autoReward")
            : completedToday
              ? t("tasks.completedToday")
              : forbiddenStyle
                ? t("tasks.logForbidden")
                : t("common.done")
        }
        onPress={onLog}
        disabled={logging || completedToday || isAutoConditional || actionsDisabled}
        variant={forbiddenStyle ? "danger" : "primary"}
      />
    </AppCard>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
  },
  points: {
    fontSize: 14,
    fontWeight: "700",
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
  },
  detailsToggle: {
    alignSelf: "flex-start",
  },
  detailsBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    gap: 4,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700",
    includeFontPadding: false,
    overflow: "hidden",
  },
  inlineTasksWrap: {
    gap: 6,
  },
  inlineTasksLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  inlineTasksList: {
    gap: 6,
  },
  inlineTaskTodoItem: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  inlineTaskTodoCheck: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  inlineTaskTodoCheckMark: {
    color: "#1b1507",
    fontSize: 11,
    fontWeight: "900",
    lineHeight: 12,
  },
});
