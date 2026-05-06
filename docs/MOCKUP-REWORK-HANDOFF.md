# Gastify Mockup Rework — Status (2026-04-28)

> **Status:** the mockup rework completed via the **mockup-to-React pivot**.
> See [DECISIONS.md D24](.kdbp/DECISIONS.md) for the pivot rationale and full
> architecture matrix.
>
> Originally drafted as a cross-session handoff brief for a fresh Claude / Codex /
> Cursor session to pick up the legacy HTML mockup track. That track was
> superseded; this doc is now the rebuild's status pointer.

## Where the mockup surface lives

| Concern | Location |
|---------|----------|
| **Atom / molecule / screen mockups** | Storybook 10 at `frontend/.storybook/` (run `cd frontend && npm run storybook` → http://localhost:6006) |
| **Story authoring conventions + scope** | [`frontend/STORIES.md`](../frontend/STORIES.md) ("Scope boundary" + "Screens convention") |
| **Orchestrator-driven flows (scan, multi-step auth)** | Reference docs under `docs/reference/<flow>.md` (canonical: [`docs/reference/scan-flow.md`](reference/scan-flow.md)) + the live React app (`cd frontend && npm run dev`) |
| **Theme tokens + Tailwind 4 build** | `frontend/src/styles/global.css` |
| **Frozen HTML baseline (kept as test target)** | `docs/mockups/` + `docs/mockups-legacy/` — see DECISIONS D27 for why these aren't archived to filesystem |

## What shipped

- **Phase 1** — Tailwind CDN → built Tailwind 4 (`@tailwindcss/vite`); theme tokens migrated to `frontend/src/styles/global.css`.
- **Phase 2-3** — Storybook 10 installed (replaced Ladle per D25); Provider stack + viewport/theme decorators; story conventions documented.
- **Phase 4** — Atom showcase stories (`Atoms/Colors`, `Atoms/Typography`, `Atoms/Icons`).
- **Phase 6** — `Screens/Dashboard` story with platform × state args pattern (4 named variants).
- **Post-pivot scaling** — `Screens/Trends` + `Screens/History` stories matching the Dashboard pattern.
- **Step 4 of the post-revert recommendation** — `docs/reference/scan-flow.md` navigable map for the orchestrator-driven scan flow that's out-of-scope for Storybook per D26.
- **KDBP cleanup** — PENDING P12 closed; DECISIONS D24/D25/D26/D27 recording the pivot, the Storybook choice, the scope boundary, and the "don't move directories" policy.

## What's known + not yet done

- **Loading / error data states for screen stories** — currently only `default` and `empty` are wired into the story args. Loading + error need an explicit contract on the view's data hook.
- **More self-contained screen stories** — Items / Insights / Reports candidates per the post-revert investigation (Step 2). Add when a designer needs the inspection surface.
- **Pivot plan Phase 7** — Playwright snapshot suite over Storybook stories. Defer until CI hardening priority.
- **Pivot plan Phase 8** — production safety verification (grep `frontend/dist/` for `.stories.` / `@storybook` / `cdn.tailwind` leakage). Cheap; do before the next deploy.

## Cross-references

- **Active plan:** `~/.claude/plans/okay-here-s-something-that-ancient-graham.md`
- **DECISIONS:** D24 (pivot), D25 (Storybook over Ladle), D26 (scope boundary), D27 (KDBP-only cleanup, no filesystem archive)
- **PENDING:** P12 closed; P13 still open (pre-existing firestore mock typing tech debt, unrelated to pivot); P6-P10 are rebuild-only requirements for the scan flow (referenced from `docs/reference/scan-flow.md`)
- **PLAN.md:** "Current Phase" section reflects post-pivot scaling status
- **Hard constraints (still load-bearing):** see `.kdbp/SCOPE.md` — 86-cat V4 taxonomy, multi-currency + USD-shadow, jurisdiction-aware consent, card aliases not card numbers, manual edits authoritative over LLM scans, two capture modes (receipt + statement) feeding one ledger with reconciliation buckets.
