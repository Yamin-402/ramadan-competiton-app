import { env } from "../../core/config/env.js";

function toSafeBaseUrl(baseUrl) {
  const normalized = String(baseUrl || "").trim().replace(/\/+$/, "");
  if (!normalized) {
    throw new Error("AI base URL is missing");
  }
  return normalized;
}

function extractJsonObject(value) {
  const text = String(value || "").trim();
  if (!text) {
    throw new Error("AI response is empty");
  }

  try {
    return JSON.parse(text);
  } catch {}

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const candidate = text.slice(firstBrace, lastBrace + 1);
    return JSON.parse(candidate);
  }

  throw new Error("AI response is not valid JSON");
}

function resolveApiKey() {
  const apiKey = String(env.aiApiKey || "").trim();
  if (!apiKey) {
    throw new Error("AI API key is missing");
  }
  return apiKey;
}

class GroqHttpError extends Error {
  constructor(status, bodyText) {
    super(`AI server returned ${status}${bodyText ? `: ${bodyText}` : ""}`);
    this.status = status;
    this.bodyText = bodyText;
  }
}

function uniqueStrings(values) {
  return Array.from(
    new Set(values.map((value) => String(value || "").trim()).filter(Boolean))
  );
}

function buildModelCandidates(model) {
  return uniqueStrings([
    model,
    "llama-3.3-70b-versatile",
    "llama-3.1-70b-versatile",
    "llama-3.1-8b-instant",
    "llama3-70b-8192",
    "llama3-8b-8192",
    "mixtral-8x7b-32768",
  ]);
}

function looksLikeModelError(error) {
  if (!(error instanceof GroqHttpError)) {
    return false;
  }
  if (error.status !== 400 && error.status !== 404) {
    return false;
  }
  const text = String(error.bodyText || "").toLowerCase();
  return (
    text.includes("model") &&
    (text.includes("not found") || text.includes("invalid") || text.includes("unknown"))
  );
}

async function callGroqJsonOnce(config, prompt, modelOverride) {
  const baseUrl = toSafeBaseUrl(config.baseUrl);
  const timeoutMs = Number.isFinite(Number(config.timeoutMs))
    ? Math.max(5000, Math.min(90000, Number(config.timeoutMs)))
    : 25000;
  const model = String(modelOverride || config.model || "").trim();
  if (!model) {
    throw new Error("AI model is missing");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${resolveApiKey()}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 1100,
        messages: [
          {
            role: "system",
            content:
              "You are a careful assistant. Always return JSON only with no markdown, no extra text.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new GroqHttpError(response.status, detail);
    }

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content ?? payload?.choices?.[0]?.text ?? "";
    return extractJsonObject(content);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function callGroqJson(config, prompt) {
  const model = String(config.model || "").trim();
  const candidates = buildModelCandidates(model);

  let lastError;
  for (const candidate of candidates) {
    try {
      return await callGroqJsonOnce(config, prompt, candidate);
    } catch (error) {
      lastError = error;
      if (looksLikeModelError(error)) {
        continue;
      }
      throw error;
    }
  }

  throw lastError || new Error("AI request failed");
}

export async function rewriteDailyQuestionSuggestionWithAi(config, context) {
  const prompt = [
    "Rewrite this Islamic question suggestion for a Ramadan competition.",
    "Return JSON only, with no markdown and no extra text.",
    "All user-facing text MUST be in Arabic.",
    `Requested answerType: ${context.answerType}`,
    `Requested topic: ${context.topic || "ANY"}`,
    `Requested difficulty: ${context.difficulty || "ANY"}`,
    `Requested questionLength: ${context.questionLength || "ANY"}`,
    `Requested answerLength: ${context.answerLength || "ANY"}`,
    "Output rules:",
    "- questionText: one clear Arabic question sentence (max 200 chars). Avoid long story/context.",
    "- Follow length buckets for questionText when possible: SHORT ~40-80 chars, MEDIUM ~80-140, LONG ~140-200.",
    "- answerExplanation: 2 to 3 short sentences, clear and practical (90 to 420 chars).",
    "- Follow length buckets for answerExplanation when possible: SHORT ~90-150 chars, MEDIUM ~150-240, LONG ~240-420.",
    "- Avoid extremely short or vague explanations. Do not output 1-word answers.",
    "- If suggestion has rawAnswer, use it as main source and simplify it.",
    "- For SINGLE_CHOICE: generate exactly 4 Arabic options (2 to 7 words each), one correct, 3 plausible distractors.",
    "- For MULTIPLE_CHOICE: generate 4 to 6 options, and 2 to 3 correct answers.",
    "- correctAnswer MUST match option(s) exactly for choice types.",
    "- correctAnswer for non-boolean types should be a short phrase (at least 12 chars), not a single word.",
    "- options: required only for choice-based answer types.",
    "- topic must be one of: FIQH,HADITH,QURAN,AQEEDAH,SEERAH,AKHLAQ.",
    "- difficulty must be one of: EASY,MEDIUM,HARD.",
    "- Avoid controversial/rare opinions. Prefer well-known, practical Islamic knowledge.",
    `Admin style profile: ${JSON.stringify(context.styleProfile)}`,
    `Raw suggestion: ${JSON.stringify(context.suggestion)}`,
    'JSON shape: {"questionText":"...","correctAnswer":"...","answerExplanation":"...","options":[],"topic":"FIQH","difficulty":"EASY"}',
  ].join("\n");

  return callGroqJson(config, prompt);
}

export async function generateDailyQuestionSuggestionWithAi(config, context) {
  const prompt = [
    "Generate one Islamic question suggestion for a Ramadan competition.",
    "Return JSON only, with no markdown and no extra text.",
    "All user-facing text MUST be in Arabic.",
    `Requested answerType: ${context.answerType}`,
    `Requested topic: ${context.topic || "ANY"}`,
    `Requested difficulty: ${context.difficulty || "ANY"}`,
    `Requested questionLength: ${context.questionLength || "ANY"}`,
    `Requested answerLength: ${context.answerLength || "ANY"}`,
    "Output rules:",
    "- questionText: one clear Arabic question sentence (max 200 chars). Avoid long story/context.",
    "- Follow length buckets for questionText when possible: SHORT ~40-80 chars, MEDIUM ~80-140, LONG ~140-200.",
    "- answerExplanation: 2 to 3 short sentences, clear and practical (90 to 420 chars).",
    "- Follow length buckets for answerExplanation when possible: SHORT ~90-150 chars, MEDIUM ~150-240, LONG ~240-420.",
    "- Avoid extremely short or vague explanations. Do not output 1-word answers.",
    "- For SINGLE_CHOICE: generate exactly 4 Arabic options (2 to 7 words each), one correct, 3 plausible distractors.",
    "- For MULTIPLE_CHOICE: generate 4 to 6 options, and 2 to 3 correct answers.",
    "- correctAnswer MUST match option(s) exactly for choice types.",
    "- correctAnswer for non-boolean types should be a short phrase (at least 12 chars), not a single word.",
    "- options: required only for choice-based answer types.",
    "- topic must be one of: FIQH,HADITH,QURAN,AQEEDAH,SEERAH,AKHLAQ.",
    "- difficulty must be one of: EASY,MEDIUM,HARD.",
    "- Avoid controversial/rare opinions. Prefer well-known, practical Islamic knowledge.",
    `Admin style profile: ${JSON.stringify(context.styleProfile)}`,
    'JSON shape: {"questionText":"...","correctAnswer":"...","answerExplanation":"...","options":[],"topic":"FIQH","difficulty":"EASY"}',
  ].join("\n");

  return callGroqJson(config, prompt);
}

export async function generateMotivationMessageWithAi(config, context) {
  const prompt = [
    "Write a very short motivational notification.",
    "Return JSON only, with no markdown and no extra text.",
    "The title and body MUST be Arabic (friendly Egyptian tone).",
    "Rules:",
    "- title: 3 to 6 words.",
    "- body: 1 to 2 short sentences, max 220 chars.",
    "- personal and encouraging, never harsh.",
    `Report context: ${JSON.stringify(context)}`,
    'JSON shape: {"title":"...","body":"..."}',
  ].join("\n");

  return callGroqJson(config, prompt);
}

export async function generateUserProgressReportWithAi(config, context) {
  const prompt = [
    "Generate a personal performance report for a Ramadan competition user.",
    "Return JSON only, with no markdown and no extra text.",
    `Report language: ${context.language}`,
    `Report length: ${context.reportLength}`,
    `Focus mode: ${context.focusMode}`,
    `Tone: ${context.tone}`,
    "Rules:",
    "- title: concise.",
    "- summary: clear paragraph.",
    "- highlights: array of short bullet points.",
    "- comparison: short paragraph comparing periods if focus includes comparison.",
    "- actionPlan: array of practical next steps.",
    "- motivation: short final motivational paragraph.",
    "- Keep content user-friendly and practical.",
    "- Always reflect the provided analytics totals (totalActivities, totalPoints). Never claim 0 if analytics shows otherwise.",
    `Input analytics: ${JSON.stringify(context.analytics)}`,
    'JSON shape: {"title":"...","summary":"...","highlights":["..."],"comparison":"...","actionPlan":["..."],"motivation":"..."}',
  ].join("\n");

  return callGroqJson(config, prompt);
}
