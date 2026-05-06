# RALPH PRD Format — `prd.json` Schema

Phase B deliverable. Defines the schema for every per-feature `scripts/ralph-*/prd.json`.

## Schema

```jsonc
{
  "project": "gastify",
  "branchName": "rebuild/fe-<feature>-batch-NN",
  "description": "Human-readable batch description",
  "userStories": [
    {
      // --- Core fields (upstream RALPH) ---
      "id": "DASH-001",           // Prefix = feature scope (DASH, HIST, TREND, ITEM, SCAN, SET, AM)
      "title": "Dashboard shell — mobile",
      "description": "Story description with acceptance context",
      "acceptanceCriteria": [
        "Story renders without errors at 390×844",
        "axe audit passes (0 critical/serious violations)",
        "es-CL i18n keys resolve (no raw Spanish strings)",
        "Typecheck passes"
      ],
      "priority": 1,              // Lower = higher priority; RALPH picks lowest-priority-number story where passes:false
      "passes": false,
      "notes": "",

      // --- Extended fields (RALPH-viability wave 1) ---
      "tier": "screen-shell",     // "atom" | "molecule" | "screen-shell" | "screen-state"
      "source": "clean-slate",    // "clean-slate" | "legacy" | "new"
      "platform": ["mobile", "tablet", "desktop"],  // Which viewport variants the story must cover
      "spec_path": "docs/mockups/screens/dashboard/DashboardView.png",
      "snapshot_paths": [
        "docs/rebuild/ux/baseline-snapshots/dashboard-mobile.png",
        "docs/rebuild/ux/baseline-snapshots/dashboard-tablet.png",
        "docs/rebuild/ux/baseline-snapshots/dashboard-desktop.png"
      ],
      "deps": [],                 // Story IDs that must be passes:true before this story is eligible
      "api_endpoints": [          // OpenAPI operationIds the screen depends on (MSW mocked)
        "listTransactions",
        "getAnalyticsSummary"
      ],
      "gate": "screen",           // "atom" | "molecule" | "screen" — determines verification depth
      "play_function": true,      // Whether the story requires a Storybook play() function

      // --- Attempt tracking ---
      "maxAttempts": 3,           // Default 3; after exceeded, story auto-marked blocked:true
      "attemptCount": 0,          // Incremented on every gate failure; reset to 0 on human triage
      "blocked": false,           // Set true when attemptCount >= maxAttempts

      // --- Tier suitability ---
      "tier_suitability": "ralph-eligible"
      // "ralph-eligible"            — RALPH iterates normally
      // "ralph-eligible-with-deps"  — RALPH iterates only after all deps[] pass
      // "human-authored"            — RALPH skips; listed for count honesty
    }
  ]
}
```

## Field Reference

### `tier`

| Value | Description | Typical LOC delta |
|-------|-------------|-------------------|
| `atom` | Single UI primitive (Button, Badge, Card, Input) | ≤80 |
| `molecule` | Composed from atoms (TransactionRow, FilterBar, StatCard) | ≤120 |
| `screen-shell` | Route-level layout with mocked data, no state variants | ≤150 |
| `screen-state` | One state variant of a screen (loading, empty, error, filtered, etc.) | ≤150 |

### `source`

| Value | Meaning |
|-------|---------|
| `clean-slate` | Design language from `docs/mockups/` (preferred) |
| `legacy` | Coverage from `docs/mockups-legacy/` (fills gaps) |
| `new` | No mockup exists; spec from SCOPE REQ or ADR |

### `gate`

Determines which verification checks run at the tiered Storybook gate:

| Gate | Checks |
|------|--------|
| `atom` | `npm run typecheck` + render test + axe + i18n regex (~5s) |
| `molecule` | atom checks + Storybook `play()` with ≥1 interaction assertion (~15s) |
| `screen` | molecule checks + `play()` walking ≥2 states + Playwright screenshot + visual diff (~60s) |

### `tier_suitability`

| Classification | When to use | RALPH behavior |
|----------------|-------------|----------------|
| `ralph-eligible` | Atoms, molecules, screen-shells, screen-states with state breadth ≤4 | Normal iteration |
| `ralph-eligible-with-deps` | Screen-states with state breadth >4 but no cross-feature interactivity | Iterates only after all `deps[]` entries are `passes: true` |
| `human-authored` | Cross-feature interactivity, route definitions, integration smoke tests | RALPH skips entirely; count is honest but iteration loop ignores |

### `deps[]`

Array of story IDs (e.g., `["AM-001", "AM-005"]`) that must have `passes: true` before this story becomes eligible. Enforcement rules:

- RALPH selects only stories where **every** `deps[]` entry is `passes: true`
- Circular dependencies trip a fail-fast lint gate at `prd.json` load time
- Missing dependency IDs (referencing a non-existent story) escalate to `blocked: true`

### `maxAttempts` / `attemptCount` / `blocked`

- `maxAttempts` defaults to 3
- `attemptCount` incremented on every tier-gate failure
- When `attemptCount >= maxAttempts`: `blocked` set to `true`, story surfaces in per-feature AGENTS.md "stuck stories" section, skipped on subsequent iterations
- Human triage resets `attemptCount` to 0 and `blocked` to false

### `api_endpoints`

OpenAPI `operationId` values from `docs/rebuild/api/OPENAPI-SKETCH.md`. Used to:
- Auto-generate MSW handler stubs for the story
- Cross-reference contract tests at `tests/contract/`
- Track which stories are blocked by unimplemented backend endpoints

## ID Prefix Convention

| Prefix | RALPH Instance | Feature Scope |
|--------|---------------|---------------|
| `AM` | `scripts/ralph-atoms-molecules/` | Cross-feature atoms + molecules |
| `DASH` | `scripts/ralph-features-dashboard/` | Dashboard |
| `HIST` | `scripts/ralph-features-history/` | History |
| `TREND` | `scripts/ralph-features-analytics/` | Trends / Analytics |
| `ITEM` | `scripts/ralph-features-items/` | Items |
| `SCAN` | `scripts/ralph-features-scan/` | Scan + Batch |
| `SET` | `scripts/ralph-features-settings/` | Settings + Onboarding + Profile |

Reports + Insights stories (prefix `RI`) are hand-authored — no RALPH instance.

## Validation

`prd.json` is validated at load time by `ralph.sh` before iteration begins:

1. All `deps[]` references resolve to existing story IDs
2. No circular dependency chains
3. Every story has all required fields
4. `tier_suitability` is one of the three valid values
5. `attemptCount <= maxAttempts` (or `blocked` must be `true`)
6. `id` prefix matches the instance scope
