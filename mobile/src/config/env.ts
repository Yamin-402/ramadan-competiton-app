const rawBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

if (!rawBaseUrl) {
  throw new Error("EXPO_PUBLIC_API_BASE_URL is required.");
}

export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, "");
