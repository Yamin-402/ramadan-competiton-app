export type FastingSelection = "FASTING" | "IFTAR";

function getCairoHour(date: Date): number {
  const hour = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Cairo",
    hour: "2-digit",
    hour12: false,
  }).format(date);

  const parsed = Number(hour);
  return Number.isNaN(parsed) ? 12 : parsed;
}

export function getDefaultFastingSelection(now = new Date()): FastingSelection {
  const cairoHour = getCairoHour(now);
  return cairoHour >= 4 && cairoHour < 18 ? "FASTING" : "IFTAR";
}

export function toIsDuringFasting(selection: FastingSelection): boolean {
  return selection === "FASTING";
}
