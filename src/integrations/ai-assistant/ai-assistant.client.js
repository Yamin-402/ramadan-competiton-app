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

async function callGroqJson(config, prompt) {
  const baseUrl = toSafeBaseUrl(config.baseUrl);
  const timeoutMs = Number.isFinite(Number(config.timeoutMs))
    ? Math.max(5000, Math.min(90000, Number(config.timeoutMs)))
    : 25000;
  const model = String(config.model || "").trim();
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
        max_tokens: 800,
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
      throw new Error(`AI server returned ${response.status}${detail ? `: ${detail}` : ""}`);
    }

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content ?? payload?.choices?.[0]?.text ?? "";
    return extractJsonObject(content);
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function rewriteDailyQuestionSuggestionWithAi(config, context) {
  const prompt = [
    "Rewrite this Islamic question suggestion for a Ramadan competition.",
    "Return JSON only, with no markdown and no extra text.",
    "All user-facing text MUST be in Arabic.",
    `Requested answerType: ${context.answerType}`,
    `Requested topic: ${context.topic || "ANY"}`,
    `Requested difficulty: ${context.difficulty || "ANY"}`,
    "Output rules:",
    "- questionText: short, clear Arabic question.",
    "- correctAnswer: very concise.",
    "- answerExplanation: concise Arabic explanation, max 220 chars.",
    "- options: required only for choice-based answer types.",
    "- topic must be one of: FIQH,HADITH,QURAN,AQEEDAH,SEERAH,AKHLAQ.",
    "- difficulty must be one of: EASY,MEDIUM,HARD.",
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
    "Output rules:",
    "- questionText: short, clear Arabic question (max 200 chars).",
    "- correctAnswer: very concise.",
    "- answerExplanation: concise Arabic explanation, max 220 chars.",
    "- options: required only for choice-based answer types (2 to 5 options).",
    "- topic must be one of: FIQH,HADITH,QURAN,AQEEDAH,SEERAH,AKHLAQ.",
    "- difficulty must be one of: EASY,MEDIUM,HARD.",
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
    `Input analytics: ${JSON.stringify(context.analytics)}`,
    'JSON shape: {"title":"...","summary":"...","highlights":["..."],"comparison":"...","actionPlan":["..."],"motivation":"..."}',
  ].join("\n");

  return callGroqJson(config, prompt);
}
