import { FormEvent, useEffect, useMemo, useState } from "react";
import { adminApi } from "../api/admin-api";
import { toApiErrorMessage } from "../api/http";
import { PanelCard } from "../components/PanelCard";
import { AdminDailyQuestionAnswer, DailyQuestionListItem, DailyQuestionType } from "../types";

const answerTypes: DailyQuestionType[] = ["TEXT", "SINGLE_CHOICE", "MULTIPLE_CHOICE", "BOOLEAN"];

function toDateKey(value: string): string {
  return new Date(value).toISOString().slice(0, 10);
}

function getHijriPreview(dateValue: string): string {
  if (!dateValue) {
    return "";
  }

  try {
    const date = new Date(`${dateValue}T00:00:00`);
    return new Intl.DateTimeFormat("ar-SA-u-ca-islamic", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
  } catch {
    return "";
  }
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => String(item));
}

function formatAnswer(answer: unknown): string {
  if (answer && typeof answer === "object" && !Array.isArray(answer)) {
    const objectValue = answer as Record<string, unknown>;
    if (Object.prototype.hasOwnProperty.call(objectValue, "value")) {
      const valuePart = formatAnswer(objectValue.value);
      const explanationPart =
        typeof objectValue.explanation === "string" && objectValue.explanation.trim().length > 0
          ? ` (${objectValue.explanation.trim()})`
          : "";
      return `${valuePart}${explanationPart}`;
    }
  }

  if (answer === null || answer === undefined) {
    return "-";
  }
  if (typeof answer === "string" || typeof answer === "number" || typeof answer === "boolean") {
    return String(answer);
  }
  return JSON.stringify(answer);
}

export function DailyQuestionsModule() {
  const [questionText, setQuestionText] = useState("");
  const [answerType, setAnswerType] = useState<DailyQuestionType>("TEXT");
  const [textReferenceAnswer, setTextReferenceAnswer] = useState("");
  const [choices, setChoices] = useState<string[]>(["", ""]);
  const [singleCorrectIndex, setSingleCorrectIndex] = useState(0);
  const [multipleCorrectIndexes, setMultipleCorrectIndexes] = useState<number[]>([]);
  const [booleanCorrect, setBooleanCorrect] = useState<"true" | "false">("true");
  const [answerExplanation, setAnswerExplanation] = useState("");
  const [points, setPoints] = useState("0");
  const [activeDate, setActiveDate] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null);

  const [rows, setRows] = useState<DailyQuestionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [deletingQuestionId, setDeletingQuestionId] = useState<number | null>(null);

  const [selectedQuestion, setSelectedQuestion] = useState<DailyQuestionListItem | null>(null);
  const [answerRows, setAnswerRows] = useState<AdminDailyQuestionAnswer[]>([]);
  const [loadingAnswers, setLoadingAnswers] = useState(false);
  const [reviewingAnswerId, setReviewingAnswerId] = useState<number | null>(null);
  const [manualAwardedPointsByAnswer, setManualAwardedPointsByAnswer] = useState<Record<number, string>>({});

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const hijriPreview = useMemo(() => getHijriPreview(activeDate), [activeDate]);

  const resetForm = () => {
    setQuestionText("");
    setAnswerType("TEXT");
    setTextReferenceAnswer("");
    setChoices(["", ""]);
    setSingleCorrectIndex(0);
    setMultipleCorrectIndexes([]);
    setBooleanCorrect("true");
    setAnswerExplanation("");
    setPoints("0");
    setActiveDate("");
    setIsActive(true);
    setEditingQuestionId(null);
  };

  const loadRows = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.listDailyQuestions(100);
      setRows(data);
    } catch (err) {
      setError(toApiErrorMessage(err, "Could not load daily questions"));
    } finally {
      setLoading(false);
    }
  };

  const loadAnswers = async (questionId: number) => {
    setLoadingAnswers(true);
    setError(null);
    try {
      const data = await adminApi.listDailyQuestionAnswers(questionId, 300);
      setAnswerRows(data);
    } catch (err) {
      setError(toApiErrorMessage(err, "Could not load answers"));
    } finally {
      setLoadingAnswers(false);
    }
  };

  useEffect(() => {
    void loadRows();
  }, []);

  const applyEditQuestion = (question: DailyQuestionListItem) => {
    setEditingQuestionId(question.id);
    setQuestionText(question.questionText);
    setAnswerType(question.answerType);
    setPoints(String(question.points));
    setActiveDate(toDateKey(question.activeDate));
    setIsActive(question.isActive);

    const correctAnswerObject =
      question.correctAnswer && typeof question.correctAnswer === "object" && !Array.isArray(question.correctAnswer)
        ? (question.correctAnswer as Record<string, unknown>)
        : null;
    const storedCorrectValue =
      correctAnswerObject && Object.prototype.hasOwnProperty.call(correctAnswerObject, "value")
        ? correctAnswerObject.value
        : question.correctAnswer;
    const storedExplanation =
      correctAnswerObject && typeof correctAnswerObject.explanation === "string"
        ? correctAnswerObject.explanation.trim()
        : "";
    setAnswerExplanation(storedExplanation);

    if (question.answerType === "TEXT") {
      setTextReferenceAnswer(
        storedCorrectValue === null || storedCorrectValue === undefined
          ? ""
          : String(storedCorrectValue)
      );
      setChoices(["", ""]);
      setSingleCorrectIndex(0);
      setMultipleCorrectIndexes([]);
      return;
    }

    if (question.answerType === "BOOLEAN") {
      setBooleanCorrect(storedCorrectValue === false ? "false" : "true");
      setChoices(["True", "False"]);
      setSingleCorrectIndex(0);
      setMultipleCorrectIndexes([]);
      return;
    }

    const options = toStringArray(question.options);
    const normalizedOptions = options.length >= 2 ? options : ["", ""];
    setChoices(normalizedOptions);

    if (question.answerType === "SINGLE_CHOICE") {
      const answerValue = String(storedCorrectValue ?? "");
      const selectedIndex = normalizedOptions.findIndex((option) => option === answerValue);
      setSingleCorrectIndex(selectedIndex >= 0 ? selectedIndex : 0);
      setMultipleCorrectIndexes([]);
      return;
    }

    const answerValues = new Set(toStringArray(storedCorrectValue));
    setMultipleCorrectIndexes(
      normalizedOptions
        .map((option, index) => (answerValues.has(option) ? index : -1))
        .filter((index) => index >= 0)
    );
    setSingleCorrectIndex(0);
  };

  const onChoiceChange = (index: number, value: string) => {
    setChoices((prev) => prev.map((choice, choiceIndex) => (choiceIndex === index ? value : choice)));
  };

  const addChoice = () => {
    setChoices((prev) => [...prev, ""]);
  };

  const removeChoice = (index: number) => {
    setChoices((prev) => prev.filter((_, choiceIndex) => choiceIndex !== index));
    setMultipleCorrectIndexes((prev) =>
      prev
        .filter((choiceIndex) => choiceIndex !== index)
        .map((choiceIndex) => (choiceIndex > index ? choiceIndex - 1 : choiceIndex))
    );
    if (singleCorrectIndex >= index && singleCorrectIndex > 0) {
      setSingleCorrectIndex((prev) => prev - 1);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      const parsedPoints = Number(points);
      if (Number.isNaN(parsedPoints)) {
        throw new Error("Points must be numeric.");
      }
      if (!activeDate.trim()) {
        throw new Error("Active date is required.");
      }

      const sameDateQuestion = rows.find(
        (row) => toDateKey(row.activeDate) === activeDate.trim() && row.id !== editingQuestionId
      );
      if (sameDateQuestion) {
        throw new Error("Only one question is allowed per day.");
      }

      const payload: {
        questionText: string;
        answerType: DailyQuestionType;
        options?: unknown;
        correctAnswer?: unknown;
        answerExplanation?: string;
        points: number;
        activeDate: string;
        isActive: boolean;
      } = {
        questionText: questionText.trim(),
        answerType,
        points: parsedPoints,
        activeDate: activeDate.trim(),
        isActive,
      };

      if (answerType === "TEXT") {
        payload.correctAnswer = textReferenceAnswer.trim() || undefined;
      } else if (answerType === "BOOLEAN") {
        payload.options = ["True", "False"];
        payload.correctAnswer = booleanCorrect === "true";
      } else {
        const cleanedChoices = choices.map((choice) => choice.trim());
        if (cleanedChoices.length < 2 || cleanedChoices.some((choice) => !choice)) {
          throw new Error("Please provide at least 2 non-empty choices.");
        }

        payload.options = cleanedChoices;
        if (answerType === "SINGLE_CHOICE") {
          payload.correctAnswer = cleanedChoices[singleCorrectIndex];
        } else {
          if (multipleCorrectIndexes.length === 0) {
            throw new Error("Select at least one correct choice.");
          }
          payload.correctAnswer = multipleCorrectIndexes.map((index) => cleanedChoices[index]);
        }
      }

      if (answerExplanation.trim()) {
        payload.answerExplanation = answerExplanation.trim();
      }

      if (editingQuestionId) {
        await adminApi.updateDailyQuestion(editingQuestionId, payload);
        setSuccess("Daily question updated.");
      } else {
        await adminApi.createDailyQuestion(payload);
        setSuccess("Daily question created.");
      }

      resetForm();
      await loadRows();
    } catch (err) {
      setError(toApiErrorMessage(err, "Could not save daily question"));
    } finally {
      setSubmitting(false);
    }
  };

  const deleteQuestion = async (question: DailyQuestionListItem) => {
    if (!window.confirm(`Delete question #${question.id}?`)) {
      return;
    }

    setError(null);
    setSuccess(null);
    setDeletingQuestionId(question.id);
    try {
      await adminApi.deleteDailyQuestion(question.id);
      setSuccess("Daily question deleted.");
      if (editingQuestionId === question.id) {
        resetForm();
      }
      if (selectedQuestion?.id === question.id) {
        setSelectedQuestion(null);
        setAnswerRows([]);
      }
      await loadRows();
    } catch (err) {
      setError(toApiErrorMessage(err, "Could not delete daily question"));
    } finally {
      setDeletingQuestionId(null);
    }
  };

  const revealToday = async () => {
    setError(null);
    setSuccess(null);
    setRevealing(true);
    try {
      const result = await adminApi.revealDailyQuestions();
      setSuccess(`Revealed ${result.revealedCount} answers for question #${result.questionId}.`);
      await loadRows();
      if (selectedQuestion?.id === result.questionId) {
        await loadAnswers(result.questionId);
      }
    } catch (err) {
      setError(toApiErrorMessage(err, "Could not reveal today's question"));
    } finally {
      setRevealing(false);
    }
  };

  const openAnswers = async (question: DailyQuestionListItem) => {
    setSelectedQuestion(question);
    await loadAnswers(question.id);
  };

  const reviewTextAnswer = async (answer: AdminDailyQuestionAnswer, isCorrect: boolean) => {
    setError(null);
    setSuccess(null);
    setReviewingAnswerId(answer.id);
    try {
      const manualValue = manualAwardedPointsByAnswer[answer.id];
      const payload: { isCorrect: boolean; awardedPoints?: number } = { isCorrect };
      if (manualValue && manualValue.trim() !== "") {
        const parsed = Number(manualValue);
        if (Number.isNaN(parsed) || parsed < 0) {
          throw new Error("Manual awarded points must be a non-negative number.");
        }
        payload.awardedPoints = parsed;
      }

      await adminApi.reviewDailyQuestionAnswer(answer.id, payload);
      setSuccess(`Reviewed answer #${answer.id}.`);
      if (selectedQuestion) {
        await loadAnswers(selectedQuestion.id);
      }
    } catch (err) {
      setError(toApiErrorMessage(err, "Could not review answer"));
    } finally {
      setReviewingAnswerId(null);
    }
  };

  return (
    <div className="stack">
      <PanelCard
        title={editingQuestionId ? `Edit Daily Question #${editingQuestionId}` : "Daily Questions"}
        actions={
          <button onClick={() => void revealToday()} disabled={revealing}>
            {revealing ? "Revealing..." : "Reveal current day"}
          </button>
        }
      >
        <form className="form-grid" onSubmit={submit}>
          <label className="form-grid__full">
            Question text
            <textarea
              rows={2}
              value={questionText}
              onChange={(event) => setQuestionText(event.target.value)}
              required
            />
          </label>

          <label>
            Answer type
            <select value={answerType} onChange={(event) => setAnswerType(event.target.value as DailyQuestionType)}>
              {answerTypes.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label>
            Active date
            <input
              type="date"
              lang="ar-SA-u-ca-islamic"
              value={activeDate}
              onChange={(event) => setActiveDate(event.target.value)}
              required
            />
            {hijriPreview ? <small className="muted-text">Hijri: {hijriPreview}</small> : null}
          </label>

          <label>
            Points
            <input
              value={points}
              onChange={(event) => setPoints(event.target.value)}
              type="number"
              step="0.01"
            />
          </label>

          <label className="checkbox-label">
            <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
            Active
          </label>

          <label className="form-grid__full">
            Answer explanation (shown after reveal)
            <textarea
              rows={2}
              value={answerExplanation}
              onChange={(event) => setAnswerExplanation(event.target.value)}
              placeholder="Optional explanation for participants"
            />
          </label>

          {answerType === "TEXT" ? (
            <label className="form-grid__full">
              Reference answer (shown after reveal)
              <textarea
                rows={2}
                value={textReferenceAnswer}
                onChange={(event) => setTextReferenceAnswer(event.target.value)}
                placeholder="Optional"
              />
            </label>
          ) : null}

          {answerType === "BOOLEAN" ? (
            <label className="form-grid__full">
              Correct answer
              <select value={booleanCorrect} onChange={(event) => setBooleanCorrect(event.target.value as "true" | "false")}>
                <option value="true">True</option>
                <option value="false">False</option>
              </select>
            </label>
          ) : null}

          {answerType === "SINGLE_CHOICE" || answerType === "MULTIPLE_CHOICE" ? (
            <fieldset className="form-grid__full">
              <legend>Choices</legend>
              {choices.map((choice, index) => (
                <div key={`choice-${index}`} className="inline-form">
                  <input
                    value={choice}
                    onChange={(event) => onChoiceChange(index, event.target.value)}
                    placeholder={`Choice ${index + 1}`}
                  />
                  {answerType === "SINGLE_CHOICE" ? (
                    <label className="checkbox-label">
                      <input
                        type="radio"
                        checked={singleCorrectIndex === index}
                        onChange={() => setSingleCorrectIndex(index)}
                      />
                      Correct
                    </label>
                  ) : (
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={multipleCorrectIndexes.includes(index)}
                        onChange={(event) => {
                          if (event.target.checked) {
                            setMultipleCorrectIndexes((prev) => [...prev, index]);
                          } else {
                            setMultipleCorrectIndexes((prev) => prev.filter((value) => value !== index));
                          }
                        }}
                      />
                      Correct
                    </label>
                  )}
                  <button type="button" onClick={() => removeChoice(index)} disabled={choices.length <= 2}>
                    Remove
                  </button>
                </div>
              ))}
              <button type="button" onClick={addChoice}>
                Add choice
              </button>
            </fieldset>
          ) : null}

          {error ? <p className="error-text form-grid__full">{error}</p> : null}
          {success ? <p className="success-text form-grid__full">{success}</p> : null}

          <div className="form-grid__full inline-form">
            <button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : editingQuestionId ? "Save changes" : "Create question"}
            </button>
            {editingQuestionId ? (
              <button type="button" onClick={resetForm}>
                Cancel edit
              </button>
            ) : null}
          </div>
        </form>
      </PanelCard>

      <PanelCard title="History" actions={<button onClick={() => void loadRows()}>Refresh</button>}>
        {loading ? <p className="muted-text">Loading questions...</p> : null}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Date</th>
                <th>Question</th>
                <th>Type</th>
                <th>Points</th>
                <th>Answers</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  <td>{toDateKey(row.activeDate)}</td>
                  <td>{row.questionText}</td>
                  <td>{row.answerType}</td>
                  <td>{String(row.points)}</td>
                  <td>{row._count.answers}</td>
                  <td>{row.isActive ? "Active" : "Inactive"}</td>
                  <td>
                    <div className="inline-form">
                      <button type="button" onClick={() => applyEditQuestion(row)}>
                        Edit
                      </button>
                      <button type="button" onClick={() => void openAnswers(row)}>
                        Answers
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteQuestion(row)}
                        disabled={deletingQuestionId === row.id}
                      >
                        {deletingQuestionId === row.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PanelCard>

      {selectedQuestion ? (
        <PanelCard title={`Question #${selectedQuestion.id} Answers`} actions={<button onClick={() => setSelectedQuestion(null)}>Close</button>}>
          {loadingAnswers ? <p className="muted-text">Loading answers...</p> : null}
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>User</th>
                  <th>Answer</th>
                  <th>Correct</th>
                  <th>Awarded</th>
                  <th>Revealed</th>
                  <th>Created At</th>
                  <th>Review</th>
                </tr>
              </thead>
              <tbody>
                {answerRows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.id}</td>
                    <td>{row.user.displayName || row.user.email}</td>
                    <td>{formatAnswer(row.answer)}</td>
                    <td>{row.isCorrect === null ? "Pending" : row.isCorrect ? "Correct" : "Wrong"}</td>
                    <td>{String(row.awardedPoints)}</td>
                    <td>{row.isRevealed ? "Yes" : "No"}</td>
                    <td>{new Date(row.createdAt).toLocaleString()}</td>
                    <td>
                      {selectedQuestion.answerType === "TEXT" ? (
                        <div className="inline-form">
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Points"
                            value={manualAwardedPointsByAnswer[row.id] || ""}
                            onChange={(event) =>
                              setManualAwardedPointsByAnswer((prev) => ({
                                ...prev,
                                [row.id]: event.target.value,
                              }))
                            }
                          />
                          <button
                            type="button"
                            disabled={reviewingAnswerId === row.id}
                            onClick={() => void reviewTextAnswer(row, true)}
                          >
                            Correct
                          </button>
                          <button
                            type="button"
                            disabled={reviewingAnswerId === row.id}
                            onClick={() => void reviewTextAnswer(row, false)}
                          >
                            Wrong
                          </button>
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PanelCard>
      ) : null}
    </div>
  );
}
