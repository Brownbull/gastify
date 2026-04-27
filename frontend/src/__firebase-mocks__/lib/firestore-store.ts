// In-memory document store with IndexedDB-backed persistence. The Firestore
// shim delegates all CRUD + queries here. Storage layout: a flat
// Map<docPath, data> where docPath is a slash-separated string.

import { get as idbGet, set as idbSet, del as idbDel, clear as idbClear } from 'idb-keyval';

interface QuerySpec {
  path: string;
  filters: Array<{ field: string; op: string; value: unknown }>;
  orders: Array<{ field: string; direction: 'asc' | 'desc' }>;
  limit?: number;
}

const PERSIST_PREFIX = 'gastify-mock-firestore:';

type SubscriberFn = () => void;

interface ScopedSubscriber {
  fn: SubscriberFn;
  // Path prefix the subscriber cares about. Writes outside this prefix
  // do not fire the callback. Empty string matches everything (legacy
  // subscribe() callers without a prefix).
  prefix: string;
}

class FirestoreStore {
  private docs = new Map<string, Record<string, unknown>>();
  private subscribers = new Set<ScopedSubscriber>();
  private booted = false;
  private bootPromise: Promise<void> | null = null;
  // Pending notifications — coalesced and dispatched once per macrotask so
  // that a burst of writes (seed bootstrap, scan completion) doesn't block
  // the JS thread firing every subscriber synchronously inside setDoc.
  private pendingPaths = new Set<string>();
  private flushScheduled = false;

  // Lazy load from IndexedDB on first access. Subsequent calls await the
  // same promise so callers don't race the bootstrap.
  private ensureBooted(): Promise<void> {
    if (this.booted) return Promise.resolve();
    if (!this.bootPromise) {
      this.bootPromise = this.bootstrap();
    }
    return this.bootPromise;
  }

  private async bootstrap(): Promise<void> {
    try {
      const stored = await idbGet<Record<string, Record<string, unknown>>>(`${PERSIST_PREFIX}snapshot`);
      if (stored) {
        for (const [path, data] of Object.entries(stored)) {
          this.docs.set(path, data);
        }
      }
    } catch {
      // No-op — starting empty is fine
    }
    this.booted = true;
  }

  private async persist(): Promise<void> {
    const snapshot: Record<string, Record<string, unknown>> = {};
    for (const [path, data] of this.docs) snapshot[path] = data;
    try {
      await idbSet(`${PERSIST_PREFIX}snapshot`, snapshot);
    } catch {
      // Storage quota or browser-private mode — continue in-memory only
    }
  }

  generateId(): string {
    // 20-char base62-ish — close enough to Firestore's auto-id format
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id = '';
    for (let i = 0; i < 20; i++) {
      id += chars[Math.floor(Math.random() * chars.length)];
    }
    return id;
  }

  async getDoc<T>(path: string): Promise<T | undefined> {
    await this.ensureBooted();
    const raw = this.docs.get(path);
    return raw as T | undefined;
  }

  async setDoc(path: string, data: Record<string, unknown>): Promise<void> {
    await this.ensureBooted();
    this.docs.set(path, data);
    if (!isEphemeralPath(path)) await this.persist();
    this.notify(path);
  }

  async deleteDoc(path: string): Promise<void> {
    await this.ensureBooted();
    this.docs.delete(path);
    if (!isEphemeralPath(path)) await this.persist();
    this.notify(path);
  }

  async queryDocs(spec: QuerySpec): Promise<Array<{ id: string; data: Record<string, unknown> }>> {
    await this.ensureBooted();
    const collectionPath = spec.path.replace(/\/+$/, '');
    const collectionPrefix = `${collectionPath}/`;
    const collectionDepth = collectionPath.split('/').length + 1;

    const matches: Array<{ id: string; data: Record<string, unknown> }> = [];
    for (const [docPath, data] of this.docs) {
      if (!docPath.startsWith(collectionPrefix)) continue;
      // Only direct children — not subcollection docs
      if (docPath.split('/').length !== collectionDepth) continue;
      if (!this.matchesFilters(data, spec.filters)) continue;
      const id = docPath.slice(collectionPrefix.length);
      matches.push({ id, data });
    }

    if (spec.orders.length > 0) {
      matches.sort((a, b) => {
        for (const o of spec.orders) {
          const av = a.data[o.field];
          const bv = b.data[o.field];
          const cmp = compareValues(av, bv);
          if (cmp !== 0) return o.direction === 'asc' ? cmp : -cmp;
        }
        return 0;
      });
    }

    if (spec.limit !== undefined) {
      return matches.slice(0, spec.limit);
    }
    return matches;
  }

  private matchesFilters(
    data: Record<string, unknown>,
    filters: Array<{ field: string; op: string; value: unknown }>,
  ): boolean {
    for (const f of filters) {
      const fieldValue = getField(data, f.field);
      if (!evalFilter(fieldValue, f.op, f.value)) return false;
    }
    return true;
  }

  subscribe(fn: SubscriberFn, prefix = ''): () => void {
    const sub: ScopedSubscriber = { fn, prefix };
    this.subscribers.add(sub);
    return () => {
      this.subscribers.delete(sub);
    };
  }

  // Mark a path as changed and schedule a single coalesced flush. Writes
  // never block on subscriber callbacks; flushes happen on the next
  // macrotask so React renders + further writes don't recurse.
  private notify(changedPath: string): void {
    this.pendingPaths.add(changedPath);
    if (this.flushScheduled) return;
    this.flushScheduled = true;
    setTimeout(() => this.flush(), 0);
  }

  private flush(): void {
    this.flushScheduled = false;
    const paths = Array.from(this.pendingPaths);
    this.pendingPaths.clear();
    if (paths.length === 0) return;
    // Iterate a subscriber snapshot so unsubscribes during dispatch are safe.
    const subs = Array.from(this.subscribers);
    for (const sub of subs) {
      const matches = paths.some((p) => !sub.prefix || p.startsWith(sub.prefix));
      if (!matches) continue;
      try {
        sub.fn();
      } catch {
        // Silent — a misbehaving subscriber must not poison the bus.
      }
    }
  }

  async clear(): Promise<void> {
    this.docs.clear();
    try {
      await idbDel(`${PERSIST_PREFIX}snapshot`);
    } catch {
      await idbClear();
    }
    this.notify('');
  }

  // Phase A seeding hook — called by the seed bootstrap to load initial fixtures.
  async seed(seedDocs: Record<string, Record<string, unknown>>, options: { overwrite?: boolean } = {}): Promise<void> {
    await this.ensureBooted();
    let changed = false;
    for (const [path, data] of Object.entries(seedDocs)) {
      if (options.overwrite || !this.docs.has(path)) {
        this.docs.set(path, data);
        changed = true;
      }
    }
    if (changed) {
      await this.persist();
      this.notify('');
    }
  }
}

// Paths that should not be persisted across reload — keeps the IndexedDB
// snapshot clean of in-flight scan state.
function isEphemeralPath(path: string): boolean {
  return path.startsWith('pending_scans/');
}

function getField(data: Record<string, unknown>, field: string): unknown {
  if (!field.includes('.')) return data[field];
  let cursor: unknown = data;
  for (const part of field.split('.')) {
    if (cursor && typeof cursor === 'object') {
      cursor = (cursor as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return cursor;
}

function compareValues(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a === undefined || a === null) return -1;
  if (b === undefined || b === null) return 1;
  // Timestamp-like
  if (typeof a === 'object' && a !== null && 'seconds' in a && typeof b === 'object' && b !== null && 'seconds' in b) {
    const as = (a as { seconds: number; nanoseconds: number }).seconds;
    const bs = (b as { seconds: number; nanoseconds: number }).seconds;
    if (as !== bs) return as - bs;
    const an = (a as { seconds: number; nanoseconds: number }).nanoseconds;
    const bn = (b as { seconds: number; nanoseconds: number }).nanoseconds;
    return an - bn;
  }
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'string' && typeof b === 'string') return a.localeCompare(b);
  return 0;
}

function evalFilter(fieldValue: unknown, op: string, target: unknown): boolean {
  switch (op) {
    case '==':
      return deepEqual(fieldValue, target);
    case '!=':
      return !deepEqual(fieldValue, target);
    case '<':
      return compareValues(fieldValue, target) < 0;
    case '<=':
      return compareValues(fieldValue, target) <= 0;
    case '>':
      return compareValues(fieldValue, target) > 0;
    case '>=':
      return compareValues(fieldValue, target) >= 0;
    case 'in':
      return Array.isArray(target) && target.some((t) => deepEqual(fieldValue, t));
    case 'not-in':
      return Array.isArray(target) && !target.some((t) => deepEqual(fieldValue, t));
    case 'array-contains':
      return Array.isArray(fieldValue) && fieldValue.some((v) => deepEqual(v, target));
    case 'array-contains-any':
      return Array.isArray(fieldValue) && Array.isArray(target) && fieldValue.some((v) => target.some((t) => deepEqual(v, t)));
    default:
      return false;
  }
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object') return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => deepEqual(v, b[i]));
  }
  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;
  const keys = new Set([...Object.keys(aObj), ...Object.keys(bObj)]);
  for (const k of keys) {
    if (!deepEqual(aObj[k], bObj[k])) return false;
  }
  return true;
}

// Pin the singleton to globalThis so module duplication (Vite serving the
// same source under multiple URLs — relative vs absolute, with vs without
// `.ts` — does not produce two stores. Every `firestoreStore` import reads
// the same instance.
const GLOBAL_KEY = '__gastifyMockFirestoreStore__';
type WithStore = typeof globalThis & { [GLOBAL_KEY]?: FirestoreStore };
const g = globalThis as WithStore;
if (!g[GLOBAL_KEY]) {
  g[GLOBAL_KEY] = new FirestoreStore();
}
export const firestoreStore: FirestoreStore = g[GLOBAL_KEY];
