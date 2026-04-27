// Shim for `firebase/auth` — auto-logs-in a default test user. The
// TestUserMenu component's helpers can switch the active user; we listen
// for that in our auth event bus.
import type { FirebaseApp } from './app';

export interface User {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
  photoURL: string | null;
  isAnonymous: boolean;
  providerData: Array<{ providerId: string; uid: string; displayName: string | null; email: string | null }>;
  metadata: { creationTime?: string; lastSignInTime?: string };
  refreshToken: string;
  getIdToken: (forceRefresh?: boolean) => Promise<string>;
  getIdTokenResult: () => Promise<{ token: string; claims: Record<string, unknown> }>;
  reload: () => Promise<void>;
  delete: () => Promise<void>;
  toJSON: () => object;
  // Newer SDK surface
  tenantId: string | null;
  phoneNumber: string | null;
  providerId: string;
}

export interface Auth {
  app: FirebaseApp;
  currentUser: User | null;
  languageCode: string | null;
  tenantId: string | null;
  emulatorConfig: null;
  config: { apiKey: string; authDomain: string };
  name: string;
  signOut: () => Promise<void>;
  setPersistence: (persistence: unknown) => Promise<void>;
  onAuthStateChanged: (cb: AuthStateChangedCallback) => Unsubscribe;
}

export type AuthStateChangedCallback = (user: User | null) => void;
export type Unsubscribe = () => void;

const TEST_USERS: Record<string, User> = {
  alice: makeUser('alice-uid', 'alice@boletapp.test', 'Alice'),
  bob: makeUser('bob-uid', 'bob@boletapp.test', 'Bob'),
  charlie: makeUser('charlie-uid', 'charlie@boletapp.test', 'Charlie'),
  diana: makeUser('diana-uid', 'diana@boletapp.test', 'Diana'),
};

function makeUser(uid: string, email: string, displayName: string): User {
  return {
    uid,
    email,
    emailVerified: true,
    displayName,
    photoURL: null,
    isAnonymous: false,
    providerData: [
      { providerId: 'password', uid: email, displayName, email },
    ],
    metadata: { creationTime: new Date().toISOString(), lastSignInTime: new Date().toISOString() },
    refreshToken: 'mock-refresh-token',
    tenantId: null,
    phoneNumber: null,
    providerId: 'password',
    getIdToken: () => Promise.resolve('mock-id-token'),
    getIdTokenResult: () =>
      Promise.resolve({ token: 'mock-id-token', claims: { sub: uid, email } }),
    reload: () => Promise.resolve(),
    delete: () => Promise.resolve(),
    toJSON: () => ({ uid, email, displayName }),
  };
}

let listeners: AuthStateChangedCallback[] = [];
let currentUser: User | null = TEST_USERS.alice;

// Seed window.__mockAuthCurrentUid eagerly so modules that load before any
// listener fires can still read the active uid.
if (typeof window !== 'undefined') {
  type WithAuthDebug = Window & { __mockAuthCurrentUid?: string | undefined };
  (window as WithAuthDebug).__mockAuthCurrentUid = currentUser?.uid;
}

function notifyAll(): void {
  // Expose current uid on window for cross-module access (e.g. the gemini
  // mock needs to know who is signed in without importing the auth module
  // and creating a circular dependency).
  type WithAuthDebug = Window & { __mockAuthCurrentUid?: string | undefined };
  if (typeof window !== 'undefined') {
    (window as WithAuthDebug).__mockAuthCurrentUid = currentUser?.uid;
  }
  for (const cb of listeners) {
    try {
      cb(currentUser);
    } catch (err) {
      // Silent: a misbehaving listener shouldn't break the auth bus
      // eslint-disable-next-line no-console
      console.error('[mock auth] listener threw', err);
    }
  }
}

let cachedAuth: Auth | null = null;

export function getAuth(app?: FirebaseApp): Auth {
  if (cachedAuth) return cachedAuth;
  cachedAuth = {
    app: app ?? ({ name: '[DEFAULT]', options: {}, automaticDataCollectionEnabled: false } as FirebaseApp),
    get currentUser() {
      return currentUser;
    },
    languageCode: null,
    tenantId: null,
    emulatorConfig: null,
    config: { apiKey: 'mock', authDomain: 'gastify-mock.local' },
    name: '[DEFAULT]',
    signOut: () => {
      currentUser = null;
      notifyAll();
      return Promise.resolve();
    },
    setPersistence: () => Promise.resolve(),
    onAuthStateChanged: (cb) => {
      listeners.push(cb);
      // Fire async to mirror Firebase's behavior
      queueMicrotask(() => cb(currentUser));
      return () => {
        listeners = listeners.filter((l) => l !== cb);
      };
    },
  };
  return cachedAuth;
}

// Top-level functions BoletApp uses
export function onAuthStateChanged(auth: Auth, cb: AuthStateChangedCallback): Unsubscribe {
  return auth.onAuthStateChanged(cb);
}

export function signOut(auth: Auth): Promise<void> {
  return auth.signOut();
}

export function setPersistence(auth: Auth, persistence: unknown): Promise<void> {
  return auth.setPersistence(persistence);
}

export function signInWithEmailAndPassword(
  _auth: Auth,
  email: string,
  _password: string,
): Promise<{ user: User }> {
  // Test users in BoletApp follow alice/bob/charlie/diana@boletapp.test
  const slug = email.split('@')[0]?.toLowerCase() ?? 'alice';
  const user = TEST_USERS[slug] ?? TEST_USERS.alice;
  currentUser = user;
  notifyAll();
  return Promise.resolve({ user });
}

export function signInWithPopup(_auth: Auth, _provider: unknown): Promise<{ user: User }> {
  currentUser = TEST_USERS.alice;
  notifyAll();
  return Promise.resolve({ user: TEST_USERS.alice });
}

export function signInAnonymously(_auth: Auth): Promise<{ user: User }> {
  const anon: User = makeUser(`anon-${Date.now()}`, null as unknown as string, 'Anónimo');
  anon.isAnonymous = true;
  currentUser = anon;
  notifyAll();
  return Promise.resolve({ user: anon });
}

export class GoogleAuthProvider {
  static credential(): { providerId: string } {
    return { providerId: 'google.com' };
  }
}

export class EmailAuthProvider {
  static credential(): { providerId: string } {
    return { providerId: 'password' };
  }
}

export const browserLocalPersistence = { type: 'LOCAL' };
export const browserSessionPersistence = { type: 'SESSION' };
export const inMemoryPersistence = { type: 'NONE' };
export const indexedDBLocalPersistence = { type: 'LOCAL_INDEXED' };

export function connectAuthEmulator(_auth: Auth, _url: string, _options?: unknown): void {
  // No-op — there is no emulator in mocked mode.
}

// Dev-mode helper — TestUserMenu can call switchTestUser('bob') to swap.
// Not part of the real Firebase SDK, but exported so the app's TestUserMenu
// adapter can drive it.
export function switchTestUser(slug: 'alice' | 'bob' | 'charlie' | 'diana'): void {
  const next = TEST_USERS[slug];
  if (!next) throw new Error(`Unknown test user: ${slug}`);
  currentUser = next;
  notifyAll();
}
