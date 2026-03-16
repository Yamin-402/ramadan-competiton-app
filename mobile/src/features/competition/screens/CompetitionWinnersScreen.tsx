import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { AppButton } from "../../../components/AppButton";
import { EmptyState } from "../../../components/EmptyState";
import { LoadingBlock } from "../../../components/LoadingBlock";
import { ScreenContainer } from "../../../components/ScreenContainer";
import { useAppTheme } from "../../../hooks/use-app-theme";
import { useI18n } from "../../../hooks/use-i18n";
import { useCompetitionStore } from "../../../store/competition-store";
import { TasksDesignVariant, useSettingsStore } from "../../../store/settings-store";
import { CompetitionWinner } from "../../../types/domain";
import { formatPoints } from "../../../utils/format";

type WinnerRank = 1 | 2 | 3;

function getRankTitle(rank: WinnerRank, isArabic: boolean) {
  if (isArabic) {
    if (rank === 1) return "البطل الأول";
    if (rank === 2) return "المركز الثاني";
    return "المركز الثالث";
  }
  if (rank === 1) return "Champion";
  if (rank === 2) return "Runner-up";
  return "Third place";
}

function getRankGradient(rank: WinnerRank, variant: TasksDesignVariant, mode: "light" | "dark") {
  const darkLike = mode === "dark" || variant === "ramadan_nights";
  if (rank === 1) return ["#f8e08b", "#caa24a", "#f8e08b"] as const;

  if (rank === 2) {
    if (variant === "ramadan_nights") {
      return ["rgba(223,208,255,0.86)", "rgba(95,77,147,0.86)", "rgba(26,19,58,0.96)"] as const;
    }
    if (darkLike) {
      return ["rgba(238,241,245,0.28)", "rgba(201,209,218,0.14)", "rgba(0,0,0,0.36)"] as const;
    }
    return ["#eef1f5", "#cfd6df", "#eef1f5"] as const;
  }

  if (variant === "ramadan_nights") {
    return ["rgba(242,199,90,0.65)", "rgba(95,77,147,0.82)", "rgba(26,19,58,0.96)"] as const;
  }
  if (darkLike) {
    return ["rgba(211,154,106,0.58)", "rgba(162,90,52,0.22)", "rgba(0,0,0,0.38)"] as const;
  }
  return ["#d39a6a", "#a45b2a", "#d39a6a"] as const;
}

function getRankRingColor(rank: WinnerRank) {
  if (rank === 1) return "#f3d36b";
  if (rank === 2) return "#c9d1da";
  return "#c27b3a";
}

function getRankTextColor(rank: WinnerRank, variant: TasksDesignVariant, mode: "light" | "dark") {
  const darkLike = mode === "dark" || variant === "ramadan_nights";
  if (rank === 1) return "#1b1406";
  if (darkLike) return "#ffffff";
  if (rank === 2) return "#0b1020";
  return "#ffffff";
}

function useEntranceAnimation(delayMs: number, startY = 18, startScale = 0.96) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(startY)).current;
  const scale = useRef(new Animated.Value(startScale)).current;

  useEffect(() => {
    const animation = Animated.sequence([
      Animated.delay(Math.max(0, delayMs)),
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 520,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 520,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          damping: 14,
          stiffness: 140,
        }),
      ]),
    ]);

    animation.start();
    return () => animation.stop();
  }, [delayMs, opacity, scale, translateY]);

  return {
    opacity,
    transform: [{ translateY }, { scale }],
  };
}

function useFloatAnimation(amplitude: number, durationMs: number, delayMs: number) {
  const value = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(Math.max(0, delayMs)),
        Animated.timing(value, {
          toValue: 1,
          duration: durationMs,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin),
        }),
        Animated.timing(value, {
          toValue: 0,
          duration: durationMs,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin),
        }),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [delayMs, durationMs, value]);

  return value.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -Math.max(0, amplitude)],
  });
}

function usePulseAnimation(durationMs: number, delayMs: number) {
  const value = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(Math.max(0, delayMs)),
        Animated.timing(value, {
          toValue: 1,
          duration: durationMs,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.quad),
        }),
        Animated.timing(value, {
          toValue: 0,
          duration: durationMs,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.quad),
        }),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [delayMs, durationMs, value]);

  return value;
}

function HeroSparkles({ color }: { color: string }) {
  const a = usePulseAnimation(2400, 0);
  const b = usePulseAnimation(2700, 320);
  const c = usePulseAnimation(3000, 520);
  const d = usePulseAnimation(2600, 780);
  const e = usePulseAnimation(3200, 980);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View
        style={[
          styles.heroSparkle,
          {
            top: 10,
            left: 16,
            opacity: a.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.45] }),
            transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) }],
          },
        ]}
      >
        <Ionicons name="sparkles" size={18} color={color} />
      </Animated.View>

      <Animated.View
        style={[
          styles.heroSparkle,
          {
            top: 28,
            right: 22,
            opacity: b.interpolate({ inputRange: [0, 1], outputRange: [0.10, 0.38] }),
            transform: [{ translateY: b.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) }],
          },
        ]}
      >
        <Ionicons name="star" size={14} color={color} />
      </Animated.View>

      <Animated.View
        style={[
          styles.heroSparkle,
          {
            bottom: 18,
            left: 40,
            opacity: c.interpolate({ inputRange: [0, 1], outputRange: [0.08, 0.32] }),
            transform: [{ translateY: c.interpolate({ inputRange: [0, 1], outputRange: [0, -9] }) }],
          },
        ]}
      >
        <Ionicons name="star-outline" size={16} color={color} />
      </Animated.View>

      <Animated.View
        style={[
          styles.heroSparkle,
          {
            bottom: 34,
            right: 46,
            opacity: d.interpolate({ inputRange: [0, 1], outputRange: [0.10, 0.40] }),
            transform: [{ translateY: d.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) }],
          },
        ]}
      >
        <Ionicons name="sparkles-outline" size={18} color={color} />
      </Animated.View>

      <Animated.View
        style={[
          styles.heroSparkle,
          {
            top: 54,
            left: 140,
            opacity: e.interpolate({ inputRange: [0, 1], outputRange: [0.06, 0.24] }),
            transform: [{ translateY: e.interpolate({ inputRange: [0, 1], outputRange: [0, -7] }) }],
          },
        ]}
      >
        <Ionicons name="ellipse" size={12} color={color} />
      </Animated.View>
    </View>
  );
}

function WinnerAvatar({
  winner,
  rank,
  size,
}: {
  winner: CompetitionWinner;
  rank: WinnerRank;
  size: number;
}) {
  const { colors } = useAppTheme();
  const ringColor = getRankRingColor(rank);
  const initial = (winner.displayName || "U").trim().charAt(0).toUpperCase();
  const placeholderBg =
    rank === 3 ? "rgba(0,0,0,0.28)" : colors.cardSoft;
  const placeholderTextColor = rank === 3 ? "#ffffff" : colors.textPrimary;

  return (
    <View style={[styles.avatarRing, { borderColor: ringColor, width: size + 10, height: size + 10, borderRadius: (size + 10) / 2 }]}>
      {winner.avatarUrl ? (
        <Image
          source={{ uri: winner.avatarUrl }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          resizeMode="cover"
        />
      ) : (
        <View
          style={[
            styles.avatarPlaceholder,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: placeholderBg,
            },
          ]}
        >
          <Text style={[styles.avatarPlaceholderText, { color: placeholderTextColor }]}>{initial}</Text>
        </View>
      )}
    </View>
  );
}

function WinnerCard({
  winner,
  rank,
  large,
}: {
  winner: CompetitionWinner;
  rank: WinnerRank;
  large?: boolean;
}) {
  const { colors, mode } = useAppTheme();
  const variant = useSettingsStore((state) => state.tasksDesignVariant);
  const { t, isArabic } = useI18n();
  const appearOrder = rank === 2 ? 0 : rank === 1 ? 1 : 2;
  const entrance = useEntranceAnimation(
    140 + appearOrder * 160,
    rank === 1 ? (large ? 30 : 24) : 20,
    rank === 1 ? 0.94 : 0.96
  );
  const floatY = useFloatAnimation(large ? 10 : 7, large ? 2600 : 3000, 240 + appearOrder * 160);

  const darkLike = mode === "dark" || variant === "ramadan_nights";
  const gradient = getRankGradient(rank, variant, mode);
  const textColor = getRankTextColor(rank, variant, mode);
  const subTextColor = textColor === "#ffffff" ? "rgba(255,255,255,0.86)" : "rgba(0,0,0,0.68)";
  const achievementBg = darkLike
    ? "rgba(0,0,0,0.26)"
    : rank === 1
      ? "rgba(255,255,255,0.22)"
      : rank === 2
        ? "rgba(255,255,255,0.35)"
        : "rgba(0,0,0,0.22)";
  const borderColor = darkLike ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.10)";

  const shine = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (rank !== 1 || !large) {
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(350),
        Animated.timing(shine, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.quad),
        }),
        Animated.timing(shine, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [large, rank, shine]);

  const shineX = shine.interpolate({
    inputRange: [0, 1],
    outputRange: [-160, 220],
  });

  const pointsLabel = t("competition.points", { points: formatPoints(winner.totalPoints) });
  const title = getRankTitle(rank, isArabic);

  const achievement =
    rank === 1
      ? isArabic
        ? "أعلى مجموع نقاط في المنافسة"
        : "Highest score in the competition"
      : rank === 2
        ? isArabic
          ? "قريب جدًا من القمة"
          : "Very close to the top"
        : isArabic
          ? "إنجاز ممتاز"
          : "Great achievement";

  return (
    <Animated.View style={[{ opacity: entrance.opacity, transform: entrance.transform }]}>
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.winnerCard,
          large ? styles.winnerCardLarge : styles.winnerCardSmall,
          { borderColor },
          large ? styles.winnerCardShadowLarge : styles.winnerCardShadow,
        ]}
      >
        <Ionicons
          name={rank === 1 ? "trophy" : "medal"}
          size={large ? 120 : 98}
          color={rank === 1 ? "rgba(255,255,255,0.60)" : textColor === "#ffffff" ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.22)"}
          style={[styles.cardBgIcon, { transform: [{ rotate: "-18deg" }] }]}
        />

        {rank === 1 && large ? (
          <Animated.View
            pointerEvents="none"
            style={[styles.championShine, { transform: [{ translateX: shineX }, { rotate: "-16deg" }] }]}
          >
            <LinearGradient
              colors={["transparent", "rgba(255,255,255,0.55)", "transparent"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        ) : null}

        <View style={[styles.rankPill, { backgroundColor: "rgba(0,0,0,0.58)" }]}>
          <Text style={styles.rankPillText}>{title}</Text>
        </View>

        <Animated.View style={{ transform: [{ translateY: floatY }] }}>
          <WinnerAvatar winner={winner} rank={rank} size={large ? 92 : 72} />
        </Animated.View>

        <Text
          numberOfLines={2}
          style={[
            styles.winnerName,
            { color: textColor, textAlign: isArabic ? "right" : "left" },
            large && styles.winnerNameLarge,
          ]}
        >
          {winner.displayName}
        </Text>

        <View
          style={[
            styles.pointsRow,
            {
              flexDirection: isArabic ? "row-reverse" : "row",
              alignSelf: isArabic ? "flex-end" : "flex-start",
            },
          ]}
        >
          <Ionicons name="sparkles" size={16} color={textColor} />
          <Text style={[styles.winnerPoints, { color: textColor }]}>{pointsLabel}</Text>
        </View>

        <View style={[styles.achievementBox, { backgroundColor: achievementBg }]}>
          <Text style={[styles.achievementTitle, { color: textColor }]}>
            {rank === 1 ? (isArabic ? "تهانينا!" : "Congratulations!") : isArabic ? "تحية كبيرة!" : "Well done!"}
          </Text>
          <Text style={[styles.achievementText, { color: subTextColor }]}>
            {achievement}
          </Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

function computeAveragePoints(winners: CompetitionWinner[]) {
  if (!winners || winners.length === 0) return 0;
  const sum = winners.reduce((acc, row) => acc + (Number(row.totalPoints) || 0), 0);
  return sum / winners.length;
}

export function CompetitionWinnersScreen() {
  const { colors, mode } = useAppTheme();
  const { t, isArabic } = useI18n();
  const variant = useSettingsStore((state) => state.tasksDesignVariant);
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

  const winners = competition?.winners || [];
  const first = winners.find((row) => row.rank === 1) || winners[0] || null;
  const second = winners.find((row) => row.rank === 2) || winners[1] || null;
  const third = winners.find((row) => row.rank === 3) || winners[2] || null;

  const accent = variant === "ramadan_nights" ? "#f8e08b" : colors.gold;
  const heroGradient = useMemo(() => {
    if (variant === "ramadan_nights") {
      return ["rgba(255,231,178,0.18)", "rgba(43,26,105,0.55)", "rgba(19,13,45,0.70)"] as const;
    }
    if (variant === "ramadan_modern") {
      return ["rgba(197,161,74,0.35)", "rgba(18,59,43,0.72)", "rgba(10,37,27,0.85)"] as const;
    }
    if (variant === "modern") {
      return mode === "dark"
        ? (["rgba(31,42,62,0.85)", "rgba(14,22,36,0.92)", "rgba(10,12,22,0.95)"] as const)
        : (["rgba(44,114,255,0.16)", "rgba(230,238,255,0.9)", "rgba(255,255,255,0.95)"] as const);
    }
    return mode === "dark"
      ? (["rgba(40,52,46,0.88)", "rgba(18,24,22,0.94)", "rgba(10,12,12,0.95)"] as const)
      : (["rgba(245,234,208,0.95)", "rgba(255,255,255,0.92)", "rgba(255,255,255,0.95)"] as const);
  }, [mode, variant]);

  const statRows = useMemo(() => {
    if (!isClosed || winners.length === 0) {
      return null;
    }
    const topPoints = first ? Number(first.totalPoints) : 0;
    const avg = computeAveragePoints(winners);
    return {
      topPoints,
      avg,
    };
  }, [first, isClosed, winners]);

  return (
    <ScreenContainer>
      <LinearGradient
        colors={heroGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { borderColor: colors.border }]}
      >
        <HeroSparkles color={accent} />
        <View style={[styles.heroTopRow, { flexDirection: isArabic ? "row-reverse" : "row" }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.heroTitle, { color: colors.textPrimary, textAlign }]}>
              {t("competition.winnersTitle")}
            </Text>
            <Text style={[styles.heroSubtitle, { color: colors.textSecondary, textAlign }]}>
              {t("competition.winnersSubtitle")}
            </Text>
          </View>
          <View style={[styles.trophyWrap, { borderColor: colors.border }]}>
            <Ionicons name="trophy" size={22} color={accent} />
          </View>
        </View>

        <View style={[styles.heroActions, { flexDirection: isArabic ? "row-reverse" : "row" }]}>
          <AppButton label={t("common.refresh")} variant="ghost" onPress={() => void load()} />
        </View>
      </LinearGradient>

      {loading && !competition ? <LoadingBlock /> : null}

      {!competition && !loading && error ? (
        <EmptyState title="Network error" subtitle={error} />
      ) : null}

      {!competition && !loading && !error ? (
        <EmptyState title={t("common.loading")} subtitle={t("common.later")} />
      ) : null}

      {competition && !isClosed ? (
        <View style={[styles.noticeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.noticeRow, { flexDirection: isArabic ? "row-reverse" : "row" }]}>
            <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
            <Text style={[styles.noticeText, { color: colors.textSecondary, textAlign }]}>
              {t("competition.openMessage")}
            </Text>
          </View>
        </View>
      ) : null}

      {competition && isClosed && winners.length === 0 ? (
        <EmptyState title={t("competition.closedTitle")} subtitle={t("competition.closedMessage")} />
      ) : null}

      {competition && isClosed && winners.length > 0 ? (
        <>
          {first ? <WinnerCard winner={first} rank={1} large /> : null}
          <View style={[styles.podiumRow, { flexDirection: isArabic ? "row-reverse" : "row" }]}>
            <View style={{ flex: 1 }}>
              {second ? <WinnerCard winner={second} rank={2} /> : null}
            </View>
            <View style={{ flex: 1 }}>
              {third ? <WinnerCard winner={third} rank={3} /> : null}
            </View>
          </View>

          {statRows ? (
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="flame" size={18} color={accent} />
                <Text style={[styles.statLabel, { color: colors.textSecondary, textAlign }]}>{isArabic ? "أعلى نقاط" : "Top points"}</Text>
                <Text style={[styles.statValue, { color: colors.textPrimary, textAlign }]}>{formatPoints(statRows.topPoints)}</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="stats-chart" size={18} color={accent} />
                <Text style={[styles.statLabel, { color: colors.textSecondary, textAlign }]}>{isArabic ? "متوسط التوب 3" : "Top 3 average"}</Text>
                <Text style={[styles.statValue, { color: colors.textPrimary, textAlign }]}>{formatPoints(statRows.avg)}</Text>
              </View>
            </View>
          ) : null}

          <View style={[styles.reflectionCard, { backgroundColor: colors.cardSoft, borderColor: colors.border }]}>
            <Text style={[styles.reflectionTitle, { color: colors.textPrimary, textAlign }]}>
              {isArabic ? "رمضان فرصة" : "Ramadan Reflection"}
            </Text>
            <Text style={[styles.reflectionText, { color: colors.textSecondary, textAlign }]}>
              {isArabic
                ? "كل نقطة كانت خطوة للأفضل. استمروا على اللي اكتسبتوه بعد رمضان."
                : "Every point was a step forward. Keep the habits you built after Ramadan."}
            </Text>
          </View>
        </>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 10,
    overflow: "hidden",
  },
  heroSparkle: {
    position: "absolute",
    zIndex: 0,
  },
  heroTopRow: {
    gap: 12,
    alignItems: "center",
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "900",
  },
  heroSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  trophyWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.12)",
  },
  heroActions: {
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 10,
  },
  noticeCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
  },
  noticeRow: {
    alignItems: "center",
    gap: 10,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
  },
  podiumRow: {
    gap: 12,
  },
  winnerCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 14,
    gap: 10,
    overflow: "hidden",
    minHeight: 232,
  },
  winnerCardShadow: {
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  winnerCardShadowLarge: {
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 14 },
    elevation: 8,
  },
  winnerCardLarge: {
    minHeight: 270,
  },
  winnerCardSmall: {
    minHeight: 232,
  },
  rankPill: {
    position: "absolute",
    top: 12,
    right: 12,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    zIndex: 2,
  },
  rankPillText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 12,
  },
  cardBgIcon: {
    position: "absolute",
    top: -14,
    right: -10,
    opacity: 0.14,
  },
  championShine: {
    position: "absolute",
    top: -80,
    left: 0,
    width: 220,
    height: 520,
    opacity: 0.22,
  },
  avatarRing: {
    alignSelf: "center",
    borderWidth: 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  avatarPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarPlaceholderText: {
    fontSize: 26,
    fontWeight: "900",
  },
  winnerName: {
    fontSize: 16,
    fontWeight: "900",
  },
  winnerNameLarge: {
    fontSize: 18,
  },
  pointsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
  },
  winnerPoints: {
    fontWeight: "900",
    fontSize: 13,
  },
  achievementBox: {
    marginTop: "auto",
    borderRadius: 16,
    padding: 12,
    backgroundColor: "rgba(0,0,0,0.14)",
  },
  achievementTitle: {
    fontWeight: "900",
    marginBottom: 4,
  },
  achievementText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800",
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    gap: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "800",
  },
  statValue: {
    fontSize: 16,
    fontWeight: "900",
  },
  reflectionCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 6,
  },
  reflectionTitle: {
    fontWeight: "900",
    fontSize: 15,
  },
  reflectionText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
  },
});
