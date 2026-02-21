const rawBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || "https://ramadan-competiton-app.fly.dev";

export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, "");
