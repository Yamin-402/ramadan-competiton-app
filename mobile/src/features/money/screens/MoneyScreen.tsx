import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { moneyApi } from "../../../api/endpoints/money.api";
import { tasksApi } from "../../../api/endpoints/tasks.api";
import { getApiErrorMessage } from "../../../api/client";
import { AppButton } from "../../../components/AppButton";
import { AppCard } from "../../../components/AppCard";
import { AppTextInput } from "../../../components/AppTextInput";
import { EmptyState } from "../../../components/EmptyState";
import { LoadingBlock } from "../../../components/LoadingBlock";
import { ScreenContainer } from "../../../components/ScreenContainer";
import { useAppTheme } from "../../../hooks/use-app-theme";
import { useI18n } from "../../../hooks/use-i18n";
import { useSettingsStore } from "../../../store/settings-store";
import { MoneyCommitment, MoneyEntry, Task } from "../../../types/domain";
import { formatDate, formatMoney } from "../../../utils/format";
import { getTaskCategory } from "../../tasks/task-presentation";

type CommitmentChoice = "COMPLETED" | "NOT_COMPLETED";

export function MoneyScreen() {
  const { colors, mode } = useAppTheme();
  const { t, isArabic } = useI18n();
  const tasksDesignVariant = useSettingsStore((state) => state.tasksDesignVariant);
  const textAlign = isArabic ? "right" : "left";
  const isModernVariant = tasksDesignVariant === "modern";
  const modernCardStyle = isModernVariant
    ? mode === "dark"
      ? { backgroundColor: colors.card, borderColor: colors.border }
      : { backgroundColor: "#f8fbff", borderColor: "#d7dfec" }
    : undefined;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [commitments, setCommitments] = useState<MoneyCommitment[]>([]);
  const [entries, setEntries] = useState<MoneyEntry[]>([]);
  const [settlements, setSettlements] = useState<
    Array<{
      batchId: string;
      settledAt: string;
      totalPaid: number;
      entries: Array<{
        id: number;
        task: MoneyEntry["task"];
        amount: number;
        date: string;
      }>;
    }>
  >([]);
  const [total, setTotal] = useState<number | string>(0);

  const [showTaskPicker, setShowTaskPicker] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [choice, setChoice] = useState<CommitmentChoice>("NOT_COMPLETED");
  const [amountInput, setAmountInput] = useState("");
  const [submittingCommitment, setSubmittingCommitment] = useState(false);
  const [evaluating, setEvaluating] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [summary, commitmentRows, taskRows] = await Promise.all([
        moneyApi.getSummary(100),
        moneyApi.listCommitments(),
        tasksApi.listAvailable(),
      ]);
      setEntries(summary.entries);
      setSettlements(summary.settlements || []);
      setTotal(summary.totalAmount);
      setCommitments(commitmentRows);
      setTasks(taskRows);
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not load money module"));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData])
  );

  const createCommitment = async () => {
    if (!selectedTaskId) {
      setError(t("money.mustSelectTask"));
      return;
    }
    const task = tasks.find((item) => item.id === selectedTaskId);
    const amount = Number(amountInput);
    if (!task) {
      setError(t("money.taskUnavailable"));
      return;
    }
    if (Number.isNaN(amount) || amount <= 0) {
      setError(t("money.amountInvalid"));
      return;
    }

    setSubmittingCommitment(true);
    setError(null);
    try {
      await moneyApi.createFriendlyCommitment({
        taskId: task.id,
        amount,
        when: choice,
        active: true,
      });
      setAmountInput("");
      setSelectedTaskId(null);
      setChoice("NOT_COMPLETED");
      await loadData();
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not create commitment"));
    } finally {
      setSubmittingCommitment(false);
    }
  };

  const evaluateToday = async () => {
    setEvaluating(true);
    setError(null);
    try {
      await moneyApi.evaluateToday();
      await loadData();
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not evaluate today's rules"));
    } finally {
      setEvaluating(false);
    }
  };

  const removeEntry = async (entryId: number) => {
    setError(null);
    try {
      await moneyApi.removeEntry(entryId, "User correction from mobile app");
      await loadData();
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not remove entry"));
    }
  };

  const removeCommitment = async (commitmentId: number) => {
    setError(null);
    try {
      await moneyApi.removeCommitment(commitmentId);
      await loadData();
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not remove rule"));
    }
  };

  const clearOutstanding = async () => {
    if (entries.length === 0) {
      setError(t("money.noOutstanding"));
      return;
    }

    Alert.alert(t("money.clearAllConfirmTitle"), t("money.clearAllConfirmBody"), [
      { text: t("common.no"), style: "cancel" },
      {
        text: t("common.yes"),
        style: "destructive",
        onPress: () => {
          void (async () => {
            setError(null);
            try {
              await moneyApi.clearOutstanding("User marked as paid from mobile");
              await loadData();
            } catch (err) {
              setError(getApiErrorMessage(err, "Could not clear outstanding amount"));
            }
          })();
        },
      },
    ]);
  };

  const selectedTask = useMemo(
    () => tasks.find((item) => item.id === selectedTaskId) || null,
    [selectedTaskId, tasks]
  );

  return (
    <ScreenContainer>
      <AppCard style={modernCardStyle}>
        <Text style={[styles.totalLabel, { color: colors.textSecondary, textAlign }]}>{t("money.totalLabel")}</Text>
        <Text style={[styles.totalValue, { color: colors.gold }]}>{formatMoney(total)}</Text>
        <AppButton
          label={evaluating ? t("money.evaluating") : t("money.evaluate")}
          onPress={() => void evaluateToday()}
          disabled={evaluating}
          variant="ghost"
        />
        <AppButton
          label={t("money.clearAllDue")}
          onPress={() => void clearOutstanding()}
          variant="danger"
        />
      </AppCard>

      <AppCard style={modernCardStyle}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary, textAlign }]}>
          {t("money.createRule")}
        </Text>
        <Text style={[styles.itemMeta, { color: colors.textSecondary, textAlign }]}>
          {t("money.pickTask")}
        </Text>

        <AppButton
          label={selectedTask ? `${t("money.taskPrefix")}: ${selectedTask.title}` : t("money.selectTask")}
          onPress={() => setShowTaskPicker((prev) => !prev)}
          variant="ghost"
        />

        {showTaskPicker ? (
          <View style={styles.taskPicker}>
            {tasks.map((task) => {
              const active = task.id === selectedTaskId;
              const forbidden = task.type === "FORBIDDEN";
              return (
                <Pressable
                  key={task.id}
                  onPress={() => {
                    setSelectedTaskId(task.id);
                    setShowTaskPicker(false);
                  }}
                  style={[
                    styles.taskOption,
                    {
                      borderColor: active ? colors.gold : forbidden ? colors.danger : colors.border,
                      backgroundColor: active ? colors.gold : colors.cardSoft,
                    },
                  ]}
                >
                  <Text style={{ color: active ? "#1d1809" : colors.textPrimary, fontWeight: "700" }}>
                    {task.title}
                  </Text>
                  <Text style={{ color: active ? "#1d1809" : colors.textSecondary, fontSize: 12 }}>
                    {forbidden ? t("money.prohibitedTask") : getTaskCategory(task)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        <View style={styles.choiceRow}>
          <AppButton
            label={t("money.completedPay")}
            variant={choice === "COMPLETED" ? "primary" : "ghost"}
            onPress={() => setChoice("COMPLETED")}
            style={styles.choiceButton}
          />
          <AppButton
            label={t("money.notCompletedPay")}
            variant={choice === "NOT_COMPLETED" ? "primary" : "ghost"}
            onPress={() => setChoice("NOT_COMPLETED")}
            style={styles.choiceButton}
          />
        </View>

        <AppTextInput
          label={t("money.amountLabel")}
          value={amountInput}
          onChangeText={setAmountInput}
          keyboardType="numeric"
          autoCapitalize="none"
          placeholder={t("money.amountPlaceholder")}
        />
        <AppButton
          label={submittingCommitment ? t("money.savingCommitment") : t("money.saveCommitment")}
          onPress={() => void createCommitment()}
          disabled={submittingCommitment}
        />
      </AppCard>

      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
      {loading ? <LoadingBlock /> : null}

      {!loading ? (
        <>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, textAlign }]}>
            {t("money.commitments")}
          </Text>
          {commitments.length === 0 ? (
            <EmptyState title={t("money.emptyCommitments")} />
          ) : (
            commitments.map((item) => (
              <AppCard key={item.id} style={modernCardStyle}>
                <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>{item.task.title}</Text>
                <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>
                  {(item.triggerType === "COMPLETE_TASK" || item.triggerType === "DO_FORBIDDEN"
                    ? t("money.whenCompleted")
                    : t("money.whenNotCompleted"))}{" "}
                  | {formatMoney(item.amount)}
                </Text>
                <AppButton
                  label={t("money.removeCommitment")}
                  variant="ghost"
                  onPress={() => void removeCommitment(item.id)}
                />
              </AppCard>
            ))
          )}

          <Text style={[styles.sectionTitle, { color: colors.textPrimary, textAlign }]}>
            {t("money.entries")}
          </Text>
          {entries.length === 0 ? (
            <EmptyState title={t("money.emptyEntriesTitle")} subtitle={t("money.emptyEntriesSubtitle")} />
          ) : (
            entries.map((entry) => (
              <AppCard key={entry.id} style={modernCardStyle}>
                <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>{entry.task.title}</Text>
                <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>
                  {(entry.triggerType === "COMPLETE_TASK" || entry.triggerType === "DO_FORBIDDEN"
                    ? t("money.whenCompleted")
                    : t("money.whenNotCompleted"))}{" "}
                  | {formatMoney(entry.amount)} | {formatDate(entry.date)}
                </Text>
                <AppButton
                  label={t("money.removeEntry")}
                  variant="danger"
                  onPress={() => void removeEntry(entry.id)}
                />
              </AppCard>
            ))
          )}

          <Text style={[styles.sectionTitle, { color: colors.textPrimary, textAlign }]}>
            {t("money.settlements")}
          </Text>
          {settlements.length === 0 ? (
            <EmptyState title={t("money.emptySettlements")} />
          ) : (
            settlements.map((settlement) => (
              <AppCard key={settlement.batchId} style={modernCardStyle}>
                <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>
                  {t("money.paidAmount")}: {formatMoney(settlement.totalPaid)}
                </Text>
                <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>
                  {formatDate(settlement.settledAt)}
                </Text>
                <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>
                  {settlement.entries.map((entry) => entry.task.title).join(" | ")}
                </Text>
              </AppCard>
            ))
          )}
        </>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  totalLabel: {
    fontSize: 13,
  },
  totalValue: {
    fontSize: 32,
    fontWeight: "800",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
  },
  taskPicker: {
    gap: 8,
  },
  taskOption: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    gap: 2,
  },
  choiceRow: {
    gap: 8,
  },
  choiceButton: {
    width: "100%",
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  itemMeta: {
    fontSize: 13,
  },
  error: {
    fontSize: 13,
    fontWeight: "700",
  },
});
