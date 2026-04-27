// Seed bootstrap — populates the mock Firestore with realistic transactions
// so the Dashboard renders something on first load.
//
// SEED_VERSION marks the shape of the bundled fixtures. When you change the
// seed (rename categories, add fields, swap fixtures), bump the version. On
// next load the bootstrap notices the mismatch and forces a full reseed,
// overwriting the previous IndexedDB snapshot for seed paths and category
// mappings. User-saved transactions persist across versions; only seeded
// rows + transient mappings are wiped.
import { firestoreStore } from '../lib/firestore-store';
import { Timestamp } from '../firestore';
// Side-effect import — registers Cloud Function handlers (analyzeReceipt,
// queueReceiptScan, saveWebPushSubscription, deleteWebPushSubscription) so
// httpsCallable() resolves to canned responses instead of failing.
import '../gemini-mock';
import { installScanCasePicker } from '../scan-case-picker';

installScanCasePicker();
import seedTransactions from './transactions.json';
import seedPreferences from './preferences.json';
import seedCredits from './credits.json';
import seedNotifications from './notifications.json';

const APP_ID = 'gastify-mock';
const TEST_USERS = ['alice-uid', 'bob-uid', 'charlie-uid', 'diana-uid'];

// Bump on any breaking change to seed JSON shape (category codes, item
// codes, transaction structure). Bump triggers a force-reseed on next load.
const SEED_VERSION = 'v2-english-codes-2026-04-27';
const SEED_VERSION_PATH = '_meta/seed';

interface RawTransaction {
  id: string;
  date: string; // ISO date string
  merchant: string;
  category: string;
  total: number;
  items: Array<{ name: string; qty?: number; unitPrice?: number; totalPrice: number; category?: string }>;
  imageUrls?: string[];
  thumbnailUrl?: string;
}

function deriveTransactionDoc(raw: RawTransaction): Record<string, unknown> {
  const date = new Date(raw.date);
  const isoDay = date.toISOString().slice(0, 10); // YYYY-MM-DD
  const month = isoDay.slice(0, 7); // YYYY-MM
  const year = isoDay.slice(0, 4);
  const quarter = `${year}-Q${Math.floor(date.getMonth() / 3) + 1}`;
  // ISO week
  const ws = new Date(date);
  ws.setUTCHours(0, 0, 0, 0);
  ws.setUTCDate(ws.getUTCDate() + 4 - (ws.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(ws.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((ws.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  const week = `${ws.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;

  return {
    id: raw.id,
    date: raw.date,
    merchant: raw.merchant,
    category: raw.category,
    total: raw.total,
    items: raw.items,
    imageUrls: raw.imageUrls ?? [],
    thumbnailUrl: raw.thumbnailUrl,
    periods: { day: isoDay, week, month, quarter, year },
    currency: 'CLP',
    createdAt: Timestamp.fromDate(date),
    updatedAt: Timestamp.fromDate(date),
    version: 1,
    source: 'scan',
  };
}

interface RawNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  [k: string]: unknown;
}

async function seedUser(userId: string, overwrite: boolean): Promise<void> {
  const seedDocs: Record<string, Record<string, unknown>> = {};
  for (const tx of seedTransactions as RawTransaction[]) {
    const path = `artifacts/${APP_ID}/users/${userId}/transactions/${tx.id}`;
    seedDocs[path] = deriveTransactionDoc(tx);
  }
  for (const notif of seedNotifications as RawNotification[]) {
    const { id, createdAt, ...rest } = notif;
    seedDocs[`artifacts/${APP_ID}/users/${userId}/notifications/${id}`] = {
      ...rest,
      createdAt: Timestamp.fromDate(new Date(createdAt)),
    };
  }
  // Preferences and credits are single docs at known paths
  seedDocs[`artifacts/${APP_ID}/users/${userId}/preferences/settings`] = seedPreferences;
  seedDocs[`artifacts/${APP_ID}/users/${userId}/credits/balance`] = seedCredits;

  await firestoreStore.seed(seedDocs, { overwrite });
}

// Wipes paths that depend on the seed shape — category mappings, merchant
// mappings, item-name mappings — so a stale Spanish-keyed mapping from a
// previous seed version doesn't poison the new one. User-edited transactions
// (outside the seed-tx-* prefix) survive.
async function wipeStaleMappingsAndStaleSeedDocs(): Promise<void> {
  const docs = (firestoreStore as unknown as { docs: Map<string, unknown> }).docs;
  const toDelete: string[] = [];
  for (const path of docs.keys()) {
    if (
      path.includes('/category_mappings/') ||
      path.includes('/merchant_mappings/') ||
      path.includes('/subcategory_mappings/') ||
      path.includes('/item_name_mappings/') ||
      path.includes('/notifications/seed-notif-')
    ) {
      toDelete.push(path);
    }
    // Stale seed transactions from prior version
    if (path.includes('/transactions/seed-tx-')) {
      toDelete.push(path);
    }
  }
  for (const path of toDelete) {
    await firestoreStore.deleteDoc(path);
  }
}

async function runBootstrap(): Promise<void> {
  // Per-version metadata path — held outside any test user's tree.
  const meta = await firestoreStore.getDoc<{ version?: string }>(SEED_VERSION_PATH);
  const isMismatch = !meta || meta.version !== SEED_VERSION;

  if (isMismatch) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.info('[mock seed] version mismatch — forcing reseed', {
        previous: meta?.version ?? null,
        next: SEED_VERSION,
      });
    }
    await wipeStaleMappingsAndStaleSeedDocs();
  }

  await Promise.all(TEST_USERS.map((u) => seedUser(u, isMismatch)));
  await firestoreStore.setDoc(SEED_VERSION_PATH, { version: SEED_VERSION, updatedAt: Date.now() });

  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.info('[mock seed] fixtures loaded', { users: TEST_USERS, version: SEED_VERSION });
  }
}

void runBootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[mock seed] failed to load fixtures', err);
});

// Dev console helper — wipe everything and reseed.
type WithReset = Window & {
  gastifyMock?: {
    resetData?: () => Promise<void>;
    [k: string]: unknown;
  };
};
if (typeof window !== 'undefined') {
  const w = window as WithReset;
  if (!w.gastifyMock) w.gastifyMock = {};
  w.gastifyMock.resetData = async () => {
    await firestoreStore.clear();
    await runBootstrap();
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.info('[mock seed] resetData done — refresh page to see clean state');
    }
  };
}
