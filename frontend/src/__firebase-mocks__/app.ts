// Shim for `firebase/app` — minimal surface used by BoletApp source.
export interface FirebaseApp {
  name: string;
  options: Record<string, unknown>;
  automaticDataCollectionEnabled: boolean;
}

const apps: FirebaseApp[] = [];

export function initializeApp(options: Record<string, unknown> = {}, name = '[DEFAULT]'): FirebaseApp {
  const app: FirebaseApp = {
    name,
    options,
    automaticDataCollectionEnabled: false,
  };
  apps.push(app);
  return app;
}

export function getApps(): FirebaseApp[] {
  return apps;
}

export function getApp(name = '[DEFAULT]'): FirebaseApp {
  const app = apps.find((a) => a.name === name);
  if (!app) throw new Error(`No Firebase App '${name}' has been initialized`);
  return app;
}

export function deleteApp(app: FirebaseApp): Promise<void> {
  const idx = apps.indexOf(app);
  if (idx >= 0) apps.splice(idx, 1);
  return Promise.resolve();
}
