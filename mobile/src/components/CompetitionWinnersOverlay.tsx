import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useMemo, useState } from "react";
import { Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { navigateToCompetitionWinners } from "../app/navigation/navigationRef";
import { useAppTheme } from "../hooks/use-app-theme";
import { useI18n } from "../hooks/use-i18n";
import { useCompetitionStore } from "../store/competition-store";
import { useSettingsStore } from "../store/settings-store";
import { formatPoints } from "../utils/format";
import { AppButton } from "./AppButton";

type WinnerRank = 1 | 2 | 3;
type GradientColors = readonly [string, string, string];

function getMiniCardGradient(rank: WinnerRank, variant: string, mode: "light" | "dark"): GradientColors {
  const darkLike = mode === "dark" || variant === "ramadan_nights";

  if (rank === 1) {
    return ["rgba(248,224,139,0.95)", "rgba(202,162,74,0.92)", "rgba(248,224,139,0.95)"];
  }

  if (rank === 2) {
    if (variant === "ramadan_nights") {
      return ["rgba(223,208,255,0.92)", "rgba(95,77,147,0.86)", "rgba(26,19,58,0.96)"];
    }
    if (darkLike) {
      return ["rgba(238,241,245,0.32)", "rgba(201,209,218,0.16)", "rgba(0,0,0,0.34)"];
    }
    return ["rgba(238,241,245,0.95)", "rgba(207,214,223,0.95)", "rgba(238,241,245,0.95)"];
  }

  if (variant === "ramadan_nights") {
    return ["rgba(242,199,90,0.70)", "rgba(95,77,147,0.82)", "rgba(26,19,58,0.96)"];
  }
  if (darkLike) {
    return ["rgba(211,154,106,0.62)", "rgba(162,90,52,0.22)", "rgba(0,0,0,0.36)"];
  }
  return ["rgba(211,154,106,0.92)", "rgba(164,91,42,0.88)", "rgba(211,154,106,0.92)"];
}

function getMiniTextColor(rank: WinnerRank, variant: string, mode: "light" | "dark") {
  if (rank === 1) {
    // Always readable on gold.
    return "#1b1406";
  }
  return mode === "light" && variant !== "ramadan_nights" ? "#0b1020" : "#ffffff";
}

function getMiniSubTextColor(rank: WinnerRank, variant: string, mode: "light" | "dark") {
  const text = getMiniTextColor(rank, variant, mode);
  return text === "#ffffff" ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.65)";
}

function getMiniRingColor(rank: WinnerRank) {
  if (rank === 1) return "rgba(243,211,107,0.95)";
  if (rank === 2) return "rgba(207,214,223,0.95)";
  return "rgba(194,123,58,0.95)";
}

export function CompetitionWinnersOverlay() {
  const { colors, mode } = useAppTheme();
  const { isArabic, t } = useI18n();
  const variant = useSettingsStore((state) => state.tasksDesignVariant);
  const competition = useCompetitionStore((state) => state.state);
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();

  const podium = useMemo(() => {
    const winners = competition?.winners || [];
    const first = winners.find((row) => row.rank === 1) || winners[0] || null;
    const second = winners.find((row) => row.rank === 2) || winners[1] || null;
    const third = winners.find((row) => row.rank === 3) || winners[2] || null;
    return { first, second, third };
  }, [competition?.winners]);

  if (!competition || competition.isOpen || !competition.showWinnersPopup) {
    return null;
  }

  if (!competition.winners || competition.winners.length === 0) {
    return null;
  }

  const openWinners = () => {
    setOpen(false);
    navigateToCompetitionWinners();
  };

  return (
    <>
      <Pressable
        style={[styles.bubble, { backgroundColor: colors.gold, bottom: insets.bottom + 92 }]}
        onPress={() => setOpen(true)}
      >
        <Text style={styles.bubbleText}>🏆</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <View style={[styles.modal, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.modalHeader, { flexDirection: isArabic ? "row-reverse" : "row" }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: colors.textPrimary, textAlign: isArabic ? "right" : "left" }]}>
                  {t("competition.winnersTitle")}
                </Text>
                <Text
                  style={[
                    styles.subtitle,
                    { color: colors.textSecondary, textAlign: isArabic ? "right" : "left" },
                  ]}
                >
                  {t("competition.winnersSubtitle")}
                </Text>
              </View>

              <Pressable
                onPress={() => setOpen(false)}
                style={[styles.closeIcon, { borderColor: colors.border }]}
                hitSlop={12}
              >
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </Pressable>
            </View>

            <View style={styles.podium}>
              {podium.first ? (
                <Pressable onPress={openWinners}>
                  <LinearGradient
                    colors={getMiniCardGradient(1, variant, mode)}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.miniCardChampion}
                  >
                    <View style={[styles.miniRankPill, { backgroundColor: "rgba(0,0,0,0.55)" }]}>
                      <Text style={styles.miniRankText}>{isArabic ? "البطل" : "Champion"}</Text>
                    </View>

                    <View style={[styles.miniAvatarRing, { borderColor: getMiniRingColor(1) }]}>
                      {podium.first.avatarUrl ? (
                        <Image source={{ uri: podium.first.avatarUrl }} style={styles.miniAvatar} />
                      ) : (
                        <View style={[styles.miniAvatar, { backgroundColor: "rgba(0,0,0,0.08)" }]} />
                      )}
                    </View>

                    <Text
                      numberOfLines={1}
                      style={[styles.miniName, { color: getMiniTextColor(1, variant, mode) }]}
                    >
                      {podium.first.displayName}
                    </Text>
                    <Text style={[styles.miniPoints, { color: getMiniSubTextColor(1, variant, mode) }]}>
                      {t("competition.points", { points: formatPoints(podium.first.totalPoints) })}
                    </Text>
                  </LinearGradient>
                </Pressable>
              ) : null}

              <View style={[styles.podiumRow, { flexDirection: isArabic ? "row-reverse" : "row" }]}>
                {podium.second ? (
                  <Pressable style={{ flex: 1 }} onPress={openWinners}>
                    <LinearGradient
                      colors={getMiniCardGradient(2, variant, mode)}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.miniCardSide}
                    >
                      <View style={[styles.miniAvatarRing, { borderColor: getMiniRingColor(2) }]}>
                        {podium.second.avatarUrl ? (
                          <Image source={{ uri: podium.second.avatarUrl }} style={styles.miniAvatarSmall} />
                        ) : (
                          <View style={[styles.miniAvatarSmall, { backgroundColor: "rgba(0,0,0,0.10)" }]} />
                        )}
                      </View>
                      <Text
                        numberOfLines={1}
                        style={[styles.miniNameSmall, { color: getMiniTextColor(2, variant, mode) }]}
                      >
                        {podium.second.displayName}
                      </Text>
                      <Text style={[styles.miniPointsSmall, { color: getMiniSubTextColor(2, variant, mode) }]}>
                        #{podium.second.rank} · {formatPoints(podium.second.totalPoints)}
                      </Text>
                    </LinearGradient>
                  </Pressable>
                ) : null}

                {podium.third ? (
                  <Pressable style={{ flex: 1 }} onPress={openWinners}>
                    <LinearGradient
                      colors={getMiniCardGradient(3, variant, mode)}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.miniCardSide}
                    >
                      <View style={[styles.miniAvatarRing, { borderColor: getMiniRingColor(3) }]}>
                        {podium.third.avatarUrl ? (
                          <Image source={{ uri: podium.third.avatarUrl }} style={styles.miniAvatarSmall} />
                        ) : (
                          <View style={[styles.miniAvatarSmall, { backgroundColor: "rgba(0,0,0,0.12)" }]} />
                        )}
                      </View>
                      <Text
                        numberOfLines={1}
                        style={[styles.miniNameSmall, { color: getMiniTextColor(3, variant, mode) }]}
                      >
                        {podium.third.displayName}
                      </Text>
                      <Text style={[styles.miniPointsSmall, { color: getMiniSubTextColor(3, variant, mode) }]}>
                        #{podium.third.rank} · {formatPoints(podium.third.totalPoints)}
                      </Text>
                    </LinearGradient>
                  </Pressable>
                ) : null}
              </View>
            </View>

            <AppButton label={t("competition.viewWinners")} onPress={openWinners} />
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
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  modalHeader: {
    gap: 10,
    alignItems: "flex-start",
  },
  closeIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  podium: {
    gap: 10,
  },
  podiumRow: {
    gap: 10,
  },
  miniCardChampion: {
    borderRadius: 18,
    padding: 12,
    overflow: "hidden",
    minHeight: 160,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  miniCardSide: {
    borderRadius: 18,
    padding: 12,
    overflow: "hidden",
    minHeight: 118,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  miniRankPill: {
    position: "absolute",
    top: 10,
    right: 10,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  miniRankText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 12,
  },
  miniAvatarRing: {
    borderWidth: 3,
    borderRadius: 999,
    padding: 2,
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  miniAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  miniAvatarSmall: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  miniName: {
    fontWeight: "900",
    fontSize: 16,
  },
  miniPoints: {
    fontSize: 12,
    fontWeight: "800",
  },
  miniNameSmall: {
    fontWeight: "900",
    fontSize: 14,
  },
  miniPointsSmall: {
    fontSize: 11,
    fontWeight: "800",
  },
});

