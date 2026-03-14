const DATASET_SERVER_ROWS_URL = "https://datasets-server.huggingface.co/rows";
const DATASET_SERVER_SIZE_URL = "https://datasets-server.huggingface.co/size";

const DATASET_PROFILE = {
  dataset: "abdulmunimjemal/IslamQA-Multilingual-Dataset",
  config: "default",
  splits: ["train"],
};

const ARABIC_CHARS_REGEX = /[\u0600-\u06FF]/g;
const HTML_TAG_REGEX = /<[^>]*>/g;
const WHITESPACE_REGEX = /\s+/g;
const LEADING_ANSWER_PREFIX_REGEX =
  /^(?:\u0627\u0644\u062c\u0648\u0627\u0628|\u0627\u0644\u0625\u062c\u0627\u0628\u0629|\u0627\u0644\u0627\u062c\u0627\u0628\u0629)\s*[:\-]\s*/i;
const LEADING_PRAISE_PREFIX_REGEX =
  /^\s*\u0627\u0644\u062d\u0645\u062f\s+\u0644\u0644\u0647[.:\s\-]*/i;

const MAX_FETCH_LENGTH = 200;
const MAX_FETCH_ATTEMPTS = 10;
const MAX_EXPLANATION_LENGTH = 320;
const MAX_SHORT_ANSWER_LENGTH = 140;
const DATASET_SIZE_CACHE_TTL_MS = 1000 * 60 * 30;

let cachedSplitSize = null;
let cachedSplitSizeAt = 0;

function randomInt(maxExclusive) {
  if (!Number.isFinite(maxExclusive) || maxExclusive <= 0) {
    return 0;
  }
  return Math.floor(Math.random() * maxExclusive);
}

function shuffle(values) {
  const items = [...values];
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const temp = items[index];
    items[index] = items[swapIndex];
    items[swapIndex] = temp;
  }
  return items;
}

function truncateText(value, maxLength) {
  if (!value) {
    return "";
  }

  const normalized = String(value).trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trim()}...`;
}

function decodeEntities(value) {
  return String(value)
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function normalizeText(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return decodeEntities(String(value))
    .replace(HTML_TAG_REGEX, " ")
    .replace(WHITESPACE_REGEX, " ")
    .trim();
}

function textFromUnknown(value) {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return normalizeText(value);
  }

  if (Array.isArray(value)) {
    return normalizeText(value.map((item) => textFromUnknown(item)).filter(Boolean).join(" "));
  }

  if (!value || typeof value !== "object") {
    return "";
  }

  const candidates = [
    value.value,
    value.text,
    value.content,
    value.message,
    value.output,
    value.answer,
    value.response,
  ];

  for (const candidate of candidates) {
    const text = textFromUnknown(candidate);
    if (text) {
      return text;
    }
  }

  return "";
}

function arabicRatio(value) {
  const text = normalizeText(value);
  if (!text) {
    return 0;
  }

  const compact = text.replace(/\s/g, "");
  if (!compact) {
    return 0;
  }

  const arabicChars = text.match(ARABIC_CHARS_REGEX) || [];
  return arabicChars.length / compact.length;
}

function looksArabic(value) {
  return arabicRatio(value) >= 0.2;
}

function normalizeConversationRole(message) {
  const rawRole = String(message?.from ?? message?.role ?? "").trim().toLowerCase();
  if (rawRole === "human" || rawRole === "user" || rawRole === "question") {
    return "user";
  }
  if (rawRole === "gpt" || rawRole === "assistant" || rawRole === "answer") {
    return "assistant";
  }
  return null;
}

function extractQuestionAnswerFromConversation(conversation) {
  if (!Array.isArray(conversation) || conversation.length === 0) {
    return null;
  }

  let question = "";
  let answer = "";

  for (const message of conversation) {
    const role = normalizeConversationRole(message);
    const text = textFromUnknown(message?.value ?? message?.content ?? message?.text);
    if (!text) {
      continue;
    }

    if (!question && role === "user") {
      question = text;
      continue;
    }

    if (question && role === "assistant") {
      answer = text;
      break;
    }
  }

  return question && answer ? { question, answer } : null;
}

function extractQuestionAnswerFromFields(row) {
  const questionCandidates = [
    row?.question,
    row?.question_ar,
    row?.query,
    row?.prompt,
    row?.instruction,
    row?.title,
  ];

  const answerCandidates = [
    row?.answer,
    row?.answer_ar,
    row?.response,
    row?.output,
    row?.solution,
    row?.explanation,
    row?.correct_answer,
  ];

  let question = "";
  for (const candidate of questionCandidates) {
    const value = textFromUnknown(candidate);
    if (value) {
      question = value;
      break;
    }
  }

  let answer = "";
  for (const candidate of answerCandidates) {
    const value = textFromUnknown(candidate);
    if (value) {
      answer = value;
      break;
    }
  }

  return question && answer ? { question, answer } : null;
}

function toQuestionAnswerEntry(rawRow) {
  const row = rawRow?.row && typeof rawRow.row === "object" ? rawRow.row : rawRow;
  if (!row || typeof row !== "object") {
    return null;
  }

  const conversationCandidates = [row.conversations, row.conversation, row.messages];
  let pair = null;
  for (const conversation of conversationCandidates) {
    pair = extractQuestionAnswerFromConversation(conversation);
    if (pair) {
      break;
    }
  }

  if (!pair) {
    pair = extractQuestionAnswerFromFields(row);
  }

  if (!pair) {
    return null;
  }

  const question = normalizeText(pair.question);
  const answer = normalizeText(pair.answer);
  if (!question || !answer || !looksArabic(question) || !looksArabic(answer)) {
    return null;
  }

  return { question, answer };
}

function toShortAnswer(value) {
  let normalized = normalizeText(value).replace(LEADING_ANSWER_PREFIX_REGEX, "");
  normalized = normalized.replace(LEADING_PRAISE_PREFIX_REGEX, "");
  if (!normalized) {
    return "";
  }

  const segments = normalized
    .split(/[.\n\u061F!]/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (segments.length === 0) {
    return truncateText(normalized, MAX_SHORT_ANSWER_LENGTH);
  }

  const firstMeaningful = segments.find((segment) => segment.length >= 12) || segments[0];
  return truncateText(firstMeaningful, MAX_SHORT_ANSWER_LENGTH);
}

function toShortExplanation(value) {
  const normalized = normalizeText(value)
    .replace(LEADING_ANSWER_PREFIX_REGEX, "")
    .replace(LEADING_PRAISE_PREFIX_REGEX, "");
  if (!normalized) {
    return "";
  }

  const segments = normalized
    .split(/[.\n\u061F!]/)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length >= 10);

  const firstTwo = segments.slice(0, 2).join(". ");
  return truncateText(firstTwo || normalized, MAX_EXPLANATION_LENGTH);
}

function normalizeChoiceValue(value) {
  return normalizeText(value).toLowerCase();
}

function uniqueByQuestion(entries) {
  const seen = new Set();
  const result = [];
  for (const entry of entries) {
    const key = normalizeChoiceValue(entry.question);
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(entry);
  }
  return result;
}

function parseArabicBoolean(answerText) {
  const normalized = normalizeText(answerText).toLowerCase();
  if (!normalized) {
    return null;
  }

  if (/^\s*\u0646\u0639\u0645\b/.test(normalized)) {
    return true;
  }

  if (/^\s*\u0644\u0627\b/.test(normalized)) {
    return false;
  }

  if (
    /(^|\s)(\u064a\u062c\u0648\u0632|\u0635\u062d\u064a\u062d|\u0645\u0633\u062a\u062d\u0628|\u0648\u0627\u062c\u0628|\u062d\u0644\u0627\u0644)(\s|$)/.test(normalized) &&
    !/(^|\s)(\u0644\u0627 \u064a\u062c\u0648\u0632|\u063a\u064a\u0631 \u062c\u0627\u0626\u0632|\u062d\u0631\u0627\u0645|\u062e\u0637\u0623)(\s|$)/.test(normalized)
  ) {
    return true;
  }

  if (
    /(^|\s)(\u0644\u0627 \u064a\u062c\u0648\u0632|\u063a\u064a\u0631 \u062c\u0627\u0626\u0632|\u062d\u0631\u0627\u0645|\u062e\u0637\u0623)(\s|$)/.test(normalized)
  ) {
    return false;
  }

  return null;
}

function inferTopic(text) {
  const normalized = normalizeText(text).toLowerCase();
  if (!normalized) {
    return "FIQH";
  }

  if (
    /(\u0633\u0648\u0631\u0629|\u0622\u064a\u0629|\u0627\u064a\u0629|\u0627\u0644\u0642\u0631\u0622\u0646|\u0627\u0644\u0642\u0631\u0627\u0646|\u062a\u062c\u0648\u064a\u062f)/.test(
      normalized
    )
  ) {
    return "QURAN";
  }

  if (
    /(\u062d\u062f\u064a\u062b|\u0627\u0644\u0628\u062e\u0627\u0631\u064a|\u0645\u0633\u0644\u0645|\u0633\u0646\u0646|\u0631\u0648\u0627\u0647)/.test(
      normalized
    )
  ) {
    return "HADITH";
  }

  if (
    /(\u0633\u064a\u0631\u0629|\u0627\u0644\u0646\u0628\u064a|\u0627\u0644\u0635\u062d\u0627\u0628\u0629|\u063a\u0632\u0648\u0629)/.test(
      normalized
    )
  ) {
    return "SEERAH";
  }

  if (
    /(\u0639\u0642\u064a\u062f\u0629|\u062a\u0648\u062d\u064a\u062f|\u0625\u064a\u0645\u0627\u0646|\u0627\u064a\u0645\u0627\u0646|\u0634\u0631\u0643)/.test(
      normalized
    )
  ) {
    return "AQEEDAH";
  }

  if (
    /(\u0623\u062e\u0644\u0627\u0642|\u0627\u062e\u0644\u0627\u0642|\u0628\u0631|\u0635\u062f\u0642|\u0635\u0628\u0631|\u0631\u062d\u0645\u0629)/.test(
      normalized
    )
  ) {
    return "AKHLAQ";
  }

  return "FIQH";
}

function inferDifficulty(questionText, answerText) {
  const questionLength = normalizeText(questionText).length;
  const answerLength = normalizeText(answerText).length;
  const combined = questionLength + answerLength;

  if (combined <= 190) {
    return "EASY";
  }

  if (combined <= 360) {
    return "MEDIUM";
  }

  return "HARD";
}

function isMatchingTopic(topic, requestedTopic) {
  return !requestedTopic || requestedTopic === "ANY" || topic === requestedTopic;
}

function isMatchingDifficulty(difficulty, requestedDifficulty) {
  return !requestedDifficulty || requestedDifficulty === "ANY" || difficulty === requestedDifficulty;
}

async function fetchSplitSize(split) {
  const now = Date.now();
  if (cachedSplitSize && now - cachedSplitSizeAt < DATASET_SIZE_CACHE_TTL_MS) {
    return cachedSplitSize[split] ?? 5000;
  }

  const url = new URL(DATASET_SERVER_SIZE_URL);
  url.searchParams.set("dataset", DATASET_PROFILE.dataset);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Islamic dataset size API failed with status ${response.status}`);
  }

  const payload = await response.json();
  const splitSize = {};
  const splitRows = Array.isArray(payload?.size?.splits) ? payload.size.splits : [];
  for (const row of splitRows) {
    if (!row || typeof row !== "object") {
      continue;
    }
    const key = String(row.split || "").trim();
    const rows = Number(row.num_rows) || Number(row.num_examples) || Number(row.rows) || 0;
    if (key && rows > 0) {
      splitSize[key] = rows;
    }
  }

  cachedSplitSize = splitSize;
  cachedSplitSizeAt = now;

  return splitSize[split] ?? 5000;
}

async function fetchRowsFromDataset(split, offset, length) {
  const url = new URL(DATASET_SERVER_ROWS_URL);
  url.searchParams.set("dataset", DATASET_PROFILE.dataset);
  url.searchParams.set("config", DATASET_PROFILE.config);
  url.searchParams.set("split", split);
  url.searchParams.set("offset", String(Math.max(0, offset)));
  url.searchParams.set("length", String(Math.max(1, length)));

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Islamic dataset rows API failed with status ${response.status}`);
  }

  const payload = await response.json();
  return Array.isArray(payload?.rows) ? payload.rows : [];
}

async function fetchArabicQuestionAnswerEntries(targetCount) {
  const collected = [];
  for (let attempt = 0; attempt < MAX_FETCH_ATTEMPTS; attempt += 1) {
    const split = DATASET_PROFILE.splits[randomInt(DATASET_PROFILE.splits.length)];
    const splitSize = await fetchSplitSize(split);
    const maxOffset = Math.max(0, splitSize - MAX_FETCH_LENGTH);
    const offset = randomInt(maxOffset + 1);
    const rows = await fetchRowsFromDataset(split, offset, MAX_FETCH_LENGTH);

    const parsedEntries = rows.map((row) => toQuestionAnswerEntry(row)).filter(Boolean);
    collected.push(...parsedEntries);

    if (collected.length >= targetCount) {
      break;
    }
  }

  return uniqueByQuestion(collected);
}

function toSuggestionBase(entry, answerType) {
  const topic = inferTopic(`${entry.question} ${entry.answer}`);
  const difficulty = inferDifficulty(entry.question, entry.answer);

  return {
    source: "islamqa_hf",
    questionText: truncateText(entry.question, 210),
    answerType,
    answerExplanation: toShortExplanation(entry.answer),
    topic,
    difficulty,
  };
}

function buildTextSuggestions(entries, limit, requestedTopic, requestedDifficulty) {
  const suggestions = [];
  for (const entry of entries) {
    if (suggestions.length >= limit) {
      break;
    }

    const base = toSuggestionBase(entry, "TEXT");
    if (
      !isMatchingTopic(base.topic, requestedTopic) ||
      !isMatchingDifficulty(base.difficulty, requestedDifficulty)
    ) {
      continue;
    }

    suggestions.push({
      ...base,
      correctAnswer: toShortAnswer(entry.answer) || truncateText(entry.answer, MAX_SHORT_ANSWER_LENGTH),
      options: null,
    });
  }

  return suggestions;
}

function buildChoiceSuggestions(entries, answerType, limit, requestedTopic, requestedDifficulty) {
  const answerPool = Array.from(
    new Set(
      entries
        .map((entry) => toShortAnswer(entry.answer))
        .map((answer) => truncateText(answer, MAX_SHORT_ANSWER_LENGTH))
        .filter((answer) => answer.length >= 4)
    )
  );

  const suggestions = [];
  for (const entry of entries) {
    if (suggestions.length >= limit) {
      break;
    }

    const base = toSuggestionBase(entry, answerType);
    if (
      !isMatchingTopic(base.topic, requestedTopic) ||
      !isMatchingDifficulty(base.difficulty, requestedDifficulty)
    ) {
      continue;
    }

    const correctOption = truncateText(toShortAnswer(entry.answer), MAX_SHORT_ANSWER_LENGTH);
    if (!correctOption) {
      continue;
    }

    const distractors = shuffle(
      answerPool.filter((option) => normalizeChoiceValue(option) !== normalizeChoiceValue(correctOption))
    ).slice(0, 3);

    if (distractors.length < 2) {
      continue;
    }

    const options = shuffle([correctOption, ...distractors]);
    suggestions.push({
      ...base,
      options,
      correctAnswer: answerType === "MULTIPLE_CHOICE" ? [correctOption] : correctOption,
    });
  }

  return suggestions;
}

function buildBooleanSuggestions(entries, limit, requestedTopic, requestedDifficulty) {
  const suggestions = [];
  for (const entry of entries) {
    if (suggestions.length >= limit) {
      break;
    }

    const base = toSuggestionBase(entry, "BOOLEAN");
    if (
      !isMatchingTopic(base.topic, requestedTopic) ||
      !isMatchingDifficulty(base.difficulty, requestedDifficulty)
    ) {
      continue;
    }

    const value = parseArabicBoolean(entry.answer);
    if (value === null) {
      continue;
    }

    suggestions.push({
      ...base,
      options: ["\u0646\u0639\u0645", "\u0644\u0627"],
      correctAnswer: value,
    });
  }

  return suggestions;
}

function buildSuggestionsByType(
  answerType,
  entries,
  limit,
  requestedTopic,
  requestedDifficulty
) {
  if (answerType === "TEXT") {
    return buildTextSuggestions(entries, limit, requestedTopic, requestedDifficulty);
  }

  if (answerType === "BOOLEAN") {
    return buildBooleanSuggestions(entries, limit, requestedTopic, requestedDifficulty);
  }

  if (answerType === "SINGLE_CHOICE" || answerType === "MULTIPLE_CHOICE") {
    return buildChoiceSuggestions(
      entries,
      answerType,
      limit,
      requestedTopic,
      requestedDifficulty
    );
  }

  return [];
}

function appendUniqueSuggestions(current, candidates, limit) {
  for (const candidate of candidates) {
    if (current.length >= limit) {
      break;
    }

    const key = `${candidate.answerType}|${normalizeChoiceValue(candidate.questionText)}`;
    const exists = current.some(
      (existing) =>
        `${existing.answerType}|${normalizeChoiceValue(existing.questionText)}` === key
    );
    if (!exists) {
      current.push(candidate);
    }
  }
}

export async function fetchIslamicDailyQuestionSuggestions(answerType, limit, topic, difficulty) {
  const safeLimit = Math.max(1, Math.min(10, Number(limit) || 5));
  const targetPoolSize = Math.max(40, safeLimit * 14);
  const entries = await fetchArabicQuestionAnswerEntries(targetPoolSize);
  if (entries.length === 0) {
    return [];
  }

  const shuffledEntries = shuffle(entries);
  const requestedTopic = topic || "ANY";
  const requestedDifficulty = difficulty || "ANY";
  const result = [];

  const strict = buildSuggestionsByType(
    answerType,
    shuffledEntries,
    safeLimit,
    requestedTopic,
    requestedDifficulty
  );
  appendUniqueSuggestions(result, strict, safeLimit);

  if (result.length < safeLimit && requestedDifficulty !== "ANY") {
    const relaxedDifficulty = buildSuggestionsByType(
      answerType,
      shuffledEntries,
      safeLimit,
      requestedTopic,
      "ANY"
    );
    appendUniqueSuggestions(result, relaxedDifficulty, safeLimit);
  }

  if (result.length < safeLimit && requestedTopic !== "ANY") {
    const relaxedTopic = buildSuggestionsByType(
      answerType,
      shuffledEntries,
      safeLimit,
      "ANY",
      requestedDifficulty
    );
    appendUniqueSuggestions(result, relaxedTopic, safeLimit);
  }

  if (
    result.length < safeLimit &&
    (requestedTopic !== "ANY" || requestedDifficulty !== "ANY")
  ) {
    const fullyRelaxed = buildSuggestionsByType(
      answerType,
      shuffledEntries,
      safeLimit,
      "ANY",
      "ANY"
    );
    appendUniqueSuggestions(result, fullyRelaxed, safeLimit);
  }

  return result.slice(0, safeLimit);
}
