import { env } from "../../core/config/env.js";

function toApiDate(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${day}-${month}-${year}`;
}

function parseClockValue(value) {
  const match = String(value).match(/^(\d{1,2}):(\d{2})/);
  if (!match) {
    throw new Error(`Invalid prayer time format: ${value}`);
  }

  return {
    hour: Number(match[1]),
    minute: Number(match[2]),
  };
}

export async function fetchPrayerTimesForDate(date) {
  const baseUrl = env.prayerTimes.baseUrl.endsWith("/")
    ? env.prayerTimes.baseUrl
    : `${env.prayerTimes.baseUrl}/`;

  const url = new URL("timingsByCity", baseUrl);
  url.searchParams.set("city", env.prayerTimes.city);
  url.searchParams.set("country", env.prayerTimes.country);
  url.searchParams.set("method", String(env.prayerTimes.method));
  url.searchParams.set("date", toApiDate(date));

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Prayer API failed with status ${response.status}`);
  }

  const payload = await response.json();
  const timings = payload?.data?.timings;

  if (!timings?.Fajr || !timings?.Maghrib) {
    throw new Error("Prayer API response is missing Fajr or Maghrib");
  }

  return {
    fajr: parseClockValue(timings.Fajr),
    maghrib: parseClockValue(timings.Maghrib),
    source: url.origin,
  };
}