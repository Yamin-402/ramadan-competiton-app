import { env } from "../config/env.js";

const formatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: env.appTimezone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function toAppDateString(date = new Date()) {
  return formatter.format(date);
}

export function toDateOnly(dateString) {
  return new Date(`${dateString}T00:00:00.000Z`);
}