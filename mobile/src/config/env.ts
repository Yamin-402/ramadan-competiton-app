const DEFAULT_API_BASE_URL = "https://ramadan-competiton-app.fly.dev/api/v1";
const COMMON_WRONG_API_BASE_URL = "https://ramadan-competition-app.fly.dev/api/v1";
const rawBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL;

function sanitizeHostTypos(value: string): string {
  return value
    .replace(/^hhttps:\/\//i, "https://")
    .replace("ramadan-competition-app.fly.dev", "ramadan-competiton-app.fly.dev");
}

function normalizeApiBaseUrl(value: string): string {
  const sanitized = sanitizeHostTypos(String(value || "").trim());
  const trimmed = sanitized.replace(/\/+$/, "");
  if (!trimmed) {
    return DEFAULT_API_BASE_URL;
  }

  if (!/^https?:\/\//i.test(trimmed)) {
    return DEFAULT_API_BASE_URL;
  }

  return /\/api\/v1$/i.test(trimmed) ? trimmed : `${trimmed}/api/v1`;
}

const candidates = [rawBaseUrl, DEFAULT_API_BASE_URL, COMMON_WRONG_API_BASE_URL].map(
  normalizeApiBaseUrl
);

export const API_BASE_URL_FALLBACKS = Array.from(new Set(candidates));
export const API_BASE_URL = API_BASE_URL_FALLBACKS[0] || DEFAULT_API_BASE_URL;
