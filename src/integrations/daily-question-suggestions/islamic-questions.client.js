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
const LEADING_ANSWER_PREFIX_REGEX = /^(الجواب|الإجابة|الاجابة)\s*[:：-]\s*/i;
const LEADING_PRAISE_PREFIX_REGEX = /^\s*الحمد\s+لله[.،:\s-]*/i;

const MAX_FETCH_LENGTH = 100;
const MAX_FETCH_ATTEMPTS = 5;
const MAX_EXPLANATION_LENGTH = 950;
const MAX_SHORT_ANSWER_LENGTH = 160;
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

  return `${normalized.slice(0, maxLength - 1).trim()}…`;
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
    const joined = value
      .map((item) => textFromUnknown(item))
      .filter(Boolean)
      .join(" ");
    return normalizeText(joined);
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
  return arabicRatio(value) >= 0.35;
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

  if (!question || !answer) {
    return null;
  }

  return { question, answer };
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

  if (!question || !answer) {
    return null;
  }

  return { question, answer };
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
  if (!question || !answer) {
    return null;
  }

  if (!looksArabic(question) || !looksArabic(answer)) {
    return null;
  }

  return {
    question,
    answer,
  };
}

function toShortAnswer(value) {
  let normalized = normalizeText(value).replace(LEADING_ANSWER_PREFIX_REGEX, "");
  normalized = normalized.replace(LEADING_PRAISE_PREFIX_REGEX, "");
  if (!normalized) {
    return "";
  }

  const segments = normalized
    .split(/[.\n؟!]/)
    .map((segment) => segment.trim())
    .filter(Boolean);
  if (segments.length === 0) {
    return truncateText(normalized, MAX_SHORT_ANSWER_LENGTH);
  }

  const firstMeaningful = segments.find((segment) => segment.length >= 12) || segments[0];
  return truncateText(firstMeaningful, MAX_SHORT_ANSWER_LENGTH);
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

  if (/^\s*نعم\b/.test(normalized)) {
    return true;
  }

  if (/^\s*لا\b/.test(normalized)) {
    return false;
  }

  if (/(^|\s)(يجوز|صحيح|مستحب|واجب|حلال)(\s|$)/.test(normalized) && !/(^|\s)(لا يجوز|غير جائز|حرام|خطأ)(\s|$)/.test(normalized)) {
    return true;
  }

  if (/(^|\s)(لا يجوز|غير جائز|حرام|خطأ)(\s|$)/.test(normalized)) {
    return false;
  }

  return null;
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
    const rows =
      Number(row.num_rows) ||
      Number(row.num_examples) ||
      Number(row.rows) ||
      0;
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

function buildTextSuggestions(entries, limit) {
  return entries.slice(0, limit).map((entry) => {
    const shortAnswer = toShortAnswer(entry.answer);
    return {
      source: "islamqa_hf",
      questionText: entry.question,
      answerType: "TEXT",
      correctAnswer: shortAnswer || truncateText(entry.answer, MAX_SHORT_ANSWER_LENGTH),
      answerExplanation: truncateText(entry.answer, MAX_EXPLANATION_LENGTH),
      options: null,
    };
  });
}

function buildChoiceSuggestions(entries, answerType, limit) {
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
      source: "islamqa_hf",
      questionText: entry.question,
      answerType,
      options,
      correctAnswer: answerType === "MULTIPLE_CHOICE" ? [correctOption] : correctOption,
      answerExplanation: truncateText(entry.answer, MAX_EXPLANATION_LENGTH),
    });
  }

  return suggestions;
}

function buildBooleanSuggestions(entries, limit) {
  const suggestions = [];
  for (const entry of entries) {
    if (suggestions.length >= limit) {
      break;
    }

    const value = parseArabicBoolean(entry.answer);
    if (value === null) {
      continue;
    }

    suggestions.push({
      source: "islamqa_hf",
      questionText: entry.question,
      answerType: "BOOLEAN",
      options: ["نعم", "لا"],
      correctAnswer: value,
      answerExplanation: truncateText(entry.answer, MAX_EXPLANATION_LENGTH),
    });
  }

  return suggestions;
}

export async function fetchIslamicDailyQuestionSuggestions(answerType, limit) {
  const safeLimit = Math.max(1, Math.min(10, Number(limit) || 5));
  const targetPoolSize = Math.max(40, safeLimit * 12);
  const entries = await fetchArabicQuestionAnswerEntries(targetPoolSize);
  if (entries.length === 0) {
    return [];
  }

  if (answerType === "TEXT") {
    return buildTextSuggestions(shuffle(entries), safeLimit);
  }

  if (answerType === "BOOLEAN") {
    return buildBooleanSuggestions(shuffle(entries), safeLimit);
  }

  if (answerType === "SINGLE_CHOICE" || answerType === "MULTIPLE_CHOICE") {
    return buildChoiceSuggestions(shuffle(entries), answerType, safeLimit);
  }

  return [];
}
