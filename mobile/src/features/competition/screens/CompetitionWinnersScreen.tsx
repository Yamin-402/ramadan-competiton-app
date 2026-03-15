import { Image, StyleSheet, Text, View } from "react-native";
import { AppButton } from "../../../components/AppButton";
import { AppCard } from "../../../components/AppCard";
import { EmptyState } from "../../../components/EmptyState";
import { LoadingBlock } from "../../../components/LoadingBlock";
import { ScreenContainer } from "../../../components/ScreenContainer";
import { useAppTheme } from "../../../hooks/use-app-theme";
import { useI18n } from "../../../hooks/use-i18n";
import { useCompetitionStore } from "../../../store/competition-store";
import { useEffect } from "react";

export function CompetitionWinnersScreen() {
  const { colors } = useAppTheme();
  const { t, isArabic } = useI18n();
  const competition = useCompetitionStore((state) => state.state);
  const loading = useCompetitionStore((state) => state.loading);
  const error = useCompetitionStore((state) => state.error);
  const load = useCompetitionStore((state) => state.load);
  const textAlign = isArabic ? "right" : "left";
  const isClosed = competition ? !competition.isOpen : false;

  useEffect(() => {
    if (!competition && !loading) {
      void load();
    }
  }, [competition, load, loading]);

  return (
    <ScreenContainer>
      <AppCard>
        <Text style={[styles.title, { color: colors.textPrimary, textAlign }]}>
          {t("competition.winnersTitle")}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary, textAlign }]}>
          {t("competition.winnersSubtitle")}
        </Text>
        <AppButton label={t("common.refresh")} variant="ghost" onPress={() => void load()} />
      </AppCard>

      {loading && !competition ? <LoadingBlock /> : null}

      {!competition && !loading && error ? (
        <EmptyState title="Network error" subtitle={error} />
      ) : null}

      {!competition && !loading && !error ? (
        <EmptyState title={t("common.loading")} subtitle={t("common.later")} />
      ) : null}

      {competition && !isClosed ? (
        <AppCard>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, textAlign }]}>
            {t("competition.winnersTitle")}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary, textAlign }]}>
            {t("competition.openMessage")}
          </Text>
        </AppCard>
      ) : null}

      {competition && isClosed && competition.winners.length === 0 ? (
        <EmptyState title={t("competition.closedTitle")} subtitle={t("competition.closedMessage")} />
      ) : null}

      {competition && isClosed && competition.winners.length > 0 ? (
        <View style={styles.list}>
          {competition.winners.map((winner) => (
            <AppCard key={winner.userId} style={styles.winnerCard}>
              <View style={styles.winnerRow}>
                <View style={[styles.rankBadge, { backgroundColor: colors.gold }]}>
                  <Text style={styles.rankText}>#{winner.rank}</Text>
                </View>
                {winner.avatarUrl ? (
                  <Image source={{ uri: winner.avatarUrl }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, { backgroundColor: colors.cardSoft }]} />
                )}
                <View style={styles.winnerInfo}>
                  <Text style={[styles.winnerName, { color: colors.textPrimary }]}>
                    {winner.displayName}
                  </Text>
                  <Text style={[styles.winnerPoints, { color: colors.textSecondary }]}>
                    {t("competition.points", { points: winner.totalPoints })}
                  </Text>
                </View>
              </View>
            </AppCard>
          ))}
        </View>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 20,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
  },
  list: {
    gap: 10,
  },
  winnerCard: {
    paddingVertical: 12,
  },
  winnerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rankBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  rankText: {
    fontWeight: "900",
    color: "#1b1406",
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  winnerInfo: {
    flex: 1,
  },
  winnerName: {
    fontWeight: "700",
  },
  winnerPoints: {
    fontSize: 12,
  },
});
