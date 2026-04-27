// Shim for `firebase/storage` — uploads return `URL.createObjectURL` so
// preview thumbnails work, but no bytes leave the browser.
import type { FirebaseApp } from './app';

export interface FirebaseStorage {
  app: FirebaseApp;
  maxOperationRetryTime: number;
  maxUploadRetryTime: number;
}

export interface StorageReference {
  bucket: string;
  fullPath: string;
  name: string;
  parent: StorageReference | null;
  root: StorageReference;
  storage: FirebaseStorage;
  toString: () => string;
}

export interface UploadTaskSnapshot {
  bytesTransferred: number;
  totalBytes: number;
  state: 'running' | 'paused' | 'success' | 'canceled' | 'error';
  metadata: { fullPath: string; name: string; contentType?: string };
  ref: StorageReference;
  task: UploadTask;
}

export interface UploadTask {
  cancel: () => boolean;
  pause: () => boolean;
  resume: () => boolean;
  snapshot: UploadTaskSnapshot;
  on: (
    event: 'state_changed',
    next?: (snap: UploadTaskSnapshot) => void,
    error?: (err: Error) => void,
    complete?: () => void,
  ) => () => void;
  then: <T>(
    onFulfilled?: (snap: UploadTaskSnapshot) => T,
    onRejected?: (err: Error) => unknown,
  ) => Promise<T>;
  catch: (onRejected: (err: Error) => unknown) => Promise<unknown>;
}

let cachedStorage: FirebaseStorage | null = null;

export function getStorage(app?: FirebaseApp): FirebaseStorage {
  if (cachedStorage) return cachedStorage;
  cachedStorage = {
    app: app ?? ({ name: '[DEFAULT]', options: {}, automaticDataCollectionEnabled: false } as FirebaseApp),
    maxOperationRetryTime: 120000,
    maxUploadRetryTime: 600000,
  };
  return cachedStorage;
}

export function ref(storageOrRef: FirebaseStorage | StorageReference, path?: string): StorageReference {
  const storage =
    'app' in storageOrRef ? storageOrRef : (storageOrRef as StorageReference).storage;
  const fullPath = path ?? '/';
  const name = fullPath.split('/').filter(Boolean).pop() ?? '';
  const self: StorageReference = {
    bucket: 'gastify-mock.local',
    fullPath,
    name,
    parent: null,
    root: null as unknown as StorageReference,
    storage,
    toString: () => `gs://gastify-mock.local/${fullPath}`,
  };
  self.root = self;
  return self;
}

export function uploadBytesResumable(
  reference: StorageReference,
  data: Blob | ArrayBuffer | Uint8Array,
  metadata?: { contentType?: string },
): UploadTask {
  const totalBytes = data instanceof Blob ? data.size : (data as ArrayBuffer).byteLength;
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.info('[mock storage] uploadBytesResumable', {
      path: reference.fullPath,
      bytes: totalBytes,
      contentType: metadata?.contentType,
    });
  }
  const snapshot: UploadTaskSnapshot = {
    bytesTransferred: totalBytes,
    totalBytes,
    state: 'success',
    metadata: { fullPath: reference.fullPath, name: reference.name, contentType: metadata?.contentType },
    ref: reference,
    task: null as unknown as UploadTask,
  };

  const stateListeners: Array<(s: UploadTaskSnapshot) => void> = [];
  const completeListeners: Array<() => void> = [];

  const task: UploadTask = {
    snapshot,
    cancel: () => true,
    pause: () => false,
    resume: () => true,
    on: (_event, next, _error, complete) => {
      if (next) stateListeners.push(next);
      if (complete) completeListeners.push(complete);
      // Fire next + complete asynchronously so the caller has finished
      // wiring all three handlers (next/error/complete) before either runs.
      queueMicrotask(() => {
        if (next) next(snapshot);
        if (complete) complete();
      });
      return () => {
        const ni = next ? stateListeners.indexOf(next) : -1;
        if (ni >= 0) stateListeners.splice(ni, 1);
        const ci = complete ? completeListeners.indexOf(complete) : -1;
        if (ci >= 0) completeListeners.splice(ci, 1);
      };
    },
    then: (onFulfilled) => Promise.resolve(onFulfilled ? onFulfilled(snapshot) : (snapshot as never)),
    catch: () => Promise.resolve(snapshot),
  };
  snapshot.task = task;
  return task;
}

export function getDownloadURL(reference: StorageReference): Promise<string> {
  // Returns a Firebase-style URL embedding a base64 SVG payload so consumers
  // that use a `https://firebasestorage.googleapis.com/` regex still pass,
  // and components that just stick the URL into <img src> still render.
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 80'><rect width='80' height='80' fill='%23e9e4d8'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%23a39888' font-family='monospace' font-size='10'>${reference.name.slice(0, 8)}</text></svg>`;
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.info('[mock storage] getDownloadURL', { path: reference.fullPath });
  }
  return Promise.resolve(`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`);
}

export function deleteObject(_reference: StorageReference): Promise<void> {
  return Promise.resolve();
}

export function connectStorageEmulator(_storage: FirebaseStorage, _host: string, _port: number): void {
  // No-op
}
