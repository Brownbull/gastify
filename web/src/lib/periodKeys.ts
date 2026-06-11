/**
 * Period-key math for the W/M/Q/Y temporal bar (legacy TimePeriod port).
 *
 * Keys mirror the backend's report-period forms: YYYY-Wnn (ISO week), YYYY-MM (month),
 * YYYY-Qn (quarter), YYYY (year). ISO week math is hand-rolled (Monday-start; week 1 =
 * the week containing Jan 4) to match Python's date.fromisocalendar.
 */

export type PeriodGranularity = "week" | "month" | "quarter" | "year";

function isoWeekParts(d: Date): { year: number; week: number } {
  // Thursday of the current week decides the ISO year. Reads UTC getters — callers
  // pass either UTC-built dates (isoWeekMonday output) or normalize local now first.
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7; // Mon=1..Sun=7
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const isoYear = t.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const week = Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: isoYear, week };
}

/** The Monday of ISO (year, week) — the inverse of isoWeekParts. */
export function isoWeekMonday(year: number, week: number): Date {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const day = jan4.getUTCDay() || 7;
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - day + 1);
  const monday = new Date(week1Monday);
  monday.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7);
  return monday;
}

export function currentPeriodKey(granularity: PeriodGranularity, now: Date = new Date()): string {
  const y = now.getFullYear();
  switch (granularity) {
    case "week": {
      // Normalize the LOCAL calendar date into a UTC date before the UTC week math.
      const local = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
      const { year, week } = isoWeekParts(local);
      return `${year}-W${String(week).padStart(2, "0")}`;
    }
    case "month":
      return `${y}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    case "quarter":
      return `${y}-Q${Math.floor(now.getMonth() / 3) + 1}`;
    case "year":
      return String(y);
  }
}

export function granularityOfKey(key: string): PeriodGranularity {
  if (/^\d{4}-W\d{2}$/.test(key)) return "week";
  if (/^\d{4}-Q[1-4]$/.test(key)) return "quarter";
  if (/^\d{4}-\d{2}$/.test(key)) return "month";
  return "year";
}

/** Step a period key by ±1 of its own granularity. */
export function shiftPeriodKey(key: string, delta: 1 | -1): string {
  const g = granularityOfKey(key);
  switch (g) {
    case "week": {
      const [y, w] = key.split("-W").map(Number);
      const monday = isoWeekMonday(y, w);
      monday.setUTCDate(monday.getUTCDate() + 7 * delta);
      const parts = isoWeekParts(monday);
      return `${parts.year}-W${String(parts.week).padStart(2, "0")}`;
    }
    case "month": {
      const [y, m] = key.split("-").map(Number);
      const idx = y * 12 + (m - 1) + delta;
      return `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, "0")}`;
    }
    case "quarter": {
      const [y, q] = [Number(key.slice(0, 4)), Number(key.slice(6))];
      const idx = y * 4 + (q - 1) + delta;
      return `${Math.floor(idx / 4)}-Q${(idx % 4) + 1}`;
    }
    case "year":
      return String(Number(key) + delta);
  }
}

/** The month key (YYYY-MM) containing the period's start — for series windows. */
export function monthKeyOf(key: string): string {
  const g = granularityOfKey(key);
  switch (g) {
    case "week": {
      const [y, w] = key.split("-W").map(Number);
      const monday = isoWeekMonday(y, w);
      return `${monday.getUTCFullYear()}-${String(monday.getUTCMonth() + 1).padStart(2, "0")}`;
    }
    case "month":
      return key;
    case "quarter": {
      const q = Number(key.slice(6));
      return `${key.slice(0, 4)}-${String((q - 1) * 3 + 1).padStart(2, "0")}`;
    }
    case "year":
      return `${key}-01`;
  }
}
