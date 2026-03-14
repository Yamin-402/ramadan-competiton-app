import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { dailyQuestionsApi } from "../../../api/endpoints/daily-questions.api";
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
import { DailyQuestion, DailyQuestionHistoryItem } from "../../../types/domain";
import { escapeHtml, exportPdfFromHtml, loadArabicFontBase64 } from "../../../utils/pdf-export";
import { formatPoints } from "../../../utils/format";
import { normalizeQuestionOptions } from "../../../utils/question";
import { getRamadanDayNumber } from "../../../utils/ramadan";

interface DayHistoryGroup {
  key: string;
  ramadanDay: number;
  items: DailyQuestionHistoryItem[];
}

function isTodayAnswered(
  todayQuestion: DailyQuestion | null,
  history: DailyQuestionHistoryItem[]
): DailyQuestionHistoryItem | null {
  if (!todayQuestion) {
    return null;
  }

  const found = history.find((item) => item.question.id === todayQuestion.id);
  if (!found || !found.didAnswer) {
    return null;
  }
  return found;
}

function getHistoryStatusLabel(item: DailyQuestionHistoryItem, t: ReturnType<typeof useI18n>["t"]) {
  if (item.status === "pending") {
    return t("daily.pendingUntilFajr");
  }

  if (item.isCorrect === true) {
    return t("daily.correct");
  }

  if (item.isCorrect === false) {
    return t("daily.wrong");
  }

  return t("daily.revealed");
}

function getRamadanDayByActiveDate(activeDate: string) {
  const normalized = activeDate.includes("T") ? activeDate : `${activeDate}T12:00:00.000Z`;
  return getRamadanDayNumber(new Date(normalized));
}

function unwrapAnswerValue(answer: unknown): unknown {
  if (answer && typeof answer === "object" && !Array.isArray(answer)) {
    const value = (answer as Record<string, unknown>).value;
    if (value !== undefined) {
      return value;
    }
  }

  return answer;
}

function extractAnswerExplanation(answer: unknown): string | null {
  if (!answer || typeof answer !== "object" || Array.isArray(answer)) {
    return null;
  }

  const value = (answer as Record<string, unknown>).explanation;
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function formatAnswerForDisplay(answer: unknown, t: ReturnType<typeof useI18n>["t"]): string {
  const normalized = unwrapAnswerValue(answer);
  if (normalized === null || normalized === undefined) {
    return "-";
  }
  if (typeof normalized === "boolean") {
    return normalized ? t("common.yes") : t("common.no");
  }
  if (Array.isArray(normalized)) {
    return normalized.map((item) => String(item)).join(" | ");
  }
  if (typeof normalized === "object") {
    return JSON.stringify(normalized);
  }
  return String(normalized);
}

function buildDailyPdfStyles(direction: "rtl" | "ltr", fontBase64: string | null) {
  return `
  <style>
    ${fontBase64 ? `
    @font-face {
      font-family: "NotoNaskhEmbedded";
      src: url("data:font/ttf;base64,${fontBase64}") format("truetype");
      font-weight: normal;
      font-style: normal;
    }` : `
    @import url("https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;700&display=swap");
    `}
    body {
      font-family: ${fontBase64 ? '"NotoNaskhEmbedded"' : '"Noto Naskh Arabic"'}, "Noto Sans Arabic", "Amiri", "Arial Unicode MS", -apple-system, BlinkMacSystemFont, "Segoe UI", Tahoma, Arial, sans-serif;
      direction: ${direction};
      unicode-bidi: plaintext;
      margin: 24px;
      color: #16181d;
      background: #ffffff;
      line-height: 1.4;
    }
    h1 { margin: 0 0 6px; font-size: 22px; }
    h2 { margin: 20px 0 8px; font-size: 16px; color: #2d2f38; }
    .subtitle { color: #5b6070; margin-bottom: 14px; font-size: 12px; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      margin-bottom: 12px;
      font-size: 11px;
    }
    thead th {
      background: #f3f6fc;
      border: 1px solid #d6deea;
      padding: 6px;
    }
    tbody td {
      border: 1px solid #d6deea;
      padding: 6px;
      vertical-align: top;
    }
  </style>
`;
}

export function DailyQuestionsScreen() {
  const { colors } = useAppTheme();
  const { t, isArabic } = useI18n();
  const tasksDesignVariant = useSettingsStore((state) => state.tasksDesignVariant);
  const textAlign = isArabic ? "right" : "left";
  const isRamadanVariant =
    tasksDesignVariant === "ramadan_modern" || tasksDesignVariant === "ramadan_nights";
  const isNightVariant = tasksDesignVariant === "ramadan_nights";
  const isModernVariant = tasksDesignVariant === "modern";

  const [todayQuestion, setTodayQuestion] = useState<DailyQuestion | null>(null);
  const [history, setHistory] = useState<DailyQuestionHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedHistoryByDay, setExpandedHistoryByDay] = useState<Record<string, boolean>>({});

  const [textAnswer, setTextAnswer] = useState("");
  const [singleChoice, setSingleChoice] = useState("");
  const [multipleChoices, setMultipleChoices] = useState<string[]>([]);
  const [boolChoice, setBoolChoice] = useState<boolean | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [today, historyRows] = await Promise.all([
        dailyQuestionsApi.getToday(),
        dailyQuestionsApi.listHistory(100),
      ]);

      setTodayQuestion(today);
      setHistory(historyRows);
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not load daily questions"));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData])
  );

  const todayHistoryEntry = useMemo(
    () => (todayQuestion ? history.find((item) => item.question.id === todayQuestion.id) || null : null),
    [todayQuestion, history]
  );
  const todayAnswer = useMemo(() => isTodayAnswered(todayQuestion, history), [todayQuestion, history]);
  const todayState = useMemo(() => {
    if (!todayQuestion) {
      return "pending";
    }
    if (!todayHistoryEntry || !todayHistoryEntry.didAnswer) {
      return "pending";
    }
    if (todayHistoryEntry.status === "pending") {
      return "answered";
    }
    return "revealed";
  }, [todayHistoryEntry, todayQuestion]);
  const todayStateLabel = useMemo(() => {
    if (todayState === "answered") {
      return t("daily.pendingUntilFajr");
    }
    if (todayState === "revealed") {
      return t("daily.revealed");
    }
    return t("daily.pending");
  }, [t, todayState]);
  const todayOptions = useMemo(
    () => normalizeQuestionOptions(todayQuestion?.options),
    [todayQuestion?.options]
  );
  const groupedHistory = useMemo<DayHistoryGroup[]>(() => {
    const map = new Map<string, DayHistoryGroup>();

    const sorted = [...history].sort((a, b) => {
      if (a.question.activeDate !== b.question.activeDate) {
        return b.question.activeDate.localeCompare(a.question.activeDate);
      }
      return b.id - a.id;
    });

    for (const item of sorted) {
      const ramadanDay = getRamadanDayByActiveDate(item.question.activeDate);
      const key = item.question.activeDate;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          key,
          ramadanDay,
          items: [item],
        });
      } else {
        existing.items.push(item);
      }
    }

    return Array.from(map.values()).sort((a, b) => b.key.localeCompare(a.key));
  }, [history]);

  useEffect(() => {
    if (groupedHistory.length === 0) {
      setExpandedHistoryByDay({});
      return;
    }

    const firstKey = groupedHistory[0]?.key;
    if (!firstKey) {
      return;
    }
    setExpandedHistoryByDay((prev) => {
      if (Object.keys(prev).length > 0) {
        return prev;
      }
      return { [firstKey]: true };
    });
  }, [groupedHistory]);

  const clearInputState = () => {
    setTextAnswer("");
    setSingleChoice("");
    setMultipleChoices([]);
    setBoolChoice(null);
  };

  const buildAnswerPayload = (): unknown => {
    if (!todayQuestion) {
      return null;
    }

    if (todayQuestion.answerType === "TEXT") {
      return textAnswer.trim();
    }
    if (todayQuestion.answerType === "SINGLE_CHOICE") {
      return singleChoice;
    }
    if (todayQuestion.answerType === "MULTIPLE_CHOICE") {
      return multipleChoices;
    }
    return boolChoice;
  };

  const submitTodayAnswer = async () => {
    if (!todayQuestion || todayAnswer) {
      return;
    }

    if (todayQuestion.answerType === "TEXT" && !textAnswer.trim()) {
      setError(t("daily.answerRequired"));
      return;
    }
    if (todayQuestion.answerType === "SINGLE_CHOICE" && !singleChoice) {
      setError(t("daily.chooseOne"));
      return;
    }
    if (todayQuestion.answerType === "MULTIPLE_CHOICE" && multipleChoices.length === 0) {
      setError(t("daily.chooseAtLeastOne"));
      return;
    }
    if (todayQuestion.answerType === "BOOLEAN" && boolChoice === null) {
      setError(t("daily.chooseYesNo"));
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const answer = buildAnswerPayload();
      await dailyQuestionsApi.submitAnswer(todayQuestion.id, { answer });
      clearInputState();
      await loadData();
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not submit answer"));
    } finally {
      setSubmitting(false);
    }
  };

  const toggleMultipleChoice = (value: string) => {
    setMultipleChoices((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]
    );
  };

  const toggleHistoryDay = (key: string) => {
    setExpandedHistoryByDay((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleExportHistory = async (language: "ar" | "en") => {
    setExporting(true);
    setError(null);
    try {
      const isAr = language === "ar";
      const fontBase64 = isAr ? await loadArabicFontBase64() : null;
      const labels = isAr
        ? {
            title: "سجل الأسئلة اليومية",
            generatedAt: "تاريخ التصدير",
            dayPrefix: "اليوم",
            daySuffix: "من رمضان",
            question: "السؤال",
            status: "الحالة",
            yourAnswer: "إجابتك",
            correctAnswer: "الإجابة الصحيحة",
            explanation: "التفسير",
            points: "النقاط",
            notAnswered: "لم يتم الإجابة",
            revealLater: "يظهر بعد الفجر",
          }
        : {
            title: "Daily Questions History",
            generatedAt: "Export date",
            dayPrefix: "Day",
            daySuffix: "of Ramadan",
            question: "Question",
            status: "Status",
            yourAnswer: "Your answer",
            correctAnswer: "Correct answer",
            explanation: "Explanation",
            points: "Points",
            notAnswered: "Not answered",
            revealLater: "Reveals after Fajr",
          };

      const sectionsHtml = groupedHistory
        .map((group) => {
          const dayLabel = `${labels.dayPrefix} ${group.ramadanDay} ${labels.daySuffix}`;
          const rowsHtml = group.items
            .map((item) => {
              const statusLabel = getHistoryStatusLabel(item, t);
              const yourAnswer = item.didAnswer
                ? formatAnswerForDisplay(item.answer, t)
                : labels.notAnswered;
              const correctAnswer =
                item.status === "revealed"
                  ? formatAnswerForDisplay(item.questionCorrectAnswer, t)
                  : labels.revealLater;
              const explanation =
                item.status === "revealed"
                  ? extractAnswerExplanation(item.questionCorrectAnswer) || "-"
                  : labels.revealLater;

              return `
                <tr>
                  <td>${escapeHtml(item.question.questionText)}</td>
                  <td>${escapeHtml(statusLabel)}</td>
                  <td>${escapeHtml(yourAnswer)}</td>
                  <td>${escapeHtml(correctAnswer)}</td>
                  <td>${escapeHtml(explanation)}</td>
                  <td>${escapeHtml(formatPoints(item.question.points))}</td>
                </tr>
              `;
            })
            .join("");

          return `
            <section>
              <h2>${escapeHtml(dayLabel)}</h2>
              <table>
                <thead>
                  <tr>
                    <th>${escapeHtml(labels.question)}</th>
                    <th>${escapeHtml(labels.status)}</th>
                    <th>${escapeHtml(labels.yourAnswer)}</th>
                    <th>${escapeHtml(labels.correctAnswer)}</th>
                    <th>${escapeHtml(labels.explanation)}</th>
                    <th>${escapeHtml(labels.points)}</th>
                  </tr>
                </thead>
                <tbody>${rowsHtml}</tbody>
              </table>
            </section>
          `;
        })
        .join("");

      const html = `
        <html lang="${isAr ? "ar" : "en"}">
          <head>
            <meta charset="utf-8" />
            ${buildDailyPdfStyles(isAr ? "rtl" : "ltr", fontBase64)}
          </head>
          <body>
            <h1>${escapeHtml(labels.title)}</h1>
            <div class="subtitle">${escapeHtml(labels.generatedAt)}: ${escapeHtml(new Date().toLocaleString())}</div>
            ${sectionsHtml}
          </body>
        </html>
      `;

      await exportPdfFromHtml({
        fileName: `daily_questions_${language}_${new Date().toISOString().slice(0, 10)}`,
        html,
      });
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not export daily history"));
    } finally {
      setExporting(false);
    }
  };

  const renderAnswerInput = () => {
    if (!todayQuestion || todayAnswer) {
      return null;
    }

    if (todayQuestion.answerType === "TEXT") {
      return (
        <AppTextInput
          label={t("daily.yourAnswer")}
          value={textAnswer}
          onChangeText={setTextAnswer}
          placeholder={t("daily.typeAnswer")}
        />
      );
    }

    if (todayQuestion.answerType === "SINGLE_CHOICE") {
      return (
        <View style={styles.optionsList}>
          {todayOptions.map((option) => (
            <Pressable
              key={option}
              onPress={() => setSingleChoice(option)}
              style={[
                styles.optionRow,
                {
                  borderColor: colors.border,
                  backgroundColor: singleChoice === option ? colors.gold : colors.cardSoft,
                },
              ]}
            >
              <Text
                style={{
                  color: singleChoice === option ? "#1a1607" : colors.textPrimary,
                  fontWeight: "700",
                }}
              >
                {option}
              </Text>
            </Pressable>
          ))}
        </View>
      );
    }

    if (todayQuestion.answerType === "MULTIPLE_CHOICE") {
      return (
        <View style={styles.optionsList}>
          {todayOptions.map((option) => {
            const active = multipleChoices.includes(option);
            return (
              <Pressable
                key={option}
                onPress={() => toggleMultipleChoice(option)}
                style={[
                  styles.optionRow,
                  {
                    borderColor: colors.border,
                    backgroundColor: active ? colors.gold : colors.cardSoft,
                  },
                ]}
              >
                <Text
                  style={{
                    color: active ? "#1a1607" : colors.textPrimary,
                    fontWeight: "700",
                  }}
                >
                  {option}
                </Text>
              </Pressable>
            );
          })}
        </View>
      );
    }

    return (
      <View style={styles.optionsList}>
        <AppButton
          label={t("common.yes")}
          onPress={() => setBoolChoice(true)}
          variant={boolChoice === true ? "primary" : "ghost"}
        />
        <AppButton
          label={t("common.no")}
          onPress={() => setBoolChoice(false)}
          variant={boolChoice === false ? "primary" : "ghost"}
        />
      </View>
    );
  };

  return (
    <ScreenContainer>
      {isRamadanVariant ? (
        <LinearGradient
          colors={isNightVariant ? ["#120b2f", "#20124f", "#3c1f7a"] : ["#0f3e2c", "#14543b", "#b79342"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.ramadanHero}
        >
          <Text style={styles.ramadanHeroTitle}>{t("daily.title")}</Text>
          <Text style={styles.ramadanHeroSubtitle}>{t("daily.subtitle")}</Text>
        </LinearGradient>
      ) : null}

      {!isRamadanVariant ? (
        <Text style={[styles.title, { color: colors.textPrimary, textAlign }]}>{t("daily.title")}</Text>
      ) : null}

      {!isRamadanVariant ? (
        <Text style={[styles.subtitle, { color: colors.textSecondary, textAlign }]}>
          {t("daily.subtitle")}
        </Text>
      ) : null}

      {loading ? <LoadingBlock /> : null}
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

      {!loading ? (
        <>
          <AppCard
            style={
              isModernVariant
                ? { borderColor: "#d7dfec", backgroundColor: "#f8fbff" }
                : isNightVariant
                  ? { borderColor: "#5d4a8f", backgroundColor: "#1c1542" }
                : isRamadanVariant
                  ? { borderColor: "#ceb983", backgroundColor: "#fff8e7" }
                  : undefined
            }
          >
            <Text style={[styles.sectionTitle, { color: colors.textPrimary, textAlign }]}>
              {t("daily.todayQuestion")}
            </Text>
            {todayQuestion ? (
              <>
                <Text
                  style={[
                    styles.todayStatusPill,
                    {
                      color:
                        todayState === "revealed"
                          ? colors.success
                          : todayState === "answered"
                            ? colors.warning
                            : colors.textSecondary,
                      textAlign,
                    },
                  ]}
                >
                  {todayStateLabel}
                </Text>
                <View style={styles.questionHeaderRow}>
                  <Text style={[styles.questionText, { color: colors.textPrimary, textAlign, flex: 1 }]}>
                    {todayQuestion.questionText}
                  </Text>
                  <View style={[styles.pointsBadge, { backgroundColor: colors.gold }]}>
                    <Text style={styles.pointsBadgeText}>{formatPoints(todayQuestion.points)}</Text>
                  </View>
                </View>

                {todayAnswer ? (
                  <View
                    style={[
                      styles.pendingBox,
                      {
                        borderColor:
                          todayAnswer.status === "pending"
                            ? colors.warning
                            : todayAnswer.isCorrect
                              ? colors.success
                              : colors.danger,
                      },
                    ]}
                  >
                    <Text style={{ color: colors.textPrimary, fontWeight: "700" }}>
                      {todayAnswer.status === "pending"
                        ? t("daily.pendingUntilFajr")
                        : getHistoryStatusLabel(todayAnswer, t)}
                    </Text>
                    <Text style={{ color: colors.textSecondary, textAlign }}>
                      {t("daily.points")}: {formatPoints(todayAnswer.awardedPoints)}
                    </Text>
                    <Text style={{ color: colors.textSecondary, textAlign }}>
                      {t("daily.yourAnswer")}: {formatAnswerForDisplay(todayAnswer.answer, t)}
                    </Text>
                    <Text style={{ color: colors.textSecondary, textAlign }}>
                      {t("daily.correctAnswer")}:{" "}
                      {todayAnswer.status === "revealed"
                        ? formatAnswerForDisplay(todayAnswer.questionCorrectAnswer, t)
                        : t("daily.revealLater")}
                    </Text>
                    {todayAnswer.status === "revealed" &&
                    extractAnswerExplanation(todayAnswer.questionCorrectAnswer) ? (
                      <Text style={{ color: colors.textSecondary, textAlign }}>
                        {extractAnswerExplanation(todayAnswer.questionCorrectAnswer)}
                      </Text>
                    ) : null}
                  </View>
                ) : (
                  <>
                    {renderAnswerInput()}
                    <AppButton
                      label={submitting ? t("daily.submitting") : t("daily.submit")}
                      onPress={() => void submitTodayAnswer()}
                      disabled={submitting}
                    />
                  </>
                )}
              </>
            ) : (
              <EmptyState title={t("daily.noTodayTitle")} subtitle={t("daily.noTodaySubtitle")} />
            )}
          </AppCard>

          <Text style={[styles.sectionTitle, { color: colors.textPrimary, textAlign }]}>{t("daily.history")}</Text>
          <View style={styles.exportRow}>
            <AppButton
              label={
                exporting
                  ? isArabic
                    ? "جاري التصدير..."
                    : "Exporting..."
                  : isArabic
                    ? "تصدير PDF (عربي)"
                    : "Export PDF (Arabic)"
              }
              variant="ghost"
              onPress={() => void handleExportHistory("ar")}
              disabled={groupedHistory.length === 0 || exporting}
              style={styles.exportButton}
            />
            <AppButton
              label={
                exporting
                  ? isArabic
                    ? "جاري التصدير..."
                    : "Exporting..."
                  : isArabic
                    ? "تصدير PDF (إنجليزي)"
                    : "Export PDF (English)"
              }
              variant="ghost"
              onPress={() => void handleExportHistory("en")}
              disabled={groupedHistory.length === 0 || exporting}
              style={styles.exportButton}
            />
          </View>
          {groupedHistory.length === 0 ? (
            <EmptyState title={t("daily.noHistoryTitle")} subtitle={t("daily.noHistorySubtitle")} />
          ) : (
            groupedHistory.map((group) => {
              const isExpanded = expandedHistoryByDay[group.key] || false;
              return (
                <AppCard
                  key={group.key}
                  style={
                    isModernVariant
                      ? { borderColor: "#d7dfec", backgroundColor: "#f8fbff" }
                      : isNightVariant
                        ? { borderColor: "#5d4a8f", backgroundColor: "#1c1542" }
                      : isRamadanVariant
                        ? { borderColor: "#ceb983", backgroundColor: "#fff8e7" }
                        : undefined
                  }
                >
                  <Pressable style={styles.historyDayHeader} onPress={() => toggleHistoryDay(group.key)}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.dayTitle, { color: colors.textPrimary, textAlign }]}>
                        {t("daily.ramadanDay", { day: group.ramadanDay })}
                      </Text>
                      <Text style={[styles.metaText, { color: colors.textSecondary, textAlign }]}>
                        {t("daily.questionsCount", { count: group.items.length })}
                      </Text>
                    </View>
                    <Text style={[styles.expandIcon, { color: colors.gold }]}>
                      {isExpanded ? "-" : "+"}
                    </Text>
                  </Pressable>

                  {isExpanded ? (
                    <View style={styles.historyDayContent}>
                      {group.items.map((item) => (
                        <View
                          key={item.id}
                          style={[
                            styles.historyQuestionCard,
                            {
                              borderColor: colors.border,
                              backgroundColor: colors.cardSoft,
                            },
                          ]}
                        >
                          <View style={styles.questionHeaderRow}>
                            <Text style={[styles.questionText, { color: colors.textPrimary, textAlign, flex: 1 }]}>
                              {item.question.questionText}
                            </Text>
                            <View style={[styles.pointsBadge, { backgroundColor: colors.gold }]}>
                              <Text style={styles.pointsBadgeText}>{formatPoints(item.question.points)}</Text>
                            </View>
                          </View>

                          <Text
                            style={[
                              styles.status,
                              {
                                color:
                                  item.status === "pending"
                                    ? colors.warning
                                    : item.isCorrect === true
                                      ? colors.success
                                      : colors.danger,
                                textAlign,
                              },
                            ]}
                          >
                            {getHistoryStatusLabel(item, t)}
                          </Text>

                          <View style={[styles.answerBlock, { borderColor: colors.border }]}>
                            <Text style={[styles.answerLabel, { color: colors.textPrimary, textAlign }]}>
                              {t("daily.yourAnswer")}
                            </Text>
                            <Text style={[styles.metaText, { color: colors.textSecondary, textAlign }]}>
                              {item.didAnswer
                                ? formatAnswerForDisplay(item.answer, t)
                                : t("daily.notAnswered")}
                            </Text>
                          </View>

                          <View style={[styles.answerBlock, { borderColor: colors.border }]}>
                            <Text style={[styles.answerLabel, { color: colors.textPrimary, textAlign }]}>
                              {t("daily.correctAnswer")}
                            </Text>
                            <Text style={[styles.metaText, { color: colors.textSecondary, textAlign }]}>
                              {item.status === "revealed"
                                ? formatAnswerForDisplay(item.questionCorrectAnswer, t)
                                : t("daily.revealLater")}
                            </Text>
                            {item.status === "revealed" &&
                            extractAnswerExplanation(item.questionCorrectAnswer) ? (
                              <Text style={[styles.metaText, { color: colors.textSecondary, textAlign }]}>
                                {extractAnswerExplanation(item.questionCorrectAnswer)}
                              </Text>
                            ) : null}
                          </View>

                          <Text style={[styles.metaText, { color: colors.textSecondary, textAlign }]}>
                            {t("daily.awarded")}: {formatPoints(item.awardedPoints)} {t("daily.points")}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </AppCard>
              );
            })
          )}
        </>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  ramadanHero: {
    borderRadius: 22,
    padding: 16,
    gap: 6,
  },
  ramadanHeroTitle: {
    color: "#fff7de",
    fontSize: 22,
    fontWeight: "900",
  },
  ramadanHeroSubtitle: {
    color: "#ece1c3",
    fontSize: 13,
    lineHeight: 18,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
  },
  questionHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  questionText: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "600",
  },
  pointsBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: "flex-start",
  },
  pointsBadgeText: {
    color: "#1a1607",
    fontSize: 12,
    fontWeight: "900",
  },
  historyDayHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dayTitle: {
    fontSize: 15,
    fontWeight: "800",
  },
  expandIcon: {
    fontSize: 26,
    lineHeight: 26,
    fontWeight: "700",
  },
  historyDayContent: {
    gap: 8,
  },
  historyQuestionCard: {
    borderWidth: 1,
    borderRadius: 11,
    padding: 10,
    gap: 5,
  },
  answerBlock: {
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 9,
    paddingVertical: 7,
    gap: 3,
  },
  answerLabel: {
    fontSize: 12,
    fontWeight: "800",
  },
  metaText: {
    fontSize: 12,
  },
  status: {
    fontSize: 13,
    fontWeight: "700",
  },
  todayStatusPill: {
    fontSize: 12,
    fontWeight: "800",
  },
  pendingBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    gap: 4,
  },
  optionsList: {
    gap: 8,
  },
  exportRow: {
    flexDirection: "row",
    gap: 8,
  },
  exportButton: {
    flex: 1,
  },
  optionRow: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  error: {
    fontSize: 13,
    fontWeight: "700",
  },
});
