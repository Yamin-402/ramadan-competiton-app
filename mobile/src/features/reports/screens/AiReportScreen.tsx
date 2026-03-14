import { useState } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { usersApi } from "../../../api/endpoints/users.api";
import { getApiErrorMessage } from "../../../api/client";
import { AppButton } from "../../../components/AppButton";
import { AppCard } from "../../../components/AppCard";
import { EmptyState } from "../../../components/EmptyState";
import { LoadingBlock } from "../../../components/LoadingBlock";
import { ScreenContainer } from "../../../components/ScreenContainer";
import { useAppTheme } from "../../../hooks/use-app-theme";
import { useI18n } from "../../../hooks/use-i18n";
import { AiUserReport } from "../../../types/domain";

type ReportLength = "SHORT" | "MEDIUM" | "LONG";
type FocusMode = "SUMMARY" | "COMPARISON" | "BOTH";
type ReportLanguage = "AR" | "EN";
type ReportTone = "MOTIVATIONAL" | "BALANCED" | "STRICT";

function OptionChip({
  label,
  active,
  onPress,
  colors,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useAppTheme>["colors"];
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          borderColor: active ? colors.gold : colors.border,
          backgroundColor: active ? `${colors.gold}22` : colors.cardSoft,
        },
      ]}
    >
      <Text style={{ color: colors.textPrimary, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
}

function FeatureToggle({
  label,
  value,
  onValueChange,
  colors,
}: {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  colors: ReturnType<typeof useAppTheme>["colors"];
}) {
  return (
    <View style={[styles.toggleRow, { borderColor: colors.border }]}>
      <Text style={{ color: colors.textPrimary, flex: 1 }}>{label}</Text>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
}

export function AiReportScreen() {
  const { colors } = useAppTheme();
  const { isArabic } = useI18n();
  const textAlign = isArabic ? "right" : "left";
  const [lookbackDays, setLookbackDays] = useState(14);
  const [reportLength, setReportLength] = useState<ReportLength>("MEDIUM");
  const [focusMode, setFocusMode] = useState<FocusMode>("BOTH");
  const [language, setLanguage] = useState<ReportLanguage>(isArabic ? "AR" : "EN");
  const [tone, setTone] = useState<ReportTone>("MOTIVATIONAL");
  const [includeDailyQuestions, setIncludeDailyQuestions] = useState(true);
  const [includeTiming, setIncludeTiming] = useState(true);
  const [includeTopTasks, setIncludeTopTasks] = useState(true);
  const [includeStreaks, setIncludeStreaks] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<AiUserReport | null>(null);

  const generateReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await usersApi.generateMyAiReport({
        lookbackDays,
        reportLength,
        focusMode,
        language,
        tone,
        includeDailyQuestions,
        includeTiming,
        includeTopTasks,
        includeStreaks,
      });
      setReport(data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not generate report"));
    } finally {
      setLoading(false);
    }
  };

  const labels = {
    title: isArabic ? "تقرير AI الشخصي" : "AI Personal Report",
    subtitle: isArabic
      ? "حدد شكل التقرير والخيارات اللي تهمك، وبعدها ولّد تقرير مخصص لك."
      : "Choose report options and generate a personalized report.",
    generate: isArabic ? "توليد التقرير" : "Generate report",
    generating: isArabic ? "جاري توليد التقرير..." : "Generating report...",
    lookback: isArabic ? "الفترة الزمنية" : "Lookback window",
    length: isArabic ? "طول التقرير" : "Report length",
    focus: isArabic ? "نوع التركيز" : "Focus mode",
    language: isArabic ? "لغة التقرير" : "Report language",
    tone: isArabic ? "أسلوب التقرير" : "Tone",
    features: isArabic ? "خيارات إضافية" : "Additional options",
    noReportTitle: isArabic ? "لم يتم إنشاء تقرير بعد" : "No report yet",
    noReportSubtitle: isArabic ? "اضغط توليد التقرير لعرض التحليل." : "Generate a report to see analysis.",
    includeDailyQuestions: isArabic ? "تضمين تحليل السؤال اليومي" : "Include daily-question analysis",
    includeTiming: isArabic ? "تضمين تحليل الصيام/الإفطار" : "Include fasting/iftar timing analysis",
    includeTopTasks: isArabic ? "تضمين أكثر المهام تكرارًا" : "Include most repeated tasks",
    includeStreaks: isArabic ? "تضمين تحليل الاستمرارية" : "Include streak analysis",
    highlights: isArabic ? "أبرز النقاط" : "Highlights",
    comparison: isArabic ? "مقارنة الأداء" : "Performance comparison",
    actionPlan: isArabic ? "خطة عملية" : "Action plan",
    motivation: isArabic ? "رسالة تحفيزية" : "Motivation",
    metrics: {
      activeDays: isArabic ? "أيام النشاط" : "Active days",
      totalPoints: isArabic ? "إجمالي النقاط" : "Total points",
      totalActivities: isArabic ? "إجمالي الأنشطة" : "Total activities",
      avgPoints: isArabic ? "متوسط يومي" : "Daily avg",
    },
    aiSource: isArabic ? "المصدر" : "Source",
    aiUsed: isArabic ? "مولد بالذكاء الاصطناعي" : "Generated by AI",
    aiFallback: isArabic ? "قالب ذكي احتياطي" : "Smart fallback template",
  };

  return (
    <ScreenContainer>
      <Text style={[styles.title, { color: colors.textPrimary, textAlign }]}>{labels.title}</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary, textAlign }]}>{labels.subtitle}</Text>

      <AppCard>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary, textAlign }]}>{labels.lookback}</Text>
        <View style={styles.chipsRow}>
          {[7, 14, 21, 30].map((days) => (
            <OptionChip
              key={String(days)}
              label={isArabic ? `${days} يوم` : `${days} days`}
              active={lookbackDays === days}
              onPress={() => setLookbackDays(days)}
              colors={colors}
            />
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textPrimary, textAlign }]}>{labels.length}</Text>
        <View style={styles.chipsRow}>
          <OptionChip
            label={isArabic ? "قصير" : "Short"}
            active={reportLength === "SHORT"}
            onPress={() => setReportLength("SHORT")}
            colors={colors}
          />
          <OptionChip
            label={isArabic ? "متوسط" : "Medium"}
            active={reportLength === "MEDIUM"}
            onPress={() => setReportLength("MEDIUM")}
            colors={colors}
          />
          <OptionChip
            label={isArabic ? "طويل" : "Long"}
            active={reportLength === "LONG"}
            onPress={() => setReportLength("LONG")}
            colors={colors}
          />
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textPrimary, textAlign }]}>{labels.focus}</Text>
        <View style={styles.chipsRow}>
          <OptionChip
            label={isArabic ? "ملخص" : "Summary"}
            active={focusMode === "SUMMARY"}
            onPress={() => setFocusMode("SUMMARY")}
            colors={colors}
          />
          <OptionChip
            label={isArabic ? "مقارنة" : "Comparison"}
            active={focusMode === "COMPARISON"}
            onPress={() => setFocusMode("COMPARISON")}
            colors={colors}
          />
          <OptionChip
            label={isArabic ? "الاثنين" : "Both"}
            active={focusMode === "BOTH"}
            onPress={() => setFocusMode("BOTH")}
            colors={colors}
          />
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textPrimary, textAlign }]}>{labels.language}</Text>
        <View style={styles.chipsRow}>
          <OptionChip
            label={isArabic ? "العربية" : "Arabic"}
            active={language === "AR"}
            onPress={() => setLanguage("AR")}
            colors={colors}
          />
          <OptionChip
            label={isArabic ? "الإنجليزية" : "English"}
            active={language === "EN"}
            onPress={() => setLanguage("EN")}
            colors={colors}
          />
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textPrimary, textAlign }]}>{labels.tone}</Text>
        <View style={styles.chipsRow}>
          <OptionChip
            label={isArabic ? "تحفيزي" : "Motivational"}
            active={tone === "MOTIVATIONAL"}
            onPress={() => setTone("MOTIVATIONAL")}
            colors={colors}
          />
          <OptionChip
            label={isArabic ? "متوازن" : "Balanced"}
            active={tone === "BALANCED"}
            onPress={() => setTone("BALANCED")}
            colors={colors}
          />
          <OptionChip
            label={isArabic ? "صارم" : "Strict"}
            active={tone === "STRICT"}
            onPress={() => setTone("STRICT")}
            colors={colors}
          />
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textPrimary, textAlign }]}>{labels.features}</Text>
        <FeatureToggle
          label={labels.includeDailyQuestions}
          value={includeDailyQuestions}
          onValueChange={setIncludeDailyQuestions}
          colors={colors}
        />
        <FeatureToggle
          label={labels.includeTiming}
          value={includeTiming}
          onValueChange={setIncludeTiming}
          colors={colors}
        />
        <FeatureToggle
          label={labels.includeTopTasks}
          value={includeTopTasks}
          onValueChange={setIncludeTopTasks}
          colors={colors}
        />
        <FeatureToggle
          label={labels.includeStreaks}
          value={includeStreaks}
          onValueChange={setIncludeStreaks}
          colors={colors}
        />

        <AppButton
          label={loading ? labels.generating : labels.generate}
          onPress={() => void generateReport()}
          disabled={loading}
        />
      </AppCard>

      {error ? <Text style={[styles.error, { color: colors.danger, textAlign }]}>{error}</Text> : null}
      {loading ? <LoadingBlock /> : null}

      {!loading && !report ? (
        <EmptyState title={labels.noReportTitle} subtitle={labels.noReportSubtitle} />
      ) : null}

      {report ? (
        <>
          <AppCard>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary, textAlign }]}>
              {report.report.title}
            </Text>
            <Text style={[styles.paragraph, { color: colors.textSecondary, textAlign }]}>
              {report.report.summary}
            </Text>
            <Text style={[styles.meta, { color: colors.textSecondary, textAlign }]}>
              {labels.aiSource}: {report.report.usedAi ? labels.aiUsed : labels.aiFallback}
            </Text>
          </AppCard>

          <AppCard>
            <View style={styles.metricsRow}>
              <View style={[styles.metricCard, { borderColor: colors.border }]}>
                <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
                  {report.analytics.totals.activeDays}
                </Text>
                <Text style={[styles.meta, { color: colors.textSecondary }]}>{labels.metrics.activeDays}</Text>
              </View>
              <View style={[styles.metricCard, { borderColor: colors.border }]}>
                <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
                  {report.analytics.totals.totalPoints}
                </Text>
                <Text style={[styles.meta, { color: colors.textSecondary }]}>{labels.metrics.totalPoints}</Text>
              </View>
            </View>
            <View style={styles.metricsRow}>
              <View style={[styles.metricCard, { borderColor: colors.border }]}>
                <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
                  {report.analytics.totals.totalActivities}
                </Text>
                <Text style={[styles.meta, { color: colors.textSecondary }]}>{labels.metrics.totalActivities}</Text>
              </View>
              <View style={[styles.metricCard, { borderColor: colors.border }]}>
                <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
                  {report.analytics.totals.averagePointsPerActiveDay}
                </Text>
                <Text style={[styles.meta, { color: colors.textSecondary }]}>{labels.metrics.avgPoints}</Text>
              </View>
            </View>
          </AppCard>

          <AppCard>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary, textAlign }]}>{labels.highlights}</Text>
            {report.report.highlights.map((item, index) => (
              <Text key={`${item}-${index}`} style={[styles.listItem, { color: colors.textSecondary, textAlign }]}>
                • {item}
              </Text>
            ))}
          </AppCard>

          {(focusMode === "COMPARISON" || focusMode === "BOTH") && report.report.comparison ? (
            <AppCard>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary, textAlign }]}>
                {labels.comparison}
              </Text>
              <Text style={[styles.paragraph, { color: colors.textSecondary, textAlign }]}>
                {report.report.comparison}
              </Text>
            </AppCard>
          ) : null}

          <AppCard>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary, textAlign }]}>
              {labels.actionPlan}
            </Text>
            {report.report.actionPlan.map((item, index) => (
              <Text key={`${item}-${index}`} style={[styles.listItem, { color: colors.textSecondary, textAlign }]}>
                {index + 1}. {item}
              </Text>
            ))}
          </AppCard>

          <AppCard>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary, textAlign }]}>
              {labels.motivation}
            </Text>
            <Text style={[styles.paragraph, { color: colors.textSecondary, textAlign }]}>
              {report.report.motivation}
            </Text>
          </AppCard>
        </>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
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
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  toggleRow: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  error: {
    fontSize: 13,
    fontWeight: "700",
  },
  paragraph: {
    fontSize: 13,
    lineHeight: 20,
  },
  listItem: {
    fontSize: 13,
    lineHeight: 20,
  },
  meta: {
    fontSize: 12,
  },
  metricsRow: {
    flexDirection: "row",
    gap: 8,
  },
  metricCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    gap: 2,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: "800",
  },
});
