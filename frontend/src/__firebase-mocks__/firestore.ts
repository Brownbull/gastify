// Shim for `firebase/firestore` — in-memory document store with localStorage
// persistence. Implements the slice of the modular SDK BoletApp uses:
//   - doc, getDoc, addDoc, setDoc, updateDoc, deleteDoc
//   - collection, query, where, orderBy, limit, startAfter
//   - getDocs, onSnapshot (polling-based subscription)
//   - serverTimestamp, increment, arrayUnion, arrayRemove
//   - runTransaction, writeBatch (naive — single-threaded JS, no real
//     contention)
//   - Timestamp class with Firestore semantics
//
// Phase A goal is a *working* surface, not a perfect Firestore replica.
// Anything we discover we need at runtime gets added here.
import type { FirebaseApp } from './app';
import { firestoreStore } from './lib/firestore-store';

export type Unsubscribe = () => void;

export class Timestamp {
  constructor(public readonly seconds: number, public readonly nanoseconds: number) {}
  static now(): Timestamp {
    const now = Date.now();
    return new Timestamp(Math.floor(now / 1000), (now % 1000) * 1_000_000);
  }
  static fromDate(date: Date): Timestamp {
    const ms = date.getTime();
    return new Timestamp(Math.floor(ms / 1000), (ms % 1000) * 1_000_000);
  }
  static fromMillis(ms: number): Timestamp {
    return new Timestamp(Math.floor(ms / 1000), (ms % 1000) * 1_000_000);
  }
  toDate(): Date {
    return new Date(this.toMillis());
  }
  toMillis(): number {
    return this.seconds * 1000 + Math.floor(this.nanoseconds / 1_000_000);
  }
  isEqual(other: Timestamp): boolean {
    return this.seconds === other.seconds && this.nanoseconds === other.nanoseconds;
  }
  toJSON(): { seconds: number; nanoseconds: number } {
    return { seconds: this.seconds, nanoseconds: this.nanoseconds };
  }
  valueOf(): string {
    return `${this.seconds}.${String(this.nanoseconds).padStart(9, '0')}`;
  }
}

export class FieldValue {
  constructor(public readonly _kind: string, public readonly _operand?: unknown) {}
}

export function serverTimestamp(): FieldValue {
  return new FieldValue('serverTimestamp');
}
export function increment(n: number): FieldValue {
  return new FieldValue('increment', n);
}
export function arrayUnion(...values: unknown[]): FieldValue {
  return new FieldValue('arrayUnion', values);
}
export function arrayRemove(...values: unknown[]): FieldValue {
  return new FieldValue('arrayRemove', values);
}
export function deleteField(): FieldValue {
  return new FieldValue('deleteField');
}

export interface Firestore {
  app: FirebaseApp;
  type: 'firestore';
}

export interface DocumentData {
  [field: string]: unknown;
}

export interface DocumentReference<T = DocumentData> {
  id: string;
  path: string;
  parent: CollectionReference<T>;
  firestore: Firestore;
  type: 'document';
  withConverter: (converter: unknown) => DocumentReference<T>;
}

export interface CollectionReference<T = DocumentData> {
  id: string;
  path: string;
  parent: DocumentReference | null;
  firestore: Firestore;
  type: 'collection';
  withConverter: (converter: unknown) => CollectionReference<T>;
}

export interface Query<T = DocumentData> {
  firestore: Firestore;
  type: 'query';
  _path: string;
  _filters: WhereFilter[];
  _orders: OrderClause[];
  _limit?: number;
  _startAfter?: DocumentSnapshot<T>;
}

interface WhereFilter {
  field: string;
  op: WhereFilterOp;
  value: unknown;
}

interface OrderClause {
  field: string;
  direction: 'asc' | 'desc';
}

export type WhereFilterOp =
  | '<'
  | '<='
  | '=='
  | '!='
  | '>='
  | '>'
  | 'in'
  | 'not-in'
  | 'array-contains'
  | 'array-contains-any';

export interface DocumentSnapshot<T = DocumentData> {
  id: string;
  ref: DocumentReference<T>;
  exists: () => boolean;
  data: () => T | undefined;
  get: (field: string) => unknown;
  metadata: { hasPendingWrites: boolean; fromCache: boolean };
}

export type QueryDocumentSnapshot<T = DocumentData> = DocumentSnapshot<T> & {
  data: () => T;
  exists: () => true;
};

export interface QuerySnapshot<T = DocumentData> {
  docs: QueryDocumentSnapshot<T>[];
  size: number;
  empty: boolean;
  forEach: (cb: (doc: QueryDocumentSnapshot<T>) => void) => void;
  metadata: { hasPendingWrites: boolean; fromCache: boolean };
  docChanges: () => Array<{ type: 'added' | 'modified' | 'removed'; doc: QueryDocumentSnapshot<T> }>;
}

let cachedFirestore: Firestore | null = null;

export function getFirestore(app?: FirebaseApp): Firestore {
  if (cachedFirestore) return cachedFirestore;
  cachedFirestore = {
    app: app ?? ({ name: '[DEFAULT]', options: {}, automaticDataCollectionEnabled: false } as FirebaseApp),
    type: 'firestore',
  };
  return cachedFirestore;
}

export function initializeFirestore(app: FirebaseApp, _settings?: unknown): Firestore {
  return getFirestore(app);
}

export function persistentLocalCache(_settings?: unknown): { kind: 'persistent' } {
  return { kind: 'persistent' };
}
export function persistentMultipleTabManager(): { kind: 'multi-tab' } {
  return { kind: 'multi-tab' };
}
export function memoryLocalCache(): { kind: 'memory' } {
  return { kind: 'memory' };
}

function joinPath(...parts: string[]): string {
  return parts.filter(Boolean).join('/').replace(/\/+/g, '/');
}

function makeDocRef<T>(firestore: Firestore, path: string): DocumentReference<T> {
  const segments = path.split('/');
  const id = segments[segments.length - 1];
  const parentPath = segments.slice(0, -1).join('/');
  const ref: DocumentReference<T> = {
    id,
    path,
    firestore,
    type: 'document',
    parent: null as unknown as CollectionReference<T>,
    withConverter: () => ref,
  };
  ref.parent = makeColRef<T>(firestore, parentPath);
  return ref;
}

function makeColRef<T>(firestore: Firestore, path: string): CollectionReference<T> {
  const segments = path.split('/').filter(Boolean);
  const id = segments[segments.length - 1] ?? '';
  const parentPath = segments.slice(0, -1).join('/');
  const ref: CollectionReference<T> = {
    id,
    path,
    firestore,
    type: 'collection',
    parent: parentPath
      ? makeDocRef<DocumentData>(firestore, parentPath) as DocumentReference
      : null,
    withConverter: () => ref,
  };
  return ref;
}

export function doc(
  firestoreOrParent: Firestore | DocumentReference | CollectionReference,
  ...pathSegments: string[]
): DocumentReference {
  if ((firestoreOrParent as Firestore).type === 'firestore') {
    const fs = firestoreOrParent as Firestore;
    return makeDocRef(fs, joinPath(...pathSegments));
  }
  if ((firestoreOrParent as CollectionReference).type === 'collection') {
    const col = firestoreOrParent as CollectionReference;
    const id = pathSegments[0] ?? firestoreStore.generateId();
    return makeDocRef(col.firestore, joinPath(col.path, id));
  }
  // DocumentReference parent
  const parent = firestoreOrParent as DocumentReference;
  return makeDocRef(parent.firestore, joinPath(parent.path, ...pathSegments));
}

export function collection(
  firestoreOrParent: Firestore | DocumentReference | CollectionReference,
  ...pathSegments: string[]
): CollectionReference {
  if ((firestoreOrParent as Firestore).type === 'firestore') {
    const fs = firestoreOrParent as Firestore;
    return makeColRef(fs, joinPath(...pathSegments));
  }
  if ((firestoreOrParent as DocumentReference).type === 'document') {
    const docRef = firestoreOrParent as DocumentReference;
    return makeColRef(docRef.firestore, joinPath(docRef.path, ...pathSegments));
  }
  const col = firestoreOrParent as CollectionReference;
  return makeColRef(col.firestore, joinPath(col.path, ...pathSegments));
}

export function query<T>(
  base: CollectionReference<T> | Query<T>,
  ...constraints: QueryConstraint[]
): Query<T> {
  const baseQuery: Query<T> =
    'type' in base && base.type === 'query'
      ? base
      : { firestore: base.firestore, type: 'query', _path: base.path, _filters: [], _orders: [], _limit: undefined, _startAfter: undefined };
  const q: Query<T> = {
    ...baseQuery,
    _filters: [...baseQuery._filters],
    _orders: [...baseQuery._orders],
  };
  for (const c of constraints) c.apply(q);
  return q;
}

export interface QueryConstraint {
  apply: (q: Query) => void;
}

export function where(field: string, op: WhereFilterOp, value: unknown): QueryConstraint {
  return { apply: (q) => q._filters.push({ field, op, value }) };
}
export function orderBy(field: string, direction: 'asc' | 'desc' = 'asc'): QueryConstraint {
  return { apply: (q) => q._orders.push({ field, direction }) };
}
export function limit(n: number): QueryConstraint {
  return { apply: (q) => (q._limit = n) };
}
export function startAfter<T>(snapshot: DocumentSnapshot<T>): QueryConstraint {
  return { apply: (q) => (q._startAfter = snapshot as DocumentSnapshot) };
}

function snapshotFor<T>(firestore: Firestore, path: string, raw: T | undefined): DocumentSnapshot<T> {
  const ref = makeDocRef<T>(firestore, path);
  return {
    id: ref.id,
    ref,
    exists: () => raw !== undefined,
    data: () => raw,
    get: (field: string) => (raw ? (raw as DocumentData)[field] : undefined),
    metadata: { hasPendingWrites: false, fromCache: false },
  };
}

export async function getDoc<T>(reference: DocumentReference<T>): Promise<DocumentSnapshot<T>> {
  const raw = await firestoreStore.getDoc<T>(reference.path);
  return snapshotFor(reference.firestore, reference.path, raw);
}

export async function getDocs<T>(queryOrCol: Query<T> | CollectionReference<T>): Promise<QuerySnapshot<T>> {
  const docs = await firestoreStore.queryDocs(queryToSpec(queryOrCol));
  const fs = queryOrCol.firestore;
  const path = (queryOrCol as Query<T>)._path ?? (queryOrCol as CollectionReference<T>).path;
  const snapshots = docs.map((d) => {
    const docPath = `${path}/${d.id}`;
    const ref = makeDocRef<T>(fs, docPath);
    return {
      id: d.id,
      ref,
      exists: () => true as const,
      data: () => d.data as T,
      get: (field: string) => (d.data as DocumentData)[field],
      metadata: { hasPendingWrites: false, fromCache: false },
    } as QueryDocumentSnapshot<T>;
  });
  return {
    docs: snapshots,
    size: snapshots.length,
    empty: snapshots.length === 0,
    forEach: (cb) => snapshots.forEach(cb),
    metadata: { hasPendingWrites: false, fromCache: false },
    docChanges: () => snapshots.map((doc) => ({ type: 'added' as const, doc })),
  };
}

function queryToSpec(q: Query | CollectionReference): {
  path: string;
  filters: WhereFilter[];
  orders: OrderClause[];
  limit?: number;
} {
  if ((q as Query)._filters !== undefined) {
    const query = q as Query;
    return { path: query._path, filters: query._filters, orders: query._orders, limit: query._limit };
  }
  return { path: (q as CollectionReference).path, filters: [], orders: [] };
}

export async function addDoc<T>(
  reference: CollectionReference<T>,
  data: T,
): Promise<DocumentReference<T>> {
  const id = firestoreStore.generateId();
  const path = `${reference.path}/${id}`;
  await firestoreStore.setDoc(path, resolveFieldValues(data as DocumentData));
  return makeDocRef(reference.firestore, path);
}

export async function setDoc<T>(
  reference: DocumentReference<T>,
  data: T,
  options?: { merge?: boolean; mergeFields?: string[] },
): Promise<void> {
  const resolved = resolveFieldValues(data as DocumentData);
  if (options?.merge) {
    const existing = await firestoreStore.getDoc<DocumentData>(reference.path);
    await firestoreStore.setDoc(reference.path, { ...(existing ?? {}), ...resolved });
  } else {
    await firestoreStore.setDoc(reference.path, resolved);
  }
}

export async function updateDoc<T>(
  reference: DocumentReference<T>,
  data: Partial<T> | string,
  ..._values: unknown[]
): Promise<void> {
  if (typeof data === 'string') {
    // updateDoc(ref, fieldA, valueA, fieldB, valueB, ...)
    const update: DocumentData = {};
    update[data] = _values[0];
    for (let i = 1; i + 1 < _values.length; i += 2) {
      update[_values[i] as string] = _values[i + 1];
    }
    const existing = await firestoreStore.getDoc<DocumentData>(reference.path);
    await firestoreStore.setDoc(reference.path, { ...(existing ?? {}), ...resolveFieldValues(update) });
    return;
  }
  const existing = await firestoreStore.getDoc<DocumentData>(reference.path);
  await firestoreStore.setDoc(reference.path, {
    ...(existing ?? {}),
    ...resolveFieldValues(data as DocumentData),
  });
}

export async function deleteDoc(reference: DocumentReference): Promise<void> {
  await firestoreStore.deleteDoc(reference.path);
}

function resolveFieldValues(data: DocumentData): DocumentData {
  const result: DocumentData = {};
  for (const [key, value] of Object.entries(data)) {
    if (value instanceof FieldValue) {
      switch (value._kind) {
        case 'serverTimestamp':
          result[key] = Timestamp.now();
          break;
        case 'increment':
          // We don't have prev value here; resolved against existing in setDoc would be nicer.
          // For now, treat as identity write — caller can read-then-set if exact semantics needed.
          result[key] = value._operand;
          break;
        case 'arrayUnion':
          result[key] = value._operand;
          break;
        case 'arrayRemove':
          result[key] = [];
          break;
        case 'deleteField':
          // Skip — the field is removed
          break;
      }
    } else if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Timestamp) && !(value instanceof Date)) {
      result[key] = resolveFieldValues(value as DocumentData);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export function onSnapshot<T>(
  refOrQuery: DocumentReference<T> | Query<T> | CollectionReference<T>,
  next: ((snap: DocumentSnapshot<T> | QuerySnapshot<T>) => void) | { next?: (snap: unknown) => void; error?: (err: Error) => void },
  _errorOrNext?: ((err: Error) => void) | ((snap: unknown) => void),
): Unsubscribe {
  const callback = typeof next === 'function' ? next : (next.next ?? (() => {}));
  // Resolve the path scope for this subscription so the store can skip
  // notifying us on writes to unrelated paths. Document subs match exact
  // path; collection/query subs match the collection prefix.
  let scopePrefix = '';
  if ((refOrQuery as DocumentReference<T>).type === 'document') {
    scopePrefix = (refOrQuery as DocumentReference<T>).path;
  } else {
    const colPath =
      (refOrQuery as Query<T>)._path ?? (refOrQuery as CollectionReference<T>).path;
    scopePrefix = colPath.endsWith('/') ? colPath : `${colPath}/`;
  }

  const fire = async (): Promise<void> => {
    try {
      if ((refOrQuery as DocumentReference<T>).type === 'document') {
        const snap = await getDoc(refOrQuery as DocumentReference<T>);
        callback(snap as DocumentSnapshot<T>);
      } else {
        const snap = await getDocs(refOrQuery as Query<T> | CollectionReference<T>);
        callback(snap as QuerySnapshot<T>);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[mock firestore] onSnapshot fire failed', err);
    }
  };
  queueMicrotask(fire);
  const unsubscribe = firestoreStore.subscribe(fire, scopePrefix);
  return () => {
    unsubscribe();
  };
}

export interface Transaction {
  get: <T>(ref: DocumentReference<T>) => Promise<DocumentSnapshot<T>>;
  set: <T>(ref: DocumentReference<T>, data: T, options?: { merge?: boolean }) => Transaction;
  update: <T>(ref: DocumentReference<T>, data: Partial<T>) => Transaction;
  delete: (ref: DocumentReference) => Transaction;
}

export async function runTransaction<T>(
  _firestore: Firestore,
  updateFn: (transaction: Transaction) => Promise<T>,
): Promise<T> {
  const txn: Transaction = {
    get: <U>(ref: DocumentReference<U>) => getDoc(ref),
    set: function (ref, data, options) {
      void setDoc(ref, data, options);
      return this;
    },
    update: function (ref, data) {
      void updateDoc(ref, data);
      return this;
    },
    delete: function (ref) {
      void deleteDoc(ref);
      return this;
    },
  };
  return updateFn(txn);
}

export interface WriteBatch {
  set: <T>(ref: DocumentReference<T>, data: T, options?: { merge?: boolean }) => WriteBatch;
  update: <T>(ref: DocumentReference<T>, data: Partial<T>) => WriteBatch;
  delete: (ref: DocumentReference) => WriteBatch;
  commit: () => Promise<void>;
}

export function writeBatch(_firestore: Firestore): WriteBatch {
  const ops: Array<() => Promise<void>> = [];
  const batch: WriteBatch = {
    set: function (ref, data, options) {
      ops.push(() => setDoc(ref, data, options));
      return this;
    },
    update: function (ref, data) {
      ops.push(() => updateDoc(ref, data));
      return this;
    },
    delete: function (ref) {
      ops.push(() => deleteDoc(ref));
      return this;
    },
    commit: async () => {
      for (const op of ops) await op();
    },
  };
  return batch;
}

export async function clearIndexedDbPersistence(_firestore: Firestore): Promise<void> {
  await firestoreStore.clear();
}
export async function terminate(_firestore: Firestore): Promise<void> {
  // No-op
}

export async function enableIndexedDbPersistence(_firestore: Firestore): Promise<void> {
  // No-op — we always persist via our store
}

export async function disableNetwork(_firestore: Firestore): Promise<void> {
  // No-op
}
export async function enableNetwork(_firestore: Firestore): Promise<void> {
  // No-op
}

export class GeoPoint {
  constructor(public readonly latitude: number, public readonly longitude: number) {}
  isEqual(other: GeoPoint): boolean {
    return this.latitude === other.latitude && this.longitude === other.longitude;
  }
}

export class Bytes {
  constructor(private readonly _data: Uint8Array) {}
  static fromBase64String(s: string): Bytes {
    return new Bytes(Uint8Array.from(atob(s), (c) => c.charCodeAt(0)));
  }
  toBase64(): string {
    return btoa(String.fromCharCode(...this._data));
  }
  toUint8Array(): Uint8Array {
    return this._data;
  }
}
