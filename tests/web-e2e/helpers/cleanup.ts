import fs from "node:fs";
import path from "node:path";

/**
 * P82 — test-data hygiene for group-creating specs.
 *
 * Groups created by the specs (named "E2E …") used to accumulate on staging-e2e until
 * the e2e user hit MAX_GROUPS_PER_USER and every later group-creation 409'd.
 *
 * Page-independent by design: several specs drive their OWN browser contexts
 * (multi-user A/B), so page-fixture capture misses them. Instead this signs in as the
 * same disposable e2e user via the Firebase REST API (creds from web/.env.staging-e2e,
 * exactly what the app itself uses) and deletes the test groups over the HTTP API.
 */

function loadDotenv(file: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!fs.existsSync(file)) return out;
  for (const raw of fs.readFileSync(file, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    out[line.slice(0, eq).trim()] = line
      .slice(eq + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = loadDotenv(path.resolve(__dirname, "../../../web/.env.staging-e2e"));

async function idToken(): Promise<string | undefined> {
  const key = env.VITE_FIREBASE_API_KEY;
  const email = env.VITE_E2E_AUTH_EMAIL;
  const password = env.VITE_E2E_AUTH_PASSWORD;
  if (!key || !email || !password) return undefined;
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${key}`,
    {
      method: "POST",
      // The key is referer-restricted to the app's origins.
      headers: { "Content-Type": "application/json", Referer: "http://localhost:5173/" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  if (!res.ok) return undefined;
  return (await res.json()).idToken as string;
}

/** Delete every group whose name starts with `prefix` (default: all E2E test groups). */
export async function cleanupTestGroups(prefix = "E2E "): Promise<void> {
  try {
    const base = env.VITE_API_BASE_URL;
    const token = await idToken();
    if (!base || !token) return;
    const auth = { Authorization: `Bearer ${token}` };
    const res = await fetch(`${base}/api/v1/groups`, { headers: auth });
    if (!res.ok) return;
    const groups: Array<{ id: string; name?: string }> = await res.json();
    await Promise.all(
      groups
        .filter((g) => g.name?.startsWith(prefix))
        .map((g) =>
          fetch(`${base}/api/v1/groups/${g.id}`, { method: "DELETE", headers: auth }).catch(
            () => {},
          ),
        ),
    );
  } catch {
    // Best-effort: cleanup must never fail a spec.
  }
}
