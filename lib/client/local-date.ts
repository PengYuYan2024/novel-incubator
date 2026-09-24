function localDateKey(value: Date): string {
  return [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, "0"),
    String(value.getDate()).padStart(2, "0"),
  ].join("-");
}

function parseDateInput(value: string): [number, number, number] | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const parts = [Number(match[1]), Number(match[2]), Number(match[3])] as const;
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  if (localDateKey(date) !== value) return null;
  return [parts[0], parts[1], parts[2]];
}

export function utcRangeForDateInput(value: string): { start: string; end: string } | null {
  const parts = parseDateInput(value);
  if (!parts) return null;
  const [year, month, day] = parts;
  return {
    start: new Date(year, month - 1, day).toISOString(),
    end: new Date(year, month - 1, day + 1).toISOString(),
  };
}

export function localDateRange(now = new Date()): { start: string; end: string } {
  return utcRangeForDateInput(localDateKey(now)) as { start: string; end: string };
}

export function dateInputValue(value?: string): string {
  if (!value) return "";
  if (parseDateInput(value)) return value;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? localDateKey(date) : "";
}

export function withUtcDateBounds<T extends { updatedFrom?: string; updatedTo?: string }>(
  filters: T,
): T {
  return {
    ...filters,
    updatedFrom: filters.updatedFrom
      ? utcRangeForDateInput(filters.updatedFrom)?.start ?? filters.updatedFrom
      : undefined,
    updatedTo: filters.updatedTo
      ? utcRangeForDateInput(filters.updatedTo)?.end ?? filters.updatedTo
      : undefined,
  };
}
