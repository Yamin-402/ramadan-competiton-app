import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { StyleSheet, Text } from "react-native";
import { streaksApi } from "../../../api/endpoints/streaks.api";
import { getApiErrorMessage } from "../../../api/client";
import { AppButton } from "../../../components/AppButton";
import { AppCard } from "../../../components/AppCard";
import { EmptyState } from "../../../components/EmptyState";
import { LoadingBlock } from "../../../components/LoadingBlock";
import { ScreenContainer } from "../../../components/ScreenContainer";
import { useAppTheme } from "../../../hooks/use-app-theme";
import { useI18n } from "../../../hooks/use-i18n";
import { Streak } from "../../../types/domain";

export function StreaksScreen() {
  const { colors } = useAppTheme();
  const { t, isArabic } = useI18n();
  const textAlign = isArabic ? "right" : "left";
  const [rows, setRows] = useState<Streak[]>([]);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await streaksApi.listMine();
      setRows(data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not load streaks"));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData])
  );

  const evaluateNow = async () => {
    setEvaluating(true);
    setError(null);
    try {
      const data = await streaksApi.evaluate();
      setRows(data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not evaluate streaks"));
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <ScreenContainer>
      <Text style={[styles.title, { color: colors.textPrimary, textAlign }]}>{t("streaks.title")}</Text>
      <AppButton
        label={evaluating ? t("streaks.recalculating") : t("streaks.recalculate")}
        variant="ghost"
        onPress={() => void evaluateNow()}
        disabled={evaluating}
      />
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

      {loading ? (
        <LoadingBlock />
      ) : rows.length === 0 ? (
        <EmptyState title={t("streaks.emptyTitle")} subtitle={t("streaks.emptySubtitle")} />
      ) : (
        rows.map((row) => (
          <AppCard key={row.id}>
            <Text style={[styles.taskTitle, { color: colors.textPrimary }]}>{row.task.title}</Text>
            <Text style={[styles.meta, { color: colors.textSecondary }]}>
              {t("streaks.current")}: {row.currentStreak} | {t("streaks.longest")}: {row.longestStreak}
            </Text>
            <Text style={[styles.meta, { color: colors.textSecondary }]}>
              {t("streaks.graceUsed")}: {row.graceDaysUsed} | {t("streaks.multiplier")}: {row.rewardMultiplier}
            </Text>
          </AppCard>
        ))
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: "800",
  },
  error: {
    fontSize: 13,
    fontWeight: "700",
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  meta: {
    fontSize: 13,
  },
});
