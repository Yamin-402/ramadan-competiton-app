import { useState } from "react";
import { Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../hooks/use-app-theme";
import { useCompetitionStore } from "../store/competition-store";
import { useI18n } from "../hooks/use-i18n";

export function CompetitionWinnersOverlay() {
  const { colors } = useAppTheme();
  const { isArabic, t } = useI18n();
  const competition = useCompetitionStore((state) => state.state);
  const [open, setOpen] = useState(false);

  if (!competition || competition.isOpen || !competition.showWinnersPopup) {
    return null;
  }

  if (!competition.winners || competition.winners.length === 0) {
    return null;
  }

  return (
    <>
      <Pressable
        style={[styles.bubble, { backgroundColor: colors.gold }]}
        onPress={() => setOpen(true)}
      >
        <Text style={styles.bubbleText}>🏆</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <View style={[styles.modal, { backgroundColor: colors.card }]}
          >
            <Text style={[styles.title, { color: colors.textPrimary, textAlign: isArabic ? "right" : "left" }]}>
              {t("competition.winnersTitle")}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary, textAlign: isArabic ? "right" : "left" }]}>
              {t("competition.winnersSubtitle")}
            </Text>

            <View style={styles.winnersList}>
              {competition.winners.map((winner) => (
                <View
                  key={winner.userId}
                  style={[styles.winnerRow, { borderColor: colors.border }]}
                >
                  <View style={[styles.rank, { backgroundColor: colors.gold }]}
                  >
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
              ))}
            </View>

            <Pressable
              style={[styles.closeButton, { borderColor: colors.border }]}
              onPress={() => setOpen(false)}
            >
              <Text style={{ color: colors.textPrimary }}>{t("common.close")}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bubble: {
    position: "absolute",
    right: 16,
    bottom: 92,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 60,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  bubbleText: {
    fontSize: 22,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modal: {
    width: "100%",
    borderRadius: 18,
    padding: 16,
    gap: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 13,
  },
  winnersList: {
    gap: 8,
  },
  winnerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
  },
  rank: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  rankText: {
    fontWeight: "800",
    color: "#1f1808",
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
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
  closeButton: {
    alignSelf: "flex-end",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
});
