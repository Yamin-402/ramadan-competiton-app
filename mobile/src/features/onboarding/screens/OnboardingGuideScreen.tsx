import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { AppButton } from "../../../components/AppButton";
import { ScreenContainer } from "../../../components/ScreenContainer";
import { useAppTheme } from "../../../hooks/use-app-theme";
import { useI18n } from "../../../hooks/use-i18n";
import { useAuthStore } from "../../../store/auth-store";
import { useSettingsStore } from "../../../store/settings-store";
import { getLayoutPalette } from "../../../theme/layout-palette";

type GuideMode = "first_login" | "replay";
type GuideVisualKey = "overview" | "tasks" | "forbidden" | "daily" | "money" | "more" | "rewards";

interface GuideRouteParams {
  mode?: GuideMode;
}

interface SlideItem {
  title: string;
  body: string;
  visual: GuideVisualKey;
}

interface GuideVisualProps {
  visual: GuideVisualKey;
  isArabic: boolean;
  colors: ReturnType<typeof useAppTheme>["colors"];
  mode: ReturnType<typeof useAppTheme>["mode"];
  t: ReturnType<typeof useI18n>["t"];
}

function VisualBadge({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.visualBadge, { borderColor: color }]}>
      <Text style={[styles.visualBadgeText, { color }]}>{label}</Text>
    </View>
  );
}

function GuideVisual({ visual, isArabic, colors, mode, t }: GuideVisualProps) {
  const align = isArabic ? "right" : "left";
  const direction = isArabic ? "row-reverse" : "row";
  const mockCardStyle = {
    backgroundColor: mode === "dark" ? colors.card : "#ffffff",
    borderColor: mode === "dark" ? colors.border : "#d4deec",
  };

  if (visual === "tasks") {
    return (
      <View style={[styles.mockCard, mockCardStyle]}>
        <View style={[styles.mockHeader, { flexDirection: direction }]}>
          <Text style={[styles.mockHeaderTitle, { color: colors.textPrimary, textAlign: align }]}>
            {t("guide.visualTasksTitle")}
          </Text>
          <VisualBadge label={t("tasks.fasting")} color={colors.gold} />
        </View>
        <View style={[styles.mockTaskRow, mockCardStyle]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.mockTaskTitle, { color: colors.textPrimary, textAlign: align }]}>
              {t("guide.visualTaskOne")}
            </Text>
            <View style={[styles.inlineBadges, { flexDirection: direction }]}>
              <VisualBadge label={t("tasks.categoryPrayers")} color={colors.success} />
              <VisualBadge label={t("tasks.typeYesNo")} color={colors.goldMuted} />
            </View>
          </View>
          <View style={[styles.highlightArrow, { borderColor: colors.gold }]}>
            <Text style={{ color: colors.gold, fontWeight: "800" }}>{isArabic ? "<" : ">"}</Text>
          </View>
        </View>
        <View style={[styles.mockTaskRow, mockCardStyle]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.mockTaskTitle, { color: colors.textPrimary, textAlign: align }]}>
              {t("guide.visualTaskTwo")}
            </Text>
            <View style={[styles.inlineBadges, { flexDirection: direction }]}>
              <VisualBadge label={t("tasks.categoryStudy")} color={colors.success} />
              <VisualBadge label={t("tasks.typeNumeric")} color={colors.goldMuted} />
            </View>
          </View>
          <View style={[styles.mockInput, { borderColor: colors.border }]}>
            <Text style={{ color: colors.textSecondary }}>12</Text>
          </View>
        </View>
      </View>
    );
  }

  if (visual === "forbidden") {
    return (
      <View style={[styles.mockCard, mockCardStyle]}>
        <Text style={[styles.mockHeaderTitle, { color: colors.danger, textAlign: align }]}>
          {t("guide.visualForbiddenTitle")}
        </Text>
        <View style={[styles.mockTaskRow, { borderColor: colors.danger }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.mockTaskTitle, { color: colors.textPrimary, textAlign: align }]}>
              {t("guide.visualForbiddenTask")}
            </Text>
            <Text style={[styles.mockTinyText, { color: colors.textSecondary, textAlign: align }]}>
              {t("guide.visualForbiddenNote")}
            </Text>
          </View>
          <Ionicons name="lock-closed" size={18} color={colors.danger} />
        </View>
      </View>
    );
  }

  if (visual === "daily") {
    return (
      <View style={[styles.mockCard, mockCardStyle]}>
        <View style={[styles.mockHeader, { flexDirection: direction }]}>
          <Text style={[styles.mockHeaderTitle, { color: colors.textPrimary, textAlign: align }]}>
            {t("guide.visualDailyTitle")}
          </Text>
          <VisualBadge label={t("daily.pending")} color={colors.gold} />
        </View>
        <Text style={[styles.mockTinyText, { color: colors.textSecondary, textAlign: align }]}>
          {t("guide.visualDailyQuestion")}
        </Text>
        <View style={[styles.mockOptions, { flexDirection: direction }]}>
          <View style={[styles.mockOption, { borderColor: colors.border }]}>
            <Text style={{ color: colors.textPrimary }}>{t("common.yes")}</Text>
          </View>
          <View style={[styles.mockOption, { borderColor: colors.border }]}>
            <Text style={{ color: colors.textPrimary }}>{t("common.no")}</Text>
          </View>
        </View>
        <Text style={[styles.mockTinyText, { color: colors.textSecondary, textAlign: align }]}>
          {t("guide.visualRevealHint")}
        </Text>
      </View>
    );
  }

  if (visual === "money") {
    return (
      <View style={[styles.mockCard, mockCardStyle]}>
        <Text style={[styles.mockHeaderTitle, { color: colors.textPrimary, textAlign: align }]}>
          {t("guide.visualMoneyTitle")}
        </Text>
        <View style={[styles.mockTaskRow, mockCardStyle]}>
          <Text style={[styles.mockTinyText, { color: colors.textSecondary, textAlign: align, flex: 1 }]}>
            {t("guide.visualMoneyRule")}
          </Text>
          <VisualBadge label="10" color={colors.gold} />
        </View>
        <Text style={[styles.mockTinyText, { color: colors.textSecondary, textAlign: align }]}>
          {t("guide.visualMoneyHint")}
        </Text>
      </View>
    );
  }

  if (visual === "more") {
    return (
      <View style={[styles.mockCard, mockCardStyle]}>
        <Text style={[styles.mockHeaderTitle, { color: colors.textPrimary, textAlign: align }]}>
          {t("guide.visualMoreTitle")}
        </Text>
        <View style={styles.mockList}>
          {[t("more.leaderboard"), t("more.history"), t("more.profile")].map((item) => (
            <View
              key={item}
              style={[
                styles.mockListItem,
                {
                  borderColor: colors.border,
                  flexDirection: direction,
                },
              ]}
            >
              <Ionicons name={isArabic ? "chevron-back" : "chevron-forward"} size={14} color={colors.textSecondary} />
              <Text style={{ color: colors.textPrimary, textAlign: align }}>{item}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (visual === "rewards") {
    return (
      <View style={[styles.mockCard, mockCardStyle]}>
        <View style={[styles.mockHeader, { flexDirection: direction }]}>
          <Text style={[styles.mockHeaderTitle, { color: colors.textPrimary, textAlign: align }]}>
            {t("guide.slide7Title")}
          </Text>
          <Ionicons name="trophy-outline" size={18} color={colors.gold} />
        </View>
        <Text style={[styles.mockTinyText, { color: colors.textSecondary, textAlign: align }]}>
          {t("guide.slide7Body2")}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.mockCard, mockCardStyle]}>
      <Text style={[styles.mockHeaderTitle, { color: colors.textPrimary, textAlign: align }]}>
        {t("guide.visualOverviewTitle")}
      </Text>
      <Text style={[styles.mockTinyText, { color: colors.textSecondary, textAlign: align }]}>
        {t("guide.visualOverviewText")}
      </Text>
      <View style={[styles.mockOptions, { flexDirection: direction }]}>
        <VisualBadge label={t("tasks.title")} color={colors.gold} />
        <VisualBadge label={t("daily.title")} color={colors.success} />
      </View>
    </View>
  );
}

function getGuideGradient(
  variant: ReturnType<typeof useSettingsStore.getState>["tasksDesignVariant"],
  mode: "light" | "dark"
): [string, string, string] {
  if (variant === "ramadan_modern") {
    return mode === "dark"
      ? ["#071610", "#0e2b1f", "#0a1f16"]
      : ["#f3ead2", "#e8d9af", "#d8c58f"];
  }

  if (variant === "modern") {
    return mode === "dark"
      ? ["#0f1723", "#162538", "#0f1f31"]
      : ["#eef4ff", "#dfeafe", "#f5f9ff"];
  }

  return mode === "dark"
    ? ["#1a1b1f", "#262934", "#1c1f28"]
    : ["#fff7e9", "#f5ecd8", "#fffaf0"];
}

export function OnboardingGuideScreen() {
  const { colors, mode } = useAppTheme();
  const { t, isArabic, language } = useI18n();
  const navigation = useNavigation<any>();
  const route = useRoute();
  const user = useAuthStore((state) => state.user);
  const variant = useSettingsStore((state) => state.tasksDesignVariant);
  const setAppLanguage = useSettingsStore((state) => state.setAppLanguage);
  const markOnboardingSeen = useSettingsStore((state) => state.markOnboardingSeen);
  const textAlign = isArabic ? "right" : "left";
  const params = (route.params || {}) as GuideRouteParams;
  const guideMode: GuideMode = params.mode || "first_login";
  const palette = getLayoutPalette(variant, colors, mode);

  const slides = useMemo<SlideItem[]>(
    () => [
      { title: t("guide.slide1Title"), body: t("guide.slide1Body"), visual: "overview" },
      { title: t("guide.slide2Title"), body: t("guide.slide2Body"), visual: "tasks" },
      { title: t("guide.slide3Title"), body: t("guide.slide3Body"), visual: "forbidden" },
      { title: t("guide.slide4Title"), body: t("guide.slide4Body"), visual: "daily" },
      { title: t("guide.slide5Title"), body: t("guide.slide5Body"), visual: "money" },
      { title: t("guide.slide6Title"), body: t("guide.slide6Body"), visual: "more" },
      { title: t("guide.slide7Title"), body: t("guide.slide7Body"), visual: "rewards" },
    ],
    [t]
  );
  const [index, setIndex] = useState(0);
  const isLast = index >= slides.length - 1;

  const finishGuide = () => {
    if (user) {
      markOnboardingSeen(user.id);
    }

    if (guideMode === "replay" && navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  return (
    <ScreenContainer
      useDefaultBackground={false}
      customBackground={
        <View style={StyleSheet.absoluteFillObject}>
          <LinearGradient colors={getGuideGradient(variant, mode)} style={StyleSheet.absoluteFillObject} />
          <View
            style={[
              styles.bgOrb,
              {
                backgroundColor: `${palette.tabActive}22`,
                top: 70,
                left: isArabic ? undefined : -20,
                right: isArabic ? -20 : undefined,
              },
            ]}
          />
          <View
            style={[
              styles.bgOrb,
              {
                backgroundColor: `${palette.topNavText}1f`,
                width: 160,
                height: 160,
                bottom: 100,
                right: isArabic ? undefined : -30,
                left: isArabic ? -30 : undefined,
              },
            ]}
          />
        </View>
      }
    >
      <View
        style={[
          styles.guideShell,
          {
            borderColor: `${palette.topNavText}4d`,
            backgroundColor: mode === "dark" ? `${colors.card}d9` : "#ffffffee",
          },
        ]}
      >
        <View
          style={[
            styles.card,
            {
              backgroundColor: mode === "dark" ? colors.card : "#f8fbff",
              borderColor: mode === "dark" ? colors.border : "#d7dfec",
            },
          ]}
        >
          <View style={[styles.languageRow, { flexDirection: isArabic ? "row-reverse" : "row" }]}>
            <Text style={[styles.kicker, { color: palette.tabActive, textAlign }]}>{t("guide.kicker")}</Text>
            <View style={styles.languageButtons}>
              <Pressable
                onPress={() => setAppLanguage("ar")}
                style={[
                  styles.langButton,
                  {
                    borderColor: language === "ar" ? palette.tabActive : colors.border,
                    backgroundColor: language === "ar" ? `${palette.tabActive}1f` : "transparent",
                  },
                ]}
              >
                <Text style={{ color: colors.textPrimary, fontWeight: "700" }}>{t("guide.langArabic")}</Text>
              </Pressable>
              <Pressable
                onPress={() => setAppLanguage("en")}
                style={[
                  styles.langButton,
                  {
                    borderColor: language === "en" ? palette.tabActive : colors.border,
                    backgroundColor: language === "en" ? `${palette.tabActive}1f` : "transparent",
                  },
                ]}
              >
                <Text style={{ color: colors.textPrimary, fontWeight: "700" }}>{t("guide.langEnglish")}</Text>
              </Pressable>
            </View>
          </View>

          <Text style={[styles.title, { color: colors.textPrimary, textAlign }]}>{slides[index]?.title}</Text>
          <Text style={[styles.body, { color: colors.textSecondary, textAlign }]}>{slides[index]?.body}</Text>

          <GuideVisual
            visual={slides[index]?.visual || "overview"}
            isArabic={isArabic}
            colors={colors}
            mode={mode}
            t={t}
          />

          <View style={styles.dotsRow}>
            {slides.map((_, itemIndex) => (
              <View
                key={String(itemIndex)}
                style={[
                  styles.dot,
                  {
                    backgroundColor: itemIndex === index ? palette.tabActive : colors.border,
                    width: itemIndex === index ? 18 : 8,
                  },
                ]}
              />
            ))}
          </View>
        </View>

        <View style={styles.actionsRow}>
          <AppButton label={t("guide.skip")} onPress={finishGuide} variant="ghost" style={styles.flexButton} />
          {index > 0 ? (
            <AppButton
              label={t("guide.back")}
              onPress={() => setIndex((prev) => Math.max(prev - 1, 0))}
              variant="ghost"
              style={styles.flexButton}
            />
          ) : null}
          {!isLast ? (
            <AppButton
              label={t("guide.next")}
              onPress={() => setIndex((prev) => Math.min(prev + 1, slides.length - 1))}
              style={styles.flexButton}
            />
          ) : (
            <AppButton
              label={guideMode === "replay" ? t("guide.done") : t("guide.start")}
              onPress={finishGuide}
              style={styles.flexButton}
            />
          )}
        </View>

        {guideMode === "replay" ? (
          <Pressable onPress={finishGuide}>
            <Text style={[styles.footerLink, { color: colors.textSecondary, textAlign }]}>
              {t("guide.closeAndReturn")}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  guideShell: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 24,
    padding: 12,
    gap: 12,
  },
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 10,
  },
  bgOrb: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 999,
  },
  languageRow: {
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  languageButtons: {
    flexDirection: "row",
    gap: 8,
  },
  langButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  kicker: {
    fontSize: 12,
    fontWeight: "800",
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 30,
  },
  body: {
    fontSize: 14,
    lineHeight: 22,
  },
  mockCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    gap: 8,
  },
  mockHeader: {
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  mockHeaderTitle: {
    fontSize: 14,
    fontWeight: "800",
    flex: 1,
  },
  mockTaskRow: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  mockTaskTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  mockTinyText: {
    fontSize: 12,
    lineHeight: 18,
  },
  inlineBadges: {
    gap: 6,
    marginTop: 6,
  },
  visualBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  visualBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  highlightArrow: {
    borderWidth: 1,
    borderRadius: 8,
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  mockInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 48,
    alignItems: "center",
  },
  mockOptions: {
    gap: 8,
    flexWrap: "wrap",
    alignItems: "center",
  },
  mockOption: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  mockList: {
    gap: 6,
  },
  mockListItem: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    justifyContent: "space-between",
    alignItems: "center",
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
  },
  dot: {
    height: 8,
    borderRadius: 999,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  flexButton: {
    flex: 1,
    minWidth: 100,
  },
  footerLink: {
    fontSize: 12,
    fontWeight: "700",
  },
});
