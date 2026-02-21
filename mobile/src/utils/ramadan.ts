const CAIRO_TIMEZONE = "Africa/Cairo";
const RAMADAN_START_YEAR = 2026;
const RAMADAN_START_MONTH = 2;
const RAMADAN_START_DAY = 19;

function getCairoDateParts(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: CAIRO_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value || RAMADAN_START_YEAR);
  const month = Number(parts.find((part) => part.type === "month")?.value || RAMADAN_START_MONTH);
  const day = Number(parts.find((part) => part.type === "day")?.value || RAMADAN_START_DAY);

  return { year, month, day };
}

function toUtcDateNumber(year: number, month: number, day: number) {
  return Date.UTC(year, month - 1, day);
}

export function getRamadanDayNumber(date = new Date()) {
  const current = getCairoDateParts(date);
  const currentUtc = toUtcDateNumber(current.year, current.month, current.day);
  const startUtc = toUtcDateNumber(RAMADAN_START_YEAR, RAMADAN_START_MONTH, RAMADAN_START_DAY);

  const diffDays = Math.floor((currentUtc - startUtc) / (24 * 60 * 60 * 1000)) + 1;
  return diffDays > 0 ? diffDays : 0;
}
