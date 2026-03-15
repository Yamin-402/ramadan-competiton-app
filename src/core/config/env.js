import dotenv from "dotenv";

dotenv.config();

const required = ["DATABASE_URL"];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 3000),
  appTimezone: process.env.APP_TIMEZONE || "Africa/Cairo",
  databaseUrl: process.env.DATABASE_URL,  aiApiKey: process.env.AI_API_KEY || process.env.GROQ_API_KEY || "",
  prayerTimes: {
    baseUrl: process.env.PRAYER_TIMES_BASE_URL || "https://api.aladhan.com/v1",
    city: process.env.PRAYER_TIMES_CITY || "Cairo",
    country: process.env.PRAYER_TIMES_COUNTRY || "Egypt",
    method: Number(process.env.PRAYER_TIMES_METHOD || 5),
  },
};
