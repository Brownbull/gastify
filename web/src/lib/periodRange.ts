/**
 * Period range math for the shared Historial/analytics PeriodControl. Anchors a
 * Date to a grain (week/month/quarter/year) and yields the inclusive `{from,to}`
 * date bounds (for scoping list queries) + a localized label + stepping helpers.
 */
export type Grain = "week" | "month" | "quarter" | "year";

export const GRAINS: Grain[] = ["week", "month", "quarter", "year"];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** local YYYY-MM-DD (no UTC shift). */
function iso(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Monday-based start of the anchor's week. */
function startOfWeek(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (x.getDay() + 6) % 7; // Mon=0 … Sun=6
  x.setDate(x.getDate() - dow);
  return x;
}

export interface PeriodRange {
  grain: Grain;
  from: string;
  to: string;
  label: string;
}

/** Inclusive date bounds + a localized label for the grain-anchored period. */
export function periodRange(grain: Grain, anchor: Date, locale = "es"): PeriodRange {
  const year = anchor.getFullYear();
  if (grain === "week") {
    const s = startOfWeek(anchor);
    const e = new Date(s);
    e.setDate(s.getDate() + 6);
    const fmt = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" });
    return { grain, from: iso(s), to: iso(e), label: `${fmt.format(s)} – ${fmt.format(e)}` };
  }
  if (grain === "month") {
    const s = new Date(year, anchor.getMonth(), 1);
    const e = new Date(year, anchor.getMonth() + 1, 0);
    const label = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(s);
    return { grain, from: iso(s), to: iso(e), label };
  }
  if (grain === "quarter") {
    const q = Math.floor(anchor.getMonth() / 3); // 0..3
    const s = new Date(year, q * 3, 1);
    const e = new Date(year, q * 3 + 3, 0);
    return { grain, from: iso(s), to: iso(e), label: `Q${q + 1} ${year}` };
  }
  const s = new Date(year, 0, 1);
  const e = new Date(year, 11, 31);
  return { grain, from: iso(s), to: iso(e), label: String(year) };
}

/** Shift the anchor by one grain step (±1). */
export function stepAnchor(grain: Grain, anchor: Date, dir: -1 | 1): Date {
  const d = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
  if (grain === "week") d.setDate(d.getDate() + dir * 7);
  else if (grain === "month") d.setMonth(d.getMonth() + dir);
  else if (grain === "quarter") d.setMonth(d.getMonth() + dir * 3);
  else d.setFullYear(d.getFullYear() + dir);
  return d;
}

/** Can we step forward? (never past the period containing "now".) */
export function canStepNext(grain: Grain, anchor: Date, now: Date = new Date()): boolean {
  const next = stepAnchor(grain, anchor, 1);
  return periodRange(grain, next).from <= iso(now);
}
