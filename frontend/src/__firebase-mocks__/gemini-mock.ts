// Cloud Function handlers for the mocked build. Registers responses for
// every callable BoletApp invokes. Imported once at app start (from
// __firebase-mocks__/seed/bootstrap.ts) so handlers are available before
// any feature code calls httpsCallable().
//
// Eight scan-outcome variants are wired:
//   - 'happy'                    → canned Jumbo receipt, high confidence
//   - 'warning'                  → low-confidence receipt + total mismatch
//   - 'error'                    → generic backend failure (code: 'internal')
//   - 'error-no-credits'         → insufficient-credits failure (code: 'failed-precondition')
//   - 'error-rate-limit'         → rate-limit failure (code: 'resource-exhausted')
//   - 'currency-mismatch'        → receipt in USD when user default is CLP
//   - 'unknown-merchant'         → first-scan-from-this-place flow
//   - 'low-confidence-coerced'   → null/missing fields coerced to placeholders
// Switch via window.__mockScanOutcome (also exposed as window.gastifyMock.setScanOutcome).
//
// Verbose logs to console when import.meta.env.DEV — search for [mock scan].

import { registerCallable } from './functions';
import { Timestamp } from './firestore';
import { firestoreStore } from './lib/firestore-store';
import {
  getActiveScanFixture,
  getFixtureByKey,
  setActiveScanFixture,
  listScanFixtures,
  type ScanFixture,
  type FixtureKey,
} from './seed/scan-responses';

interface AnalyzeReceiptRequest {
  images: string[];
  currency?: string;
  receiptType?: string;
  isRescan?: boolean;
}

interface QueueReceiptScanRequest {
  scanId: string;
  imageUrls: string[];
  currency?: string;
  receiptType?: string;
}

interface QueueReceiptScanResponse {
  scanId: string;
  processingDeadline: string;
}

export type ScanOutcome =
  | 'happy'
  | 'warning'
  | 'error'
  | 'error-no-credits'
  | 'error-rate-limit'
  | 'currency-mismatch'
  | 'unknown-merchant'
  | 'low-confidence-coerced';

// Map outcomes that resolve to a fixture (i.e. the success-shaped flows) onto
// their fixture key. Outcomes that produce errors don't appear here — the
// handlers throw before any fixture is consulted.
const OUTCOME_FIXTURE_MAP: Partial<Record<ScanOutcome, FixtureKey>> = {
  happy: 'jumbo',
  warning: 'warning-discrepancy',
  'currency-mismatch': 'usd-target-store',
  'unknown-merchant': 'unknown-merchant',
  'low-confidence-coerced': 'low-confidence-coerced',
};

// Errors thrown by the mock handlers carry a Firebase-callable-style `code`
// property. `services/gemini.ts` already differentiates on these codes
// (resource-exhausted → "Too many requests..."; everything else falls
// through to the message text).
const ERROR_OUTCOMES: Partial<Record<ScanOutcome, { code: string; message: string }>> = {
  error: {
    code: 'internal',
    message: 'Mock scan failed: simulated Gemini error',
  },
  'error-no-credits': {
    code: 'failed-precondition',
    message: 'No tienes créditos suficientes para escanear. Compra más o espera al próximo mes.',
  },
  'error-rate-limit': {
    code: 'resource-exhausted',
    message: 'Demasiadas solicitudes. Espera un momento e intenta de nuevo.',
  },
};

const PROCESSING_DELAY_MS = 1500;
const PROCESSING_DEADLINE_MS = 60_000;

const PLACEHOLDER_THUMBNAIL = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'><rect width='120' height='120' fill='%23f5f0e8'/><text x='60' y='65' text-anchor='middle' fill='%232d3a4a' font-family='monospace' font-size='14'>boleta</text></svg>`,
)}`;

function fixtureToTransaction(fixture: ScanFixture, imageUrls: string[]): Record<string, unknown> {
  const date = new Date(fixture.date);
  return {
    transactionId: `mock-tx-${Date.now()}`,
    merchant: fixture.merchant,
    date: date.toISOString(),
    total: fixture.total,
    category: fixture.category,
    items: fixture.items,
    currency: fixture.currency,
    country: fixture.country,
    city: fixture.city,
    imageUrls,
    thumbnailUrl: PLACEHOLDER_THUMBNAIL,
    promptVersion: fixture.promptVersion,
    merchantSource: fixture.merchantSource,
    receiptType: fixture.receiptType,
    confidence: fixture.confidence,
  };
}

function getCurrentUserId(): string {
  type WithAuthDebug = Window & { __mockAuthCurrentUid?: string };
  const w = (typeof window === 'undefined' ? {} : window) as WithAuthDebug;
  return w.__mockAuthCurrentUid ?? 'alice-uid';
}

function getOutcome(): ScanOutcome {
  type WithMock = Window & { __mockScanOutcome?: ScanOutcome };
  const w = (typeof window === 'undefined' ? {} : window) as WithMock;
  return w.__mockScanOutcome ?? 'happy';
}

function logMock(...args: unknown[]): void {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.info('[mock scan]', ...args);
  }
}

// analyzeReceipt — synchronous path used for re-scans
registerCallable<AnalyzeReceiptRequest, ReturnType<typeof fixtureToTransaction>>(
  'analyzeReceipt',
  async (req) => {
    const outcome = getOutcome();
    logMock('analyzeReceipt called', { outcome, imageCount: req.images.length });
    const errSpec = ERROR_OUTCOMES[outcome];
    if (errSpec) {
      await delay(PROCESSING_DELAY_MS);
      const err: Error & { code?: string } = new Error(errSpec.message);
      err.code = errSpec.code;
      logMock('analyzeReceipt throwing error', { outcome, code: errSpec.code });
      throw err;
    }
    await delay(PROCESSING_DELAY_MS);
    const fixtureKey = OUTCOME_FIXTURE_MAP[outcome];
    const fixture = fixtureKey ? getFixtureByKey(fixtureKey) : getActiveScanFixture();
    const tx = fixtureToTransaction(fixture, req.images);
    logMock('analyzeReceipt resolved', { outcome, merchant: tx.merchant, total: tx.total });
    return tx;
  },
);

// queueReceiptScan — async pipeline.
//
// The legacy app subscribes to `pending_scans/{scanId}` and waits for the
// status to flip from 'processing' to 'completed'. The real backend has a
// Cloud Function trigger doing the work. In the mock we don't have a
// trigger, so we write the *final* status immediately. The subscription
// fires once the React effect attaches, sees the doc, and continues.
//
// We resolve the queue promise on a small delay (PROCESSING_DELAY_MS) so
// the legacy spinner overlay still gets a moment to appear before the
// caller's `await` resumes — that lets the user see the "Procesando…"
// state without depending on setTimer paths inside the mock pipeline.
registerCallable<QueueReceiptScanRequest, QueueReceiptScanResponse>(
  'queueReceiptScan',
  async (req) => {
    const outcome = getOutcome();
    const scanId = req.scanId;
    const imageUrls = req.imageUrls.length > 0 ? req.imageUrls : ['mock://image-0'];
    const userId = getCurrentUserId();
    const processingDeadline = new Date(Date.now() + PROCESSING_DEADLINE_MS).toISOString();

    logMock('queueReceiptScan called', { scanId, outcome, userId, imageUrlCount: imageUrls.length });

    const errSpec = ERROR_OUTCOMES[outcome];
    if (errSpec) {
      // Throw a Firebase-functions-style error so the legacy queueScanFromImages
      // catch block hits the toast + overlayError path. Writing a `failed`
      // pending_scans doc is a non-starter because App.tsx silently deletes
      // those on detect (line ~692) — the user would never see anything.
      logMock('queueReceiptScan throwing error', { scanId, code: errSpec.code });
      const err = new Error(errSpec.message) as Error & { code: string };
      err.code = errSpec.code;
      throw err;
    } else {
      // Resolve the success-shaped outcome to its fixture. 'warning' picks a
      // fixture whose items don't sum to the total — the legacy
      // reconcileItemsTotal flags this and the editor surfaces it.
      const fixtureKey: FixtureKey = OUTCOME_FIXTURE_MAP[outcome] ?? 'jumbo';
      const fixture = getFixtureByKey(fixtureKey);
      const result = fixtureToTransaction(fixture, imageUrls);
      await firestoreStore.setDoc(`pending_scans/${scanId}`, {
        scanId,
        userId,
        status: 'completed',
        imageUrls,
        processingDeadline: Timestamp.fromMillis(Date.now() + PROCESSING_DEADLINE_MS),
        createdAt: Timestamp.now(),
        creditDeducted: true,
        receiptType: req.receiptType,
        result,
      });
      logMock('queueReceiptScan wrote COMPLETED', {
        scanId,
        outcome,
        merchant: (result as { merchant: string }).merchant,
      });
    }

    return { scanId, processingDeadline };
  },
);

// Web push — no-ops; subscribed token is logged so we know the call ran.
registerCallable('saveWebPushSubscription', () => {
  return { success: true, message: '[mock] web push subscription saved' };
});
registerCallable('deleteWebPushSubscription', () => {
  return { success: true, message: '[mock] web push subscription deleted' };
});

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Dev console helper — toggle scan outcome & fixture from anywhere.
type WithMockNamespace = Window & {
  gastifyMock?: {
    setScanOutcome: (outcome: ScanOutcome) => void;
    getScanOutcome: () => ScanOutcome;
    setScanFixture: (key: FixtureKey) => void;
    listScanFixtures: () => FixtureKey[];
  };
  __mockScanOutcome?: ScanOutcome;
};

if (typeof window !== 'undefined') {
  const w = window as WithMockNamespace;
  w.gastifyMock = {
    setScanOutcome: (outcome: ScanOutcome) => {
      w.__mockScanOutcome = outcome;
      logMock('outcome set to', outcome);
    },
    getScanOutcome: () => w.__mockScanOutcome ?? 'happy',
    setScanFixture: (key) => {
      setActiveScanFixture(key);
      logMock('fixture set to', key);
    },
    listScanFixtures: () => listScanFixtures(),
  };
  // Default outcome
  if (!w.__mockScanOutcome) w.__mockScanOutcome = 'happy';
  logMock('handlers registered. window.gastifyMock is available.');
}
