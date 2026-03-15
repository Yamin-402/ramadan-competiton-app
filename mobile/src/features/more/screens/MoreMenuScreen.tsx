import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MoreStackParamList } from "../../../app/navigation/types";
import { AppCard } from "../../../components/AppCard";
import { ScreenContainer } from "../../../components/ScreenContainer";
import { useAppTheme } from "../../../hooks/use-app-theme";
import { useI18n } from "../../../hooks/use-i18n";
import { useAuthStore } from "../../../store/auth-store";
import { useSettingsStore } from "../../../store/settings-store";
import { useCompetitionStore } from "../../../store/competition-store";

type Props = NativeStackScreenProps<MoreStackParamList, "MoreMenu">;

export function MoreMenuScreen({ navigation }: Props) {
  const { colors, mode } = useAppTheme();
  const { t, isArabic } = useI18n();
  const tasksDesignVariant = useSettingsStore((state) => state.tasksDesignVariant);
  const user = useAuthStore((state) => state.user);
  const competition = useCompetitionStore((state) => state.state);
  const textAlign = isArabic ? "right" : "left";
  const chevron = isArabic ? "chevron-back" : "chevron-forward";
  const showWinners = Boolean(competition && competition.isOpen === false);
  const menu = [
    { route: "Guide", label: t("more.guide"), icon: "help-circle-outline" },
    { route: "Leaderboard", label: t("more.leaderboard"), icon: "trophy-outline" },
    ...(showWinners
      ? [{ route: "CompetitionWinners", label: t("more.winners"), icon: "medal-outline" }]
      : []),
    { route: "Streaks", label: t("more.streaks"), icon: "flame-outline" },
    { route: "Notifications", label: t("more.notifications"), icon: "notifications-outline" },
    { route: "Money", label: t("more.money"), icon: "cash-outline" },
    { route: "ActivityStats", label: t("more.stats"), icon: "stats-chart-outline" },
    { route: "AiReport", label: t("more.aiReport"), icon: "sparkles-outline" },
    { route: "ActivityHistory", label: t("more.history"), icon: "list-outline" },
    { route: "Profile", label: t("more.profile"), icon: "person-outline" },
  ] as const;

  const isModernVariant = tasksDesignVariant === "modern";
  const isNightVariant = tasksDesignVariant === "ramadan_nights";
  const modernHeroStyle = isModernVariant
    ? mode === "dark"
      ? { backgroundColor: colors.card, borderColor: colors.border }
      : { backgroundColor: "#f7fbff", borderColor: "#d6e3f2" }
    : isNightVariant
      ? { backgroundColor: "#1c1542", borderColor: "#5d4a8f" }
      : undefined;
  const modernRowStyle = isModernVariant
    ? mode === "dark"
      ? { backgroundColor: colors.cardSoft, borderColor: colors.border }
      : { backgroundColor: "#f8fbff", borderColor: "#d7dfec" }
    : isNightVariant
      ? { backgroundColor: "#211a4b", borderColor: "#5a478f" }
      : undefined;

  return (
    <ScreenContainer>
      <AppCard style={modernHeroStyle}>
        <Text style={[styles.title, { color: colors.textPrimary, textAlign }]}>
          {t("more.welcome")}
          {user?.displayName ? `, ${user.displayName}` : ""}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary, textAlign }]}>
          {t("more.subtitle")}
        </Text>
      </AppCard>

      <View style={styles.list}>
        {menu.map((item) => (
          <Pressable
            key={item.route}
            onPress={() => navigation.navigate(item.route)}
            style={[
              styles.menuRow,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                flexDirection: isArabic ? "row-reverse" : "row",
              },
              modernRowStyle,
            ]}
          >
            <View style={[styles.menuLeft, { flexDirection: isArabic ? "row-reverse" : "row" }]}>
              <Ionicons name={item.icon} size={20} color={colors.gold} />
              <Text style={[styles.menuLabel, { color: colors.textPrimary, textAlign }]}>{item.label}</Text>
            </View>
            <Ionicons name={chevron} size={18} color={colors.textSecondary} />
          </Pressable>
        ))}
      </View>
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
  list: {
    gap: 10,
  },
  menuRow: {
    borderWidth: 1,
    borderRadius: 14,
    minHeight: 56,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: "700",
  },
});
