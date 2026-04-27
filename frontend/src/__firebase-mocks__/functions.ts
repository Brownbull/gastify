// Shim for `firebase/functions` — Cloud Function calls are dispatched to a
// canned-response registry. Phase C will fill out the real fixtures; for
// Phase A every callable returns a deferred reject so the UI shows its
// error path rather than hanging.
import type { FirebaseApp } from './app';

export interface Functions {
  app: FirebaseApp;
  region: string;
  customDomain: string | null;
}

export type CallableHandler<TRequest = unknown, TResponse = unknown> = (
  data: TRequest,
) => Promise<TResponse> | TResponse;

// Pin the registry to globalThis so any module-duplication artefacts in
// dev (Vite serving the same file under different URLs) still share the
// same handler set.
const GLOBAL_KEY = '__gastifyMockCallableHandlers__';
type WithRegistry = typeof globalThis & { [GLOBAL_KEY]?: Map<string, CallableHandler> };
const g = globalThis as WithRegistry;
if (!g[GLOBAL_KEY]) {
  g[GLOBAL_KEY] = new Map<string, CallableHandler>();
}
const handlers: Map<string, CallableHandler> = g[GLOBAL_KEY];

export function registerCallable<TRequest, TResponse>(
  name: string,
  handler: CallableHandler<TRequest, TResponse>,
): void {
  handlers.set(name, handler as CallableHandler);
}

let cachedFunctions: Functions | null = null;

export function getFunctions(app?: FirebaseApp, region = 'us-central1'): Functions {
  if (cachedFunctions) return cachedFunctions;
  cachedFunctions = {
    app: app ?? ({ name: '[DEFAULT]', options: {}, automaticDataCollectionEnabled: false } as FirebaseApp),
    region,
    customDomain: null,
  };
  return cachedFunctions;
}

export interface HttpsCallableResult<TResponse = unknown> {
  data: TResponse;
}

export function httpsCallable<TRequest = unknown, TResponse = unknown>(
  _functions: Functions,
  name: string,
): (data: TRequest) => Promise<HttpsCallableResult<TResponse>> {
  return async (data: TRequest) => {
    const handler = handlers.get(name);
    if (!handler) {
      // Fail loudly so we know which Cloud Function still needs a fixture.
      // Phase C wires concrete handlers via registerCallable().
      throw new Error(`[mock functions] no handler registered for callable '${name}'`);
    }
    const result = await handler(data);
    return { data: result as TResponse };
  };
}

export function connectFunctionsEmulator(_functions: Functions, _host: string, _port: number): void {
  // No-op
}
