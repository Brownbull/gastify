/**
 * Gravity-center model (REQ-10) — deterministic concentration detection: an L2
 * category whose spend this period deviates >1.5× (growth) or <0.5× (shrink)
 * from its trailing 3-month baseline. No black-box scoring; ratio = value/baseline.
 */
export interface GravityCenter {
  /** category id (rubro/giro). */
  id: string;
  /** spend this period. */
  value: number;
  /** trailing 3-month average. */
  baseline: number;
}

/** ratio of this period to the trailing baseline. */
export function gravityRatio(c: GravityCenter): number {
  return c.baseline > 0 ? c.value / c.baseline : 0;
}

/** flagged when >1.5× (growth) or <0.5× (shrink). */
export function isGravityCenter(c: GravityCenter): boolean {
  const r = gravityRatio(c);
  return r > 1.5 || r < 0.5;
}

const POOL: GravityCenter[] = [
  { id: "salud-bienestar", value: 38700, baseline: 12000 }, // 3.2× ▲
  { id: "restaurantes", value: 52100, baseline: 24000 }, // 2.2× ▲
  { id: "transporte-vehiculo", value: 74900, baseline: 47000 }, // 1.6× ▲
  { id: "comercio-barrio", value: 6200, baseline: 17000 }, // 0.36× ▼
];

/** the flagged centers, ranked by how far they deviate from baseline. */
export const SAMPLE_GRAVITY: GravityCenter[] = POOL.filter(isGravityCenter).sort((a, b) => {
  const da = Math.abs(Math.log(gravityRatio(a)));
  const db = Math.abs(Math.log(gravityRatio(b)));
  return db - da;
});
