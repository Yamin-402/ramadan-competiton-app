import { prisma } from "../../core/db/prisma.js";
import { env } from "../../core/config/env.js";
import { toAppDateString, toDateOnly } from "../../core/utils/timezone.js";
import { fetchPrayerTimesForDate } from "./prayer-time.client.js";

const CAIRO_OFFSET = "+02:00";

function toDateTime(dateString, clockValue) {
  const hour = String(clockValue.hour).padStart(2, "0");
  const minute = String(clockValue.minute).padStart(2, "0");

  // TODO: handle daylight saving transitions for Africa/Cairo with a timezone-aware lib.
  return new Date(`${dateString}T${hour}:${minute}:00${CAIRO_OFFSET}`);
}

export async function getOrCreateFastingWindow(occurredAt = new Date()) {
  const appDateString = toAppDateString(occurredAt);
  const dateOnly = toDateOnly(appDateString);

  const existing = await prisma.fastingWindow.findUnique({
    where: {
      date_timezone: {
        date: dateOnly,
        timezone: env.appTimezone,
      },
    },
  });

  if (existing) {
    return existing;
  }

  const prayerTimes = await fetchPrayerTimesForDate(dateOnly);

  return prisma.fastingWindow.create({
    data: {
      date: dateOnly,
      timezone: env.appTimezone,
      fajrAt: toDateTime(appDateString, prayerTimes.fajr),
      maghribAt: toDateTime(appDateString, prayerTimes.maghrib),
      source: prayerTimes.source,
    },
  });
}

export async function isDuringFastingTime(occurredAt = new Date()) {
  const window = await getOrCreateFastingWindow(occurredAt);
  return occurredAt >= window.fajrAt && occurredAt <= window.maghribAt;
}