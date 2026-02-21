function normalizeNumber(value: number | string): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(parsed)) {
    return 0;
  }

  return parsed;
}

export function formatPoints(value: number | string): string {
  const parsed = normalizeNumber(value);
  if (Number.isInteger(parsed)) {
    return `${parsed}`;
  }
  return parsed.toFixed(2);
}

export function formatMoney(value: number | string): string {
  return normalizeNumber(value).toFixed(2);
}

export function formatDateTime(iso: string | Date): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  return date.toLocaleString();
}

export function formatDate(iso: string | Date): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  return date.toLocaleDateString();
}
