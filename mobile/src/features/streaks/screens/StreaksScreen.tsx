import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
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

function toNumber(value: number | string): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function getGoalDays(row: Streak): number {
  const config = row.task?.config as Record<string, unknown> | undefined;
  const candidateKeys = [
    "streakGoalDays",
    "streakCycleDays",
    "streakTargetDays",
    "streakRepeatEveryDays",
  ];

  for (const key of candidateKeys) {
    const raw = config?.[key];
    const value = typeof raw === "number" ? raw : Number(raw);
    if (Number.isFinite(value) && value > 0) {
      return Math.floor(value);
    }
  }

  if (row.currentStreak < 7) {
    return 7;
  }

  return Math.ceil(row.currentStreak / 7) * 7;
}

function StreakProgressCircle({
  current,
  goal,
  colors,
}: {
  current: number;
  goal: number;
  colors: ReturnType<typeof useAppTheme>["colors"];
}) {
  const size = 84;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(current / Math.max(goal, 1), 1));
  const offset = circumference * (1 - progress);

  return (
    <View style={styles.circleWrap}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.cardSoft}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.gold}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.circleCenter}>
        <Text style={[styles.circleCurrent, { color: colors.textPrimary }]}>{current}</Text>
        <Text style={[styles.circleGoal, { color: colors.textSecondary }]}>/{goal}</Text>
      </View>
    </View>
  );
}

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
        rows.map((row) => {
          const goalDays = getGoalDays(row);
          const daysLeft = Math.max(goalDays - row.currentStreak, 0);

          return (
            <AppCard key={row.id}>
              <View style={[styles.row, { flexDirection: isArabic ? "row-reverse" : "row" }]}>
                <StreakProgressCircle current={row.currentStreak} goal={goalDays} colors={colors} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.taskTitle, { color: colors.textPrimary, textAlign }]}>{row.task.title}</Text>
                  <Text style={[styles.meta, { color: colors.textSecondary, textAlign }]}>
                    {t("streaks.current")}: {row.currentStreak} | {t("streaks.longest")}: {row.longestStreak}
                  </Text>
                  <Text style={[styles.meta, { color: colors.textSecondary, textAlign }]}>
                    {t("streaks.goal")}: {goalDays} | {t("streaks.leftDays")}: {daysLeft}
                  </Text>
                  <Text style={[styles.meta, { color: colors.textSecondary, textAlign }]}>
                    {t("streaks.graceUsed")}: {row.graceDaysUsed} | {t("streaks.multiplier")}:{" "}
                    {toNumber(row.rewardMultiplier).toFixed(2)}
                  </Text>
                </View>
              </View>
            </AppCard>
          );
        })
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
  row: {
    alignItems: "center",
    gap: 12,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  meta: {
    fontSize: 13,
  },
  circleWrap: {
    width: 84,
    height: 84,
    alignItems: "center",
    justifyContent: "center",
  },
  circleCenter: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    gap: 0,
  },
  circleCurrent: {
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 20,
  },
  circleGoal: {
    fontSize: 11,
    fontWeight: "600",
  },
});

