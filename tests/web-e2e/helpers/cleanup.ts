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

export type E2eUser = "a" | "b";

async function tokenFor(user: E2eUser): Promise<string | undefined> {
  const key = env.VITE_FIREBASE_API_KEY;
  const email = user === "a" ? env.VITE_E2E_AUTH_EMAIL : env.VITE_E2E_AUTH_EMAIL_B;
  const password = user === "a" ? env.VITE_E2E_AUTH_PASSWORD : env.VITE_E2E_AUTH_PASSWORD_B;
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

async function idToken(): Promise<string | undefined> {
  return tokenFor("a");
}

/** Authenticated JSON request as one of the two e2e users. Returns undefined on
 * missing config; throws nothing — callers assert on the result. */
export async function apiAs(
  user: E2eUser,
  method: string,
  apiPath: string,
  body?: unknown,
): Promise<{ status: number; json: unknown } | undefined> {
  const base = env.VITE_API_BASE_URL;
  const token = await tokenFor(user);
  if (!base || !token) return undefined;
  const res = await fetch(`${base}/api/v1${apiPath}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json: unknown = undefined;
  try {
    json = text ? JSON.parse(text) : undefined;
  } catch {
    json = text;
  }
  return { status: res.status, json };
}

/** Delete every group whose name starts with `prefix` — for BOTH e2e users (a group
 * can outlive its creator: an owner leaving hands ownership to an admin, D94). */
export async function cleanupTestGroups(prefix = "E2E "): Promise<void> {
  for (const user of ["a", "b"] as const) {
    try {
      const listed = await apiAs(user, "GET", "/groups");
      if (!listed || listed.status !== 200) continue;
      const groups = listed.json as Array<{ id: string; name?: string; role?: string }>;
      await Promise.all(
        groups
          .filter((g) => g.name?.startsWith(prefix))
          .map(async (g) => {
            // Owners delete; mere members leave (keep) so the cap frees up.
            if (g.role === "owner") await apiAs(user, "DELETE", `/groups/${g.id}`);
            else await apiAs(user, "POST", `/groups/${g.id}/leave?delete_shared=false`);
          }),
      );
    } catch {
      // Best-effort: cleanup must never fail a spec.
    }
  }
}


/** List the scope's transaction ids on a given date (API; paginated past the UI). */
export async function transactionIdsOn(dateISO: string): Promise<Set<string>> {
  const base = env.VITE_API_BASE_URL;
  const token = await idToken();
  if (!base || !token) return new Set();
  const res = await fetch(
    `${base}/api/v1/transactions?date_from=${dateISO}&date_to=${dateISO}&limit=200`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) return new Set();
  const body = await res.json();
  return new Set((body.data as Array<{ id: string }>).map((t) => t.id));
}

/** Delete one transaction via the API (within the 90-day window). */
export async function deleteTransaction(id: string): Promise<boolean> {
  const base = env.VITE_API_BASE_URL;
  const token = await idToken();
  if (!base || !token) return false;
  const res = await fetch(`${base}/api/v1/transactions/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.status === 204;
}

/** The YYYY-MM month of a transaction's transaction_date (API). */
export async function transactionMonth(id: string): Promise<string | undefined> {
  const base = env.VITE_API_BASE_URL;
  const token = await idToken();
  if (!base || !token) return undefined;
  const res = await fetch(`${base}/api/v1/transactions/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return undefined;
  const body = (await res.json()) as { transaction_date?: string };
  return body.transaction_date?.slice(0, 7);
}

/** The id of any transaction carrying a MATCHED reconciliation verdict (API). */
export async function firstMatchedTransactionId(): Promise<string | undefined> {
  const base = env.VITE_API_BASE_URL;
  const token = await idToken();
  if (!base || !token) return undefined;
  const res = await fetch(`${base}/api/v1/transactions?limit=200`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return undefined;
  const body = await res.json();
  const rows = body.data as Array<{
    id: string;
    statement_matched?: boolean;
    is_shared?: boolean;
  }>;
  // Prefer an UNSHARED matched row: D74's share-lock would shadow the match-lock
  // semantics a caller wants to exercise.
  return (
    rows.find((t) => t.statement_matched && !t.is_shared) ?? rows.find((t) => t.statement_matched)
  )?.id;
}

/** Unlearn mappings taught by spec edits (e.g. "E2E Edited …" renames) so future
 * fixture scans keep their canonical names — the durable fix for learning pollution. */
export async function cleanupLearnedMappings(targetPattern = /^(E2E |MODIFIED|S23 )/): Promise<void> {
  try {
    const base = env.VITE_API_BASE_URL;
    const token = await idToken();
    if (!base || !token) return;
    const auth = { Authorization: `Bearer ${token}` };
    const res = await fetch(`${base}/api/v1/mappings`, { headers: auth });
    if (!res.ok) return;
    const body = (await res.json()) as {
      merchants: Array<{ id: string; target_merchant: string }>;
      items: Array<{ id: string; target_item: string | null }>;
    };
    const doomed = [
      ...body.merchants
        .filter((m) => targetPattern.test(m.target_merchant))
        .map((m) => `merchant/${m.id}`),
      ...body.items
        .filter((m) => m.target_item && targetPattern.test(m.target_item))
        .map((m) => `item/${m.id}`),
    ];
    await Promise.all(
      doomed.map((path) =>
        fetch(`${base}/api/v1/mappings/${path}`, { method: "DELETE", headers: auth }).catch(
          () => {},
        ),
      ),
    );
  } catch {
    // Best-effort.
  }
}

/** Delete a statement via the API (cascades runs+verdicts — the unlock path). */
export async function deleteStatementById(id: string): Promise<boolean> {
  const base = env.VITE_API_BASE_URL;
  const token = await idToken();
  if (!base || !token) return false;
  const res = await fetch(`${base}/api/v1/statements/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.status === 204;
}

/** The most recent statement's id (API). */
export async function latestStatementId(): Promise<string | undefined> {
  const base = env.VITE_API_BASE_URL;
  const token = await idToken();
  if (!base || !token) return undefined;
  const res = await fetch(`${base}/api/v1/statements`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return undefined;
  const rows = (await res.json()) as Array<{ id: string }>;
  return rows[0]?.id;
}

/** Delete EVERY statement (cascades all runs+verdicts) — the deterministic unlock. */
export async function deleteAllStatements(): Promise<number> {
  const base = env.VITE_API_BASE_URL;
  const token = await idToken();
  if (!base || !token) return 0;
  const auth = { Authorization: `Bearer ${token}` };
  const res = await fetch(`${base}/api/v1/statements`, { headers: auth });
  if (!res.ok) return 0;
  const rows = (await res.json()) as Array<{ id: string }>;
  let n = 0;
  for (const r of rows) {
    const del = await fetch(`${base}/api/v1/statements/${r.id}`, {
      method: "DELETE",
      headers: auth,
    });
    if (del.status === 204) n++;
  }
  return n;
}
