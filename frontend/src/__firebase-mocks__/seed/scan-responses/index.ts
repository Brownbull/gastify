// Canned scan-response fixtures. The active fixture is selected by name
// from a global window flag (set by the dev console or Tweaks panel) so we
// can switch what the mock pipeline returns without redeploying.

import jumbo from './jumbo-3-items.json';
import restaurant from './restaurant-2-items.json';
import warningDiscrepancy from './warning-discrepancy.json';
import usdTargetStore from './usd-target-store.json';
import unknownMerchant from './unknown-merchant.json';
import lowConfidenceCoerced from './low-confidence-coerced.json';

export interface ScanFixture {
  merchant: string;
  date: string;
  category: string;
  total: number;
  currency: string;
  country?: string;
  city?: string;
  merchantSource: 'scan';
  promptVersion: string;
  receiptType?: string;
  confidence?: number;
  items: Array<{
    name: string;
    qty?: number;
    unitPrice?: number;
    totalPrice: number;
    category?: string;
    subcategory?: string;
  }>;
}

const FIXTURES: Record<string, ScanFixture> = {
  jumbo: jumbo as ScanFixture,
  restaurant: restaurant as ScanFixture,
  'warning-discrepancy': warningDiscrepancy as ScanFixture,
  'usd-target-store': usdTargetStore as ScanFixture,
  'unknown-merchant': unknownMerchant as ScanFixture,
  'low-confidence-coerced': lowConfidenceCoerced as ScanFixture,
};

export type FixtureKey = keyof typeof FIXTURES;

let activeFixture: FixtureKey = 'jumbo';

export function setActiveScanFixture(key: FixtureKey): void {
  if (!(key in FIXTURES)) {
    throw new Error(`[gemini mock] unknown scan fixture: ${key}`);
  }
  activeFixture = key;
}

export function getActiveScanFixture(): ScanFixture {
  return resolveFixture(FIXTURES[activeFixture]);
}

export function getFixtureByKey(key: FixtureKey): ScanFixture {
  const f = FIXTURES[key];
  if (!f) throw new Error(`[gemini mock] unknown scan fixture: ${key}`);
  return resolveFixture(f);
}

export function listScanFixtures(): FixtureKey[] {
  return Object.keys(FIXTURES) as FixtureKey[];
}

// Resolve placeholders like {{TODAY}} so canned data feels current without
// the JSON source needing to be rewritten.
function resolveFixture(raw: ScanFixture): ScanFixture {
  return {
    ...raw,
    date: raw.date === '{{TODAY}}' ? new Date().toISOString() : raw.date,
  };
}
