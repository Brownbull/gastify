/**
 * Monthly-spend trend — the temporal series behind the Home "Tendencia" rep
 * (spend over the last N months; `current` flags the active month).
 */
export interface TrendBar {
  label: string;
  value: number;
  current?: boolean;
}

export const MONTHLY_TREND: TrendBar[] = [
  { label: "ene", value: 312_000 },
  { label: "feb", value: 358_000 },
  { label: "mar", value: 298_000 },
  { label: "abr", value: 421_000 },
  { label: "may", value: 367_000 },
  { label: "jun", value: 385_000, current: true },
];
