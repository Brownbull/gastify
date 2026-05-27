# Architecture Decisions

| # | Date | Decision | Rationale | Alternatives Considered | Status | Review Trigger |
|---|------|----------|-----------|------------------------|--------|----------------|
| D1 | 2026-04-23 | P1 Scaffold tier = ent with Core.Obs→Scale + Deploy.Migration→Ent + Core.Error→Ent overrides | Structured log + metrics exporter baked at scaffold time (REQ-21 + U8); typed error handling foundational; migrate-first prevents runtime errors during deploy | Plain MVP scaffold (TIER_DRIFT against REQ-21); ship Obs in P5 only (duplicates infra) | active | Obs infra churns OR REQ-21 schema changes |
| D2 | 2026-04-23 | P2 FX = lazy read-through cache with PK+ON CONFLICT structural idempotency; integration tier override Data.Backup→Ent + Integration.Retry/Timeout→Ent | User model: per-pair-per-day cache triggered on transaction create, no daily cron needed; structural dedupe covers cold-start race at zero code cost | Daily batch cron (needs scheduler infra, out-of-scope); Redis SETNX dedupe (Scale overkill at scope-of-one); FX API write through no cache (N× external calls, cost+latency) | active | FX backfill/UPDATE path added OR external FX cost spikes |
| D3 | 2026-04-23 | P3 Auth tier = ent with MT.Row-isolation→RLS + Auth.RefreshToken→Ent rotating; CSRF stays MVP none | RLS load-bearing for SC-07/SC-08; ownership leak post-launch catastrophic; Firebase handles refresh rotation natively; bearer-token-only API immune to CSRF by design | WHERE tenant_id app-level (one missed query = leak); CSRF double-submit token (redundant for bearer); manual refresh endpoint (reinvents Firebase) | active | Cookie-based session added OR household multi-user MVP |
| D4 | 2026-04-23 | P4 Consent + DSR tier = ent baseline across 4 jurisdictions | Law 21.719 + GDPR + PIPEDA + CCPA/CPRA hard legal constraint, not ergonomics; audit event log required for DSR proof-of-processing | MVP `none` on audit (blocks per red-line); Scale immutable/WORM (overkill pre-launch) | active | New jurisdiction added OR enforcement action |
| D5 | 2026-04-23 | P5 Observability tier = ent with Core.Obs→Scale (REQ-21 exporter) | REQ-21 + U8 mandate structured logs + metric exporter at P1 exit; phase IS observability, exporter is the deliverable | MVP (TIER_DRIFT against REQ-21); defer to Phase 7 launch-hardening (breaks P1 exit-signal) | active | OTel/Prometheus replaced OR per-scan metric schema changes |
| D6 | 2026-04-23 | P6 Exit-signal smoke test tier = mvp | Happy-path E2E assertion only; no new infra, no new abstractions; proves P2–P5 integrate correctly per ROADMAP §Phase-1 exit signal | Ent with edge coverage (premature; edges land in per-feature phases later) | active | P1 REQ set expands |
| D7 | 2026-04-23 | ux-mockups P1 Design language + tokens tier = **ent** (escalated from mvp 2026-04-23) | Multi-theme runtime (not single-winner-lock) + port legacy 3 themes × light/dark + 3 new candidates + 4-screen stress test × 3 platform frames (desktop web / mobile web / native mobile) = load-bearing for every downstream phase; MVP single-winner premise invalidated by user clarification | Stay mvp (invalid premise — user wants runtime multi-theme, not locked winner) | accepted | Stress-test screens expand OR runtime theme count changes |
| D8 | 2026-04-23 | ux-mockups P2 Atomic components tier = mvp | Atoms simple; happy-path variants enough; state matrix belongs to P3 | Ent full states at atom level (duplicates P3) | accepted | P5-P12 atoms missing |
| D9 | 2026-04-23 | ux-mockups P3 Molecular components tier = ent | Load-bearing for 9 screen phases; full state matrix + WCAG AA prevents compounded rework | MVP happy-path only (forces P13 re-audit) | accepted | 3rd platform added |
| D10 | 2026-04-23 | ux-mockups P4 Flow map + REQ matrix tier = mvp | Living doc rewritten P5-P12; over-spec wastes effort | Ent upfront audit (premature) | accepted | P13 audit gaps |
| D11 | 2026-04-23 | ux-mockups P5 Auth + onboarding + consent tier = mvp | Mockup-only; hardening in backend phases; consent copy legal review is separate gate | Ent (out of scope for mockup deliverable) | accepted | Legal review flags copy |
| D12 | 2026-04-23 | ux-mockups P6 Core capture loop tier = mvp | Happy + 5 scan states cover surface; extended errors move to P12 | Ent (duplicates P12 scope) | accepted | Capture flow expands |
| D13 | 2026-04-23 | ux-mockups P7 Batch + statement flows tier = mvp | Happy + basic errors (credit warn, encrypted pw); reconciliation edges at P12 | Ent (duplicates P12) | accepted | Statement flow expands |
| D14 | 2026-04-23 | ux-mockups P8 History + items + insights tier = mvp | Standard list views | Ent (overkill for list patterns) | accepted | Data-view complexity spikes |
| D15 | 2026-04-23 | ux-mockups P9 Trends + reports tier = mvp | Chart composition; empty/loading chart states at P12 | Ent (duplicates P12 edge coverage) | accepted | New chart types added |
| D16 | 2026-04-23 | ux-mockups P10 Groups tier = mvp | 16 screens but each simple; split mid-phase if overwhelmed | Ent (no justification for 16 simple screens) | accepted | Group ownership model changes |
| D17 | 2026-04-23 | ux-mockups P11 Settings + profile tier = mvp | CRUD forms | Ent (no justification for CRUD) | accepted | New settings surface |
| D18 | 2026-04-23 | ux-mockups P12 Alerts + errors + offline tier = ent | Failure-mode surface drives reliability perception; aggregates extended edge states (permission denied, rate limited, session expired, payment failed, sync conflict, corruption recovery) | MVP (leaves handoff with undefined edge designs) | accepted | SCOPE tightens to happy-path ship |
| D19 | 2026-04-23 | ux-mockups P13 Handoff + index + audit tier = ent | Exit gate — REQ×screen audit + a11y pass + cross-screen consistency validates coverage claim; load-bearing for frontend phases | MVP handoff (broken coverage guarantee; frontend discovers gaps at impl time) | accepted | None — audit mandatory |
| D20 | 2026-04-24 | ux-mockups P1 T5 external render pass (6 themes × 4 stress × 3 platforms = 72 renders) superseded by direct production-surface authoring (14 desktop variants using locked tokens) | Production surfaces exercise tokens under real constraints (data density, responsive grids, component composition); stronger evidence than exploratory renders. `docs/mockups/STRESS-TEST-SPEC.md` retained as platform-frame reference. `docs/mockups/explorations/` stays empty with README noting supersession | Execute T5 MVS (18 renders) before building production surfaces (slower, validates less); defer T5 to P13 audit (too late, tokens already locked) | accepted | Theme count changes OR token structure breaks production surface |
| D21 | 2026-04-24 | /gabe-mockup suite retrofit — adopt peer-command architecture (/gabe-mockup ↔ /gabe-execute mutual redirect via `project_type: mockup` field). Added `.kdbp/ENTITIES.md` (9 principal entities). Landed `docs/mockups/assets/js/tweaks.js` (self-contained runtime Tweaks panel) from gabe_lens template; kept existing `docs/mockups/assets/css/desktop-shell.css` as canonical token source (P1 exit). Seeded `docs/mockups/INDEX.md` from template. P4 types renamed `[flows, index]` → `[mockup-flows, mockup-index]` + description upgraded to include 4-table INDEX governance + CRUD×entity matrix. P13 types renamed `[documentation, validation]` → `[mockup-docs, mockup-validation]`. STRUCTURE.md gained `docs/mockups/**/*.md` pattern row. HANDOFF.schema.json (Apache-2.0 derivative of impeccable DESIGN.json v2) available for P13 emission. Initial retrofit v1 landed `tokens.css` skeleton + `tweaks-panel.html` include file at mockups root; post-audit v2 deleted both — `desktop-shell.css` already canonical, and tweaks-panel.html `<link>`-to-HTML pattern is a deprecated/broken include (HTML Imports). tweaks.js now self-injects styles + panel DOM at boot. | Keep 13-phase plan hand-authored per project (next project reinvents); parallel lane architecture (complexity overhead); use `/gabe-execute` for mockup phases (no recipe fit — render-then-audit vs test-then-implement); duplicate tokens in fresh `tokens.css` alongside `desktop-shell.css` (drift risk); separate tweaks-panel.html file with `<link>` include (broken pattern) | accepted | Hybrid plans emerge requiring per-phase stream tagging OR additional mockup tier-sections needed |
| D22 | 2026-04-24 | Adopt centralized mockup hub pattern (gastify project level). Principal `docs/mockups/index.html` becomes a section-card hub (Design / Atoms / Molecules / Flows / Screens / Handoff); each section that produces many files gets its own `<section>/index.html` sub-hub (`atoms/index.html` already exists, `flows/index.html` + `molecules/index.html` placeholder added in this amendment). `tweaks.js` breadcrumb generalized from atoms-only path-match to section-aware logic (`/<section>/<name>.html` → `← <section> index`; `/<section>/index.html` → `← Mockups home`). Token migration on top hub: inline `:root` block → `desktop-shell.css` canonical tokens (small visual shift accepted). Playwright `hubs.spec.ts` covers hub navigability + breadcrumb chain. Layer B — extracting this hub + sub-hub + Playwright pattern into `gabe_lens/templates/mockup/` so `/gabe-mockup` seeds it on future projects — is queued as a separate follow-up, NOT in this Phase 4 amendment. | Hand-authored single hub per project (current state — works once but reinvents structure on every new project); flat list of files at mockup root with no section grouping (doesn't scale past ~20 files); deep nested per-screen-phase HTML hubs (overkill for Phase 4); skip the HTML hub entirely and rely on markdown INDEX.md alone (loses visual gallery affordance for designers + product reviewers) | accepted | Layer B template extraction lands OR a 3rd section type (beyond atoms/flows/molecules) needs hub treatment |

| D28 | 2026-05-07 | P2-Ph1 Scan schema + image = ent; image-pipeline resize-on-write forces ent | File/Media Image-pipeline MVP=none, ent=resize-on-write — compression load-bearing for Gemini input; Upload + Schema stability Ent baseline | MVP no compression (Gemini accuracy drops, bandwidth waste); Scale on-demand resize + resumable upload (premature) | active | Image storage backend changes (local → S3/GCS) |
| D29 | 2026-05-07 | P2-Ph2 Vision extraction = ent; 3 red-lines: structured output (U4), idempotency (money), dead-letter (scan loss) | AI/Agent.Structured-output downstream-is-code; BG-jobs.Idempotency scan-debits-credits; BG-jobs.Dead-letter drop=silent-loss | MVP blocked by 3 red-lines; Scale multi-model cascade premature | active | Second LLM provider OR scan volume exceeds SLO |
| D30 | 2026-05-07 | P2-Ph3 Categorization + math gate = ent; structured output red-line + typed math-gate errors | AI/Agent.Structured-output fires again (V4 binding → math gate → persistence); typed errors for reconciliation vs category miss | MVP blocked by structured output red-line; Scale auto-eval CI premature | active | V4 taxonomy > 100 categories OR math-gate tolerance changes |
| D31 | 2026-05-07 | P2-Ph4 Scan streaming = ent; reconnection red-line + dual transport SSE+WS | Real-time.Reconnection user-facing stream dead-UI on disconnect; Fallback-transport SSE+WS = ent cell | MVP blocked by reconnection red-line; Scale jitter+long-poll for ~7 events overkill | active | Stream events > 50/scan OR WebSocket proxy issues |
| D32 | 2026-05-07 | P2-Ph5 Exit-signal tests = mvp; test-only phase, no red-lines | Test code not production; production is ent. No domain triggers | Enterprise typed errors in test code unnecessary | active | Exit-signal definition changes |
| D33 | 2026-05-13 | P3-Ph1 Web scaffold + auth = ent; Firebase Auth SDK + TanStack Query inherently ent-level | Auto token refresh + tag/key cache invalidation + scoped stores = Enterprise native behavior from the chosen tools | MVP manual refetch + component state + manual relogin (fighting the tools) | active | Cookie-based session added OR web app auth model changes |
| D34 | 2026-05-13 | P3-Ph2 Scan flow + streaming = ent; Reconnection red-line on user-facing SSE stream | Real-time.Reconnection user-facing stream dead-UI on disconnect; auto-reconnect exp backoff mandatory | MVP manual reload on disconnect (fails exit signal UX); Scale jitter+budget overkill for ~7 events | active | Stream events > 50/scan OR SSE auth model changes |
| D35 | 2026-05-13 | P3-Ph3 Transaction ledger + edit = ent; optimistic updates + semantic HTML + inline error recovery | TanStack Query mutations + optimistic edit rollback natural for tool stack; semantic HTML a11y Enterprise floor | MVP no optimistic updates + raw alerts + div soup (broken primary surface); Scale ARIA+keyboard+SWR premature | active | A11y audit reveals Scale-tier gaps OR data view complexity spikes |
| D36 | 2026-05-13 | P3-Ph4 Sign-out isolation = ent; REQ-14 demands logout broadcast + multi-tab sync | Session.Invalidate logout broadcast + Client State cross-tab storage event = REQ-14 + SC-08 load-bearing | MVP per-tab logout only (fails SC-08 multi-tab); Scale BroadcastChannel+shared worker overkill for web-only | active | Household multi-user OR 3+ client surfaces |
| D37 | 2026-05-13 | P3-Ph5 E2E tests = ent; closes PENDING P6/P8/P9 + proves multi-tab SC-08 edge | 8 edge tests verify error UX, unknown merchant, low confidence, network failure, multi-tab eviction, token refresh, idempotency, input validation | MVP golden journey only (PENDING P6/P8/P9 unverified, multi-tab SC-08 untested) | active | Exit-signal definition changes OR new PENDING items surface |
| D38 | 2026-05-14 | P4-Ph1 Mobile scaffold + auth = ent; native keystore + typed API + Firebase Auth load-bearing | Native auth tokens must live in platform keystore/keychain; Expo + Firebase + typed API client make Ent baseline cheaper than unsafe MVP | MVP AsyncStorage token storage/manual auth; Scale device fleet/MDM management premature | active | Auth provider changes OR Expo managed workflow no longer fits |
| D39 | 2026-05-14 | P4-Ph2 Camera scan + WebSocket progress = ent; native capture + reconnecting stream are exit-signal behavior | Native camera/file picker and WebSocket reconnection are required for mobile scan journey; manual reload after disconnect fails the core loop | MVP static upload/no reconnect; Scale jitter/budget/backpressure overkill for current scan event volume | active | Stream events > 50/scan OR WebSocket proxy/auth model changes |
| D40 | 2026-05-14 | P4-Ph3 Mobile ledger + edit = ent; optimistic rollback + user_edited_at precedence are primary data-safety behavior | Mobile transaction edits must preserve REQ-13 and recover cleanly from network failure; query invalidation is baseline for shared scan/edit state | MVP no optimistic rollback and ad hoc state; Scale offline-first sync premature | active | Offline editing added OR transaction data view complexity spikes |
| D41 | 2026-05-14 | P4-Ph4 Sign-out isolation + push registration = ent; native cache eviction and device token lifecycle are REQ-14/REQ-25 load-bearing | Platform keystore/query/cache/image purge and push permission/device-token handling must be explicit before mobile can ship | MVP signOut only with residual local data; Scale remote device management/quiet-hour policy premature | active | Household devices OR push delivery rules expand |
| D42 | 2026-05-14 | P4-Ph5 Mobile E2E = ent; native runtime proof required, amended by D47 for Android/S23-only closure | Device-level E2E is required for keystore/cache eviction and native streaming; D47 defers iOS runtime proof post-roadmap | MVP unit-only golden path; Scale physical device farm/load suite premature | active | Exit-signal definition changes OR CI/device availability changes |
| D43 | 2026-05-15 | P4 Android E2E execution pivots from local WSL emulator to Samsung S23 physical-device lane | WSL2 + Windows emulator consumed local generated SDK/native-build state and still failed Maestro/DADB reliability; a USB S23 proves camera, keystore, and real Android storage without emulator CPU/RAM pressure | Continue WSL emulator bridge; keep local Gradle/prebuild loop as primary; start with Firebase Test Lab before the local APK story is stable | active | S23 USB lane fails OR CI mobile hardware lane becomes available |
| D44 | 2026-05-20 | Accept receipt prompt v2-dev.9 as the current prompt-lab candidate state with review-warning risks, not as silent-perfect extraction | v2-dev.9 has correct payable totals across the 7 strict failures and zero significant failures; remaining failures are acceptable if the app surfaces review warnings for math/item-count/discount discrepancies and preserves original item order for image comparison | Keep iterating prompt before runtime proof; require perfect item names/quantities before candidate acceptance; hide minor discrepancies from users | active | Any future candidate introduces final-total failures OR runtime lacks review-warning/order-preserving UI before promotion |
| D45 | 2026-05-20 | Runtime scan review signals stay inside the G4 gravity well | Accepted v2-dev.9 minor-review risks are produced by extraction, deterministic postprocessing, and math reconciliation, so warning-signal computation belongs in the scan pipeline rather than a new architecture well | New review-signal gravity well; split coalesce rules immediately; shared runtime/prompt-lab engine now | active | Review signals depend on UI concerns or prompt-lab baselines OR coalesce complexity outgrows the helper |
| D46 | 2026-05-20 | Keep Railway as the current deployment platform; defer Render fallback planning as a post-launch architecture item | Railway remains aligned with the current MVP/staging implementation, but the May 2026 Railway outage exposed provider-concentration risk. Render is the selected future managed fallback target, to be planned after the first production launch rather than blocking current deployment proof. | Immediate migration to Render; Coolify/Hetzner self-hosting; Fly.io; Cloud Run; Koyeb/Kuberns | active | Post-launch infra hardening begins OR Railway blocks production cutover/runtime proof again |
| D47 | 2026-05-24 | Defer iOS runtime testing until after the P1-P9 roadmap; Phase 5 closes on Android/S23 only | Current work is Android-on-desktop/WSL first, and the user chose to revisit iOS after the roadmap instead of treating missing local iOS infrastructure as a blocker | Keep iOS as a Phase 5 blocker; require macOS/TestFlight lane before P4 closure; remove iOS from the product target entirely | active | Roadmap P1-P9 completes OR iOS beta/TestFlight work begins |
| D48 | 2026-05-24 | P5-Ph1 Card alias + statement schema foundation tier = ent | Statement/card schema touches financial data, ownership scope, RLS, migration ordering, and a PCI boundary; Ent is the minimum safe foundation | MVP ad hoc aliases and statement JSON blobs; Scale ledger/audit store before P5 behavior proves out | active | PCI-shaped fields appear OR ownership scope/card alias model changes |
| D49 | 2026-05-24 | P5-Ph2 Statement PDF upload + extraction worker tier = ent | Upload, file/media persistence, async worker, AI structured output, failure states, and streaming progress are user-visible runtime behavior | MVP synchronous parse/no persistent file state; Scale multi-provider extraction cascade | active | Second provider is added OR statement volume exceeds current worker SLO |
| D50 | 2026-05-24 | P5-Ph3 Reconciliation engine + coverage metric tier = ent | Matching financial lines against receipts requires deterministic verdicts, idempotent reruns, ambiguity handling, and user-edit precedence | MVP loose client-side matching; Scale ML matching/rule marketplace | active | Matching tolerance changes OR reconciliation becomes multi-user collaborative |
| D51 | 2026-05-24 | P5-Ph5 Web statement reconciliation flow tier = ent | Web P5 is a primary user-facing upload/progress/bucket workflow with cache isolation and deployed browser proof requirements | MVP static result table; Scale collaborative review and advanced analytics | active | Web flow adds shared household review OR statement data becomes report-grade export |
| D52 | 2026-05-24 | P5-Ph6 Android mobile statement reconciliation flow tier = ent | Native file picker, WebSocket progress, cache isolation, and S23 runtime proof are required for the Android roadmap lane; iOS remains deferred by D47 | MVP web-only fallback on mobile; Scale device farm/offline-first statements | active | iOS lane is pulled forward OR offline statement review becomes required |
| D53 | 2026-05-24 | P5-Ph7 Exit gate + edge tests tier = ent | P5 closure must prove the full deployed journey and financial edge cases across Railway, web, and Android/S23 artifacts | MVP golden-path only; Scale load/performance suite beyond 200-line statement bound | active | Exit signal expands OR statement line count/SLO target changes |
| D54 | 2026-05-25 | P5-Ph0 Statement corpus + extraction contract preflight tier = ent | Private statement PDFs, encrypted/password paths, AI prompt-lab scoring, and no-PCI output contracts must be designed before runtime schema/UI work | Jump directly to DB/runtime tables; mix PDFs into receipt prompt lab; commit raw PDF fixtures | active | Statement contract changes OR private corpus handling changes |
| D55 | 2026-05-25 | P5-Ph4 Statement Gemini prompt lab + coalesce gate tier = ent | Live provider extraction quality needs a statement-only Gemini runner, no-cache evidence, coalesce diagnostics, cost artifacts, and failure ownership before runtime provider promotion | Reuse receipt prompt lab; promote fixture extraction without provider evidence; wait until Web/Android are built to test Gemini | active | Statement Gemini prompt promotion starts OR representative prompt-lab failures remain unclassified |

<!-- Status: active / superseded / revisit -->
<!-- BEHAVIOR.md constraints reference decision IDs: "All integrations mocked (ref D1)" -->

---

## D1 — Phase 1 tier: ent (2026-04-23)

**Phase:** Scaffold + DB baseline
**Types:** deployment-release
**Tier chosen:** ent
**Prototype:** no
**Reason:** Foundational — structured logger + metrics exporter baked in at scaffold-time so REQ-21 + U8 instrumentation is ambient for all later phases, not bolted on. Migrate-first gated prevents runtime errors when schema + code deploy together.

### Sections rendered
- Core (always, all 4 dims)
- Deployment/Release: 2 dims kept, 2 suppressed

### Dimensions suppressed (Layer 2 filter)
- deployment-release.Feature-flags — reason: no feature code yet at scaffold
- deployment-release.Canary — reason: no prod targets yet at scaffold

### Grade overrides
- Core.Error-handling: default MVP → **Ent** (typed + retry). Reason: foundational error-handling posture used by every later phase — retrofitting is painful.
- Core.Observability: default MVP → **Scale** (structured + metrics exporter). Reason: REQ-21 + U8 require metric exporter at P1 exit; wiring at scaffold time avoids retroactive log-format migrations.
- Deployment-release.Migration-order: default MVP → **Ent** (migrate-first gated). Reason: Alembic deploy hook — new code waits on migration-ready signal. Avoids the "old code runs against new schema" window.

### Δ deferred by tier choice
- L × 2 (Core.Testing, Core.Abstractions at MVP)
- S × 2 (Core.Error ΔE→S, Deploy.Rollback ΔM→E)
- M × 1 (Deploy.Migration ΔE→S — expand/contract deferred)

Load-bearing items deferred:
- Core.Testing at MVP (happy-path only) — edges land per-feature phase later
- Deploy.Rollback-plan at MVP (`git revert`) — no prod yet; escalate before first cutover

### Review trigger
- Before first production cutover: escalate Deploy.Rollback to Ent (prev-image revert) + Deploy.Canary to Ent (% traffic)
- When observability infrastructure (OTel collector, log pipeline) changes

### Status
- accepted

---

## D2 — Phase 2 tier: ent (2026-04-23)

**Phase:** Money + currency + FX + i18n
**Types:** data, integration (revised from data, background-jobs)
**Tier chosen:** ent
**Prototype:** no
**Reason:** Financial-data backup red-line forces Ent; lazy FX model eliminates need for background-jobs section entirely. Retry + explicit timeout mandatory on transaction-create path.

### Type revision
Originally proposed `data, background-jobs` on assumption of daily scheduled FX fetch. User clarified actual model: lazy read-through cache, per-pair-per-day, triggered on first transaction of day in that currency. No scheduler. Revised types to `data, integration`.

### Sections rendered
- Core (always, all 4 dims)
- Data: all 4 dims
- Integration: all 4 dims (replacing Background-jobs)

### Dimensions suppressed (Layer 2 filter)
- None (all dimensions kept)

### Grade overrides
- Data.Backup/restore: default MVP `none` → **Ent** (daily snapshot). Reason: financial data red-line; `none` rejected by spec.
- Integration.Retry/backoff: default MVP `none` → **Ent** (exp backoff 3x). Reason: external FX APIs flake; retry preserves transaction-create path.
- Integration.Idempotency: default MVP `none` → **MVP-structural**. Reason: PK `(date, from_currency, to_currency)` + `INSERT ... ON CONFLICT DO NOTHING` + re-read yields winning row. Cold-start race of 2 simultaneous transactions results in ≤1 duplicate external call (<$0.001 at scope-of-one), no data corruption. Effective Ent-tier behavior at zero code cost.
- Integration.Timeout: default MVP `default` → **Ent** (explicit 3s + fail). Reason: transaction-create path cannot block on stalled external; fallback = reject with retry hint.

### Δ deferred by tier choice
- L × 3 (Core.Testing, Core.Abstractions, Data.Schema ΔM→E)
- M × 3 (Data.Migration ΔE→S, Integration.RateLimit ΔE→S, Integration.Retry ΔE→S)
- S × 2 (Core.Error ΔE→S, Integration.Timeout ΔE→S)

Load-bearing items deferred:
- Integration.Rate-limit at MVP (`hope`) — scope-of-one volume tolerates; escalate on first 429
- Data.Migration-safety at MVP — single-env dev deploy acceptable

### Review trigger
- FX backfill/UPDATE path added (structural idempotency breaks — escalate to job-ID dedupe Option B)
- External FX API bill exceeds budget (add Ent rate-limiting)
- Second FX provider added (side-effect-key dedupe Scale)

### Status
- accepted

---

## D3 — Phase 3 tier: ent (2026-04-23)

**Phase:** Identity + ownership scope + RLS
**Types:** auth-session, multi-tenant
**Tier chosen:** ent
**Prototype:** no
**Reason:** RLS correctness load-bearing for SC-07 (privacy by default) + SC-08 (sign-out isolation); ownership leak post-launch catastrophic. Bearer-token-only API design eliminates CSRF surface. Firebase covers refresh-token rotation natively.

### Sections rendered
- Core (always, all 4 dims)
- Auth/Session: 4 dims kept, 1 suppressed
- Multi-tenant: 3 dims kept, 1 suppressed

### Dimensions suppressed (Layer 2 filter)
- auth-session.Multi-tab-sync — reason: backend lane, not client; client lanes (P3/P4 future) handle
- multi-tenant.Noisy-neighbor — reason: scope-of-one MVP, no tenant contention possible

### Grade overrides
- Auth.CSRF: MVP `none` **accepted** (not escalated). Reason: API-only service with `Authorization: Bearer <token>` headers; no cookies, no ambient credentials, no CSRF surface. Mobile naturally immune. Spec red-line satisfied per "API-only services with bearer-token auth" exemption.
- Auth.Refresh-token: default MVP long-lived → **Ent** rotating. Reason: Firebase Auth handles refresh-token rotation natively — zero code cost.
- Multi-tenant.Row-isolation: default MVP `WHERE tenant_id` → **Ent** RLS policy. Reason: app-level `WHERE` clauses are opt-in — one missed query = ownership leak. Postgres RLS keyed off `ownership_scope_id` with deny-by-default policy is defense-in-depth mandatory for SC-07/SC-08.

### Δ deferred by tier choice
- L × 2 (Core.Testing, Core.Abstractions)
- M × 3 (Auth.TokenRefresh ΔE→S, Auth.SessionInvalidate ΔE→S, MT.AuthZ ΔE→S)
- S × 3 (Core.Error ΔE→S, Auth.CSRF ΔE→S, Auth.RefreshToken ΔE→S)

Load-bearing items deferred:
- MT.Audit-logging at Ent (event log) — immutable/WORM deferred to Scale for compliance hardening later
- MT.AuthZ at Ent (per-tenant RBAC) — ABAC/OPA deferred until roles proliferate

### Review trigger
- Cookie-based session introduced (escalate Auth.CSRF to Ent double-submit token)
- Household multi-user MVP activates (scope-of-one → scope-of-N; re-test RLS policies)
- Second tenant-class added (per-tenant rate-limit Noisy-neighbor becomes relevant)

### Status
- accepted

---

## D4 — Phase 4 tier: ent (2026-04-23)

**Phase:** Consent + processing register + DSR
**Types:** data, multi-tenant
**Tier chosen:** ent
**Prototype:** no
**Reason:** Four-jurisdiction compliance (Law 21.719 + GDPR + PIPEDA + CCPA/CPRA) is a hard legal constraint at MVP per SCOPE §9.4. Audit event log required to prove DSR processing.

### Sections rendered
- Core (always, all 4 dims)
- Data: 3 dims kept, 1 suppressed
- Multi-tenant: 3 dims kept, 1 suppressed

### Dimensions suppressed (Layer 2 filter)
- data.Indexing — reason: few lookups, simple consent-by-user queries
- multi-tenant.Noisy-neighbor — reason: scope-of-one MVP

### Grade overrides
- None — baseline Ent across all kept dimensions

### Δ deferred by tier choice
- L × 2 (Core.Testing, Core.Abstractions)
- M × 5 (Data.Schema/Migration/Backup ΔE→S; MT.AuthZ/Audit ΔE→S)
- S × 1 (Core.Error ΔE→S)

Load-bearing items deferred:
- MT.Audit-logging at Ent event-log — immutable/WORM Scale deferred until first audit

### Review trigger
- New jurisdiction added (re-scope DSR endpoint coverage)
- Regulatory enforcement action against similar-class service
- Audit log volume exceeds queryable threshold (escalate to immutable sink)

### Status
- accepted

---

## D5 — Phase 5 tier: ent with Obs→Scale override (2026-04-23)

**Phase:** Observability pipeline
**Types:** core-only
**Tier chosen:** ent (base) with Core.Observability upgraded to Scale
**Prototype:** no
**Reason:** REQ-21 + U8 mandate structured logs + metric exporter + per-scan metric columns at P1 exit. The phase IS observability — exporter is the deliverable, not a nice-to-have.

### Sections rendered
- Core (always, all 4 dims)

### Dimensions suppressed
- None

### Grade overrides
- Core.Observability: Ent → **Scale**. Reason: REQ-21 specifies per-scan metric columns (`llm_tokens_in`, `llm_tokens_out`, `llm_cost_usd`, `scan_duration_ms`, `llm_latency_ms`, `queue_wait_ms`, `thumbnail_gen_ms`) + structured logs + metric export. Core tier ladder: MVP `print/log` → Ent `structured` → Scale `+metrics+traces`. Metric exporter is Scale-tier dim — upgrade mandatory.

### Δ deferred by tier choice
- L × 2 (Core.Testing, Core.Abstractions)
- S × 1 (Core.Error ΔE→S)

Load-bearing items deferred:
- Core.Testing happy-path — load eval + fuzz deferred to Scale (not needed at launch volume)
- Core.Abstractions 1-interface — strategy+DI Scale deferred until 3+ exporter backends

### Review trigger
- Metric schema REQ-21 changes
- OTel/Prometheus replaced with other backend
- Per-scan metric count exceeds cardinality budget

### Status
- accepted

---

## D6 — Phase 6 tier: mvp (2026-04-23)

**Phase:** Exit-signal smoke test
**Types:** core-only
**Tier chosen:** mvp
**Prototype:** no
**Reason:** default MVP pick per U2 — happy-path E2E assertion, no new infra, no new abstractions. Proves P2–P5 integrate per ROADMAP §Phase-1 exit signal.

### Sections rendered
- Core (always, all 4 dims)

### Dimensions suppressed
- None

### Grade overrides
- None — all dims at MVP baseline

### Δ deferred by tier choice
- L × 2 (Core.Testing happy-path, Core.Abstractions inline) — deliberate; edge/load coverage lands in per-feature phases
- L × 1 (Core.Error fail-loud)
- M × 1 (Core.Observability print/log — phase uses existing P1 + P5 infra; no new log schema)

Load-bearing items deferred:
- None — smoke test is assertion-only; no production code surface

### Review trigger
- P1 REQ set expands
- Exit-signal definition changes in ROADMAP

### Status
- accepted

---

## Batch note — ux-mockups lane plan tier decisions (D7–D19)

**Scope:** All 13 phases of the ux-mockups lane plan created 2026-04-23.

**Domain note:** ux-mockups lane produces design deliverables (HTML mockups, tokens, flow walkthroughs, handoff docs) — not runtime code. The tier framework dimensions in `tier-section-index.md` (testing coverage, observability, scalability, data integrity, migration safety) are code-production-oriented and mostly moot for mockup artifacts. Per-phase matrix rendering was **batched** rather than rendered 13 times because nearly every design phase defaults to MVP with the same rationale. Where Ent is picked (P3, P12, P13), the reasoning is captured below. `--full-catalog` option remains available if mid-lane a phase warrants per-dimension scrutiny.

**Values alignment:**
- U2 (Plan Light, Build Real) — MVP default for 10 of 13 phases
- V5 (Prove It Works) — P13 audit tier = ent ensures evidence gate at lane exit

---

## D7 — ux-mockups P1 tier: ent (escalated from mvp 2026-04-23)

**Phase:** Design language + tokens
**Types:** `design-system`
**Tier:** ent | **Prototype:** no
**Reason (original mvp):** default MVP pick per U2. Theme exploration iterative; locking early premature. Tokens refine in P3 feedback loop.

### Tier escalation — 2026-04-23 (mid-phase, pre-exec)

- **From:** mvp → **To:** ent
- **Trigger:** user clarification + legacy investigation (mid-Phase-1, before any code shipped)
- **Root cause of escalation:** original D7 assumed single-theme-locked model (`pick winner → lock tokens`). User clarified + legacy `bmad/boletapp/docs/mockups/` evidence confirmed: gastify ships **runtime multi-theme** (Normal/Pro/Mono × light/dark = 6 variants alive in-app), not locked winner. Plus platform split expanded from 2 surfaces to **3 surfaces** (Desktop Web responsive / Mobile Web PWA limited / Native Mobile iOS+Android RN full). Plus stress-test methodology requires 4 screens × N themes × 3 platforms, not dashboard-only.
- **Reinstates dimensions:**
  - `design-system.Token-architecture` → Ent (multi-theme scheme with light/dark variants, not flat single-theme)
  - `design-system.Platform-frames` → Ent (3 platform conventions documented, not mobile-only)
  - `design-system.Stress-test-breadth` → Ent (4-screen stress test, not dashboard-only)
  - `design-system.State-matrix` → Ent (hero + variant states per screen per PLAN convention)
- **Reason (ent):** load-bearing for all downstream phases (P2 atoms, P3 molecules, P5–P12 screens) — a token-architecture mistake here propagates to 28+ screens. Legacy path proved the pattern works (boletapp `data-theme`+`data-mode` CSS strategy, 6 style prompts, 708-line gallery hub). Porting + extending is lower-risk than clean-slate rebuild.
- **Alternatives rejected:**
  - Stay MVP single-winner-lock → invalidated by user: screenshots show runtime multi-theme, not single choice
  - Clean-slate per original PLAN note → discards 28 legacy screens + 13 flows + 6 style prompts = ~$work already paid

**Sections reinstated:** design-system (was suppressed under MVP rationale, now active at Ent)
**Review trigger:** Escalate further (scale) only if cohort theme customization per REQ-27 surfaces OR native platforms diverge enough to require per-platform token forks.
**Status:** accepted

---

## D8 — ux-mockups P2 tier: mvp (2026-04-23)

**Phase:** Atomic components
**Types:** `design-system, ui-kit`
**Tier:** mvp | **Prototype:** no
**Reason:** default MVP pick per U2. Atoms are simple — happy-path variants enough; state matrix belongs to P3 molecules.
**Review trigger:** Escalate if P5-P12 screens need atomic variants missing here.
**Status:** accepted

### drift-accepted — 2026-04-24 (Phase 2 review)

- **Pattern:** `prefers-reduced-motion` reduce-handlers in `atoms.css` (`.skeleton::after` line 370 + `.spinner` line 456)
- **Tier floor:** Enterprise (per design-system tier section); phase tier remains mvp
- **Source:** /gabe-review consolidated pass (codex+claude both flagged as TIER_DRIFT-LOW)
- **Disposition:** keep code, accept drift — `prefers-reduced-motion` is unambiguously beneficial a11y; ripping it out to honor MVP tier would degrade vestibular-disorder UX. Drift is the right answer. No phase tier amendment.
- **Future trigger:** if a 3rd reduced-motion site appears in a non-atom layer at MVP tier, revisit whether to formally promote design-system.Motion to Ent in this phase's `dim_overrides`.

---

## D9 — ux-mockups P3 tier: ent (2026-04-23)

**Phase:** Molecular components
**Types:** `design-system, ui-kit`
**Tier:** ent | **Prototype:** no
**Reason:** Molecular components are load-bearing infra for P5-P12 (nine screen phases). Full state matrix (default/hover/active/focus/disabled/loading/error) + WCAG AA contrast verification pays off because every screen reuses these. Under-specifying here creates rework compounded nine times.
**Δ deferred vs MVP:** MVP molecules happy-path-only → would force re-audit at P13 to fill gaps. Enterprise now = audit-once.
**Review trigger:** Escalate to scale if we add a 3rd platform (e.g., desktop native) beyond web + mobile.
**Status:** accepted

---

## D10 — ux-mockups P4 tier: mvp (2026-04-23)

**Phase:** Flow map index + REQ×screen matrix
**Types:** `flows, index`
**Tier:** mvp | **Prototype:** no
**Reason:** default MVP pick per U2. Living doc rewritten through P5-P12; over-spec at creation wastes effort.
**Review trigger:** P13 audit will reveal if index gaps blocked coverage verification.
**Status:** accepted

---

## D11 — ux-mockups P5 tier: mvp (2026-04-23)

**Phase:** Auth + onboarding + consent
**Types:** `user-facing, auth`
**Tier:** mvp | **Prototype:** no
**Reason:** default MVP pick per U2. Mockup artifact only — real auth hardening happens in backend phases. Consent screens render 4 jurisdictions per REQ-20 but legal review of copy is a separate gate outside mockup tier.
**Status:** accepted

---

## D12 — ux-mockups P6 tier: mvp (2026-04-23)

**Phase:** Core capture loop
**Types:** `user-facing, capture, ai-agent`
**Tier:** mvp | **Prototype:** no
**Reason:** default MVP pick per U2. Happy path + 5 scan states cover the critical surface; extended error/edge states moved to P12 (ent tier) where they get dedicated attention. REQ-26 QR/CAF boleta scoped as mode option inside Idle state per user direction.
**Status:** accepted

---

## D13 — ux-mockups P7 tier: mvp (2026-04-23)

**Phase:** Batch + statement flows
**Types:** `user-facing, capture, reconciliation`
**Tier:** mvp | **Prototype:** no
**Reason:** default MVP pick per U2. Happy + basic error coverage (credit warning, encrypted pw). Sync conflict + reconciliation edge cases land in P12.
**Status:** accepted

---

## D14 — ux-mockups P8 tier: mvp (2026-04-23)

**Phase:** History + items + insights
**Types:** `user-facing, data-view`
**Tier:** mvp | **Prototype:** no
**Reason:** default MVP pick per U2. Standard list views with established filter/sort/pagination patterns.
**Status:** accepted

---

## D15 — ux-mockups P9 tier: mvp (2026-04-23)

**Phase:** Trends + reports
**Types:** `user-facing, analytics, charts`
**Tier:** mvp | **Prototype:** no
**Reason:** default MVP pick per U2. Chart composition exploration; multiple chart types covered but empty/loading/partial-data chart states move to P12.
**Status:** accepted

---

## D16 — ux-mockups P10 tier: mvp (2026-04-23)

**Phase:** Groups (shared expenses)
**Types:** `user-facing, multi-tenant`
**Tier:** mvp | **Prototype:** no
**Reason:** default MVP pick per U2. Largest phase count (16 screens) but each screen simple. Mid-phase split into sub-waves allowed per plan risk table.
**Review trigger:** Split phase if mid-phase exec reveals screen count is blocking progress.
**Status:** accepted

---

## D17 — ux-mockups P11 tier: mvp (2026-04-23)

**Phase:** Settings + profile
**Types:** `user-facing, settings`
**Tier:** mvp | **Prototype:** no
**Reason:** default MVP pick per U2. CRUD forms with live-preview for preferences.
**Status:** accepted

---

## D18 — ux-mockups P12 tier: ent (2026-04-23)

**Phase:** Alerts + errors + offline states
**Types:** `user-facing, edge-cases`
**Tier:** ent | **Prototype:** no
**Reason:** Failure-mode surface is where users judge reliability. Happy-path-only mockups (pushed to P5-P11) hide the rough edges. This phase aggregates extended edge states — permission denied, rate limited, session expired, payment failed, sync conflict, data corruption recovery — in one place so the handoff engineer sees the complete failure taxonomy.
**Δ deferred vs MVP:** MVP errors cover only obvious states (offline, scan error) → handoff inherits undefined edge-state designs → frontend phases bake ad-hoc error handling.
**Review trigger:** Downgrade to mvp only if SCOPE tightens to happy-path MVP ship.
**Status:** accepted

---

## D19 — ux-mockups P13 tier: ent (2026-04-23)

**Phase:** Handoff + index hub + audit
**Types:** `documentation, validation`
**Tier:** ent | **Prototype:** no
**Reason:** Exit gate for all 12 prior phases. REQ×screen audit turns "we made mockups" into "we proved we covered SCOPE." MVP handoff (no audit, no a11y pass) = broken coverage guarantee — risk compounds because downstream frontend phases build from this deliverable.
**Δ deferred vs MVP:** MVP handoff HANDOFF.md-only, no audit → P12 output not verified complete → frontend phases discover gaps at implementation time.
**Review trigger:** None — audit tier is load-bearing for downstream frontend phases.
**Status:** accepted

---

## D22 — Centralized mockup hub pattern (Phase 4 amendment, 2026-04-24)

**Phase:** 4 — Flow map + INDEX + central hub (amendment, not a new phase)
**Types:** `mockup-flows, mockup-index`
**Tier:** mvp (unchanged)
**Prototype:** no
**Source:** `/gabe-plan update` invoked from inline `/plan` confirmation; user explicit "Layer A first, Layer B as follow-up"

**Pattern adopted:**
- One **principal** `docs/mockups/index.html` hub at the mockups root, with section cards per major content category (Design System, Atoms, Molecules, Flows, Screens, Handoff). Every section that produces many files gets a card; placeholder cards appear for not-yet-built sections so the hub is structurally complete from day one.
- Per-section **sub-hubs** at `<section>/index.html`. Each is a gallery of items in that section — currently `atoms/index.html` (10 atoms, built in Phase 2), `flows/index.html` (13 flow walkthroughs, built in this amendment), `molecules/index.html` (Phase 3 placeholder, built in this amendment).
- **Section-aware breadcrumb** auto-injected by `tweaks.js`: from any `/<section>/<name>.html` page, "← <section> index" links to `./index.html`; from any `/<section>/index.html` sub-hub, "← Mockups home" links to `../index.html`. The breadcrumb is rendered into the Tweaks panel header so every page has consistent navigation without per-page boilerplate.
- **Token alignment**: the existing top hub had its own inline `:root` block (lines ~13-27 of `docs/mockups/index.html`). Migrated to use `desktop-shell.css` canonical tokens (option a), accepting a small visual shift in exchange for theme-switcher consistency across the hub and the rest of the mockup surface.
- **Test coverage**: `tests/mockups/hubs.spec.ts` (renamed from `atoms-hub.spec.ts`) asserts principal hub loads, every section card link resolves, flows hub lists 13 cards, molecules placeholder reachable, and the full atom → atoms/index → mockups/home breadcrumb chain works.

**Reason — why centralize at this moment:**
- Phase 2 (atoms) shipped 10 atom HTMLs but `docs/mockups/index.html` had zero links to `atoms/index.html` — the atoms gallery was unreachable from the top.
- 13 flows existed at `docs/mockups/flows/flow-*.html` but were equally unreachable.
- Pattern stabilizes the convention: every new content section in P5-P12 (screens, handoff, edge-cases, etc.) gets a section-card on the principal hub + its own sub-hub. Linear scaling, low ceremony.

**Alternatives considered + rejected:**
- **Hand-authored single hub per project** (status quo): works once but reinvents structure on every new project; user explicit goal is reuse, so this fails the "Gustify" follow-up test.
- **Flat list of files at mockup root with no section grouping**: 58 screens + 13 flows + 10 atoms = unreadable wall of links past ~20 items.
- **Deep nested per-screen-phase HTML hubs** (e.g., `screens/auth/index.html`, `screens/capture/index.html`): overkill for Phase 4 mvp tier; section-level hubs are sufficient. Can split per-phase if individual sections balloon past ~30 items.
- **Markdown INDEX.md only, no HTML hub**: loses the visual gallery affordance designers and product reviewers want when scanning. Markdown INDEX.md stays as the engineer-facing 4-table doc (linked from the HTML hub).

**Δ deferred (Layer B):**
- L × 1 — **Layer B template extraction** to `gabe_lens/templates/mockup/`. Required to deliver the user's "next project gets it free" goal but explicitly out of scope for this Phase 4 amendment. Tracked separately as a follow-up; estimated 2-3h.

**Review trigger:**
- Layer B template extraction lands in `gabe_lens/` (revisit this entry then to record the extracted template paths).
- A 3rd section type beyond atoms / flows / molecules / screens / handoff requires hub treatment (revisit to confirm the per-section pattern still scales).
- The principal hub crosses ~12 section cards (revisit to consider grouping cards into super-sections).

---

## D23 — Per-platform mockup files (D18 cascade applied to mockups-legacy, 2026-04-27)

**Phase:** L2 — mockups-legacy: Molecules (in-progress amendment, not a new phase)
**Types:** `mockup-extracted, ui-kit`
**Tier:** mvp (unchanged)
**Source:** user invocation of `/gabe-mockup` after the suite-level skill ([`~/.claude/skills/gabe-mockup/SKILL.md`](~/.claude/skills/gabe-mockup/SKILL.md)) absorbed the gustify D18 convention.

**Pattern adopted:**
- **File triple per molecule.** Each molecule under `docs/mockups-legacy/molecules/` ships as four files:
  - `<slug>-mobile.html`   — wraps demo in `.screen-phone` (390 × 844)
  - `<slug>-tablet.html`   — wraps demo in `.tablet-surface` (820 × 1180)
  - `<slug>-desktop.html`  — wraps demo in `.desktop-surface` (1120 × 720)
  - `<slug>.html`          — landing page (3 platform-variant cards + composition crossrefs); preserves backlinks from anything that already linked the consolidated file.
- **Atoms unchanged.** Atoms have zero `@media` rules and render identically at every viewport, so per-platform files would be byte-identical noise. Single file per atom, no glyph in the atoms hub. Atoms HTML files lose any orphaned `body[data-viewport]` rules left over from the retired chip.
- **Tweaks panel viewport switcher retired.** `tweaks.js` no longer reads/writes `body[data-viewport]` and the chip is gone from the panel UI. Open the platform file directly to see the platform faithfully framed at any browser viewport.
- **Surface-scoped CSS overrides.** New section in `assets/css/molecules.css` keys layout adjustments on the wrapper class (`.screen-phone .toast { ... }`, `.tablet-surface .card-stat { ... }`, `.desktop-surface .toast { position: absolute; bottom: 24px; right: 24px; ... }`). This is the safety net that prevents `@media (max-width: …)` rules from firing desktop-style inside every surface when the file is opened on a wide browser viewport.
- **Surface chrome lives in `desktop-shell.css`.** `.screen-phone`, `.tablet-surface`, `.desktop-surface`, `.surface-frame`, `.surface-label`, `.not-applicable-here` are theme-token-aware and reusable from screens (L4) without copy-paste.
- **Helper script.** `scripts/gen_molecule_triples.py` defines per-molecule canonical demo + per-platform overrides (e.g., banner offline edge-bleed appears only in mobile, card-stat renders as 3-col grid on desktop / 2-col on tablet / stacked on phone). Discardable scaffolder — emits 4 files × N molecules, idempotent.

**Files generated for the 7 L2a molecules** (28 files total — 4 × 7):
- `banner` · `card-celebration` · `card-empty` · `card-stat` · `card-transaction` · `state-tabs` · `toast-system`

**Reason — why per-platform files instead of a single responsive file:**
- Trying to make ONE molecule render acceptably across mobile / tablet / desktop via a viewport chip + container queries forces design compromises (the "this kinda works at every width but isn't great at any" problem).
- More importantly, when three stacked surfaces (`.screen-phone` + `.tablet-surface` + `.desktop-surface`) appear in the same browser viewport, `@media`-driven CSS fires uniformly across all three — `bottom-nav { display: none }` at ≥ 1024px, `card-stat` grid layouts that respond to actual breakpoints, etc. Surface-scoped CSS partially mitigates this for `max-width` tweaks but cannot reach `display` / `position` / `grid-template` values that hinge on the actual viewport.
- File triples solve both: each file opens standalone, browser viewport matches surface dimensions, real `@media` rules fire correctly. Atoms get nothing because they have nothing to differentiate.

**Alternatives considered + rejected:**
- **Keep the viewport chip + add `body[data-viewport]` overrides for every responsive rule.** Tested: works for `max-width` clamps but fails for the layout-shift rules described above. Brittle as the molecule library grows.
- **Container queries (`@container showcase`) instead of viewport switcher.** Same blast radius problem — three nested containers, every `@container` matches based on the smallest one. Also forces all responsive rules to be containerized; raw `@media` becomes inert inside the wrapper.
- **Inline three-stacked-surface section in each consolidated `<molecule>.html`** showing the same demo at all three sizes. Failed in gustify cascade for the reasons above; documented in suite SKILL.md as the explicit anti-pattern.

**Forbidden patterns** (per the SKILL.md spec):
- Stacking multiple phone frames vertically per file. Use state-tabs for multi-state inside ONE frame.
- Authoring tablet variants via Tweaks chip. There is no chip.
- Adding `body[data-viewport=…]` rules anywhere — they're dead code now.
- Inserting a "Platform variants" section that renders three stacked surfaces showing the same demo.

**Δ deferred:**
- L × 1 — **L4 screens cascade.** Screens (P5–P12, deferred until L5) inherit the same convention: `<screen>-mobile.html` / `<screen>-tablet.html` / `<screen>-desktop.html` + landing. The `.screen-phone` / `.tablet-surface` / `.desktop-surface` helpers in `desktop-shell.css` are already in place.
- L × 1 — **Cross-platform parity audit at L5.** When the catalog phase runs, verify that the React port at `frontend/` honors the same surface-scoped invariants the file triples document.
- L × 1 — **Bespoke containers** (e.g., `.transaction-list-container` for showing a `card-transaction` inline inside a virtualized list, `.modal-overlay` for showing `card-empty` inside a popup) — author per-screen as L4 lands, not pre-emptively.

**Review trigger:**
- Any future molecule lands without all 4 files (signal: convention drift).
- Any screen in L4 lands as a single responsive file instead of a triple.
- The Tweaks panel grows a new "viewport-like" control (signal: re-revisit whether D23 still holds).

**Status:** accepted

**Status:** accepted

---

## D24 — Mockup-to-React pivot (legacy HTML mockups → React app + Storybook, 2026-04-28)

**Phase:** Independent of the L-block; effectively closes Phases L2a / L2b / L3-L5 by superseding their goal.
**Types:** `mockup-strategy, react-storybook`
**Tier:** mvp
**Source:** User-driven session 2026-04-28 — frustration with Opus 4.7 max-thinking failing to produce accurate HTML mockups despite a "dedicated frontend mockup app" already existing. Diagnostic: the React app at `frontend/` and the HTML mockups at `docs/mockups/` + `docs/mockups-legacy/` use different CSS engines (Tailwind CDN vs hand-rolled BEM), so the model was hand-translating between two styling systems with no canonical mapping. The 5 broken molecule triples (PENDING P12) traced back to that fork.

**Decision:** Stop authoring HTML mockups. Use the operational React app (`frontend/`) as the mockup surface, viewed through Storybook stories. Each new screen / atom / molecule becomes a Storybook story colocated with the React component. Mocked Firebase backend (already in place at `frontend/src/__firebase-mocks__/`) feeds real Transaction shapes through repositories so stories render with real data, not lorem ipsum.

**Plan reference:** `~/.claude/plans/okay-here-s-something-that-ancient-graham.md` — full architecture decision matrix (1A/1B/1C × 2A/2B/2C/2D × 3A/3B/3C). Picked 1A + 2A (later reversed to 2B per D25) + 3B.

**Pattern landed:**
- Phase 1: Tailwind CDN → built Tailwind 4 (`@tailwindcss/vite`) with theme tokens migrated to `frontend/src/styles/global.css`.
- Phase 2-3: Showcase tool installed (initially Ladle, later Storybook 10 per D25).
- Phase 4: Atom showcase stories (Colors / Typography / Icons) under `Atoms/` in Storybook sidebar.
- Phase 6: Dashboard screen story (`Screens/Dashboard`) — proved end-to-end that mounting `<DashboardView />` with no props renders the full screen via mocked Firestore + repositories.
- Post-pivot scaling: Trends + History stories shipped using the same pattern (commits 70600b4).

**Status:** accepted

---

## D25 — Pivot 2A→2B: Storybook 10 instead of Ladle (2026-04-28)

**Phase:** Reverses axis 2 of D24's architecture matrix.
**Types:** `mockup-strategy, react-storybook`
**Tier:** mvp
**Source:** User direction during the same session — they were using Storybook 9 in the sibling project and found it "ridiculously better than ladle." Triggered after several hours of debugging Ladle's iframe stylesheet propagation (manual `useMirrorStylesheetsToOwnerDoc` hack), Tailwind 4 `@source` directive coupling, theme/mode addon disambiguation, and viewport-default config schema mismatches.

**Decision:** Replace Ladle (`@ladle/react`) with Storybook 10 (`storybook` + `@storybook/react-vite` + `@storybook/addon-themes`). Storybook handles iframe CSS injection natively (preview.tsx imports auto-propagate), has the richer addon ecosystem the user expected, and matches the convention used elsewhere in their projects.

**Concrete changes:**
- `npm uninstall @ladle/react` → `npm install -D storybook @storybook/react-vite @storybook/addon-themes` (Storybook 10.3.5 installed)
- `frontend/.ladle/{config.mjs,components.tsx}` → `frontend/.storybook/{main.ts,preview.tsx}`
- The `useMirrorStylesheetsToOwnerDoc` hack (clones parent stylesheets into iframe head) deleted — no longer needed
- Story format unchanged (CSF3 was already compatible between Ladle + Storybook)
- Added `frontend/.storybook/preview-head.html` to inject Google Fonts (Outfit / Space Grotesk / Baloo 2) into the preview iframe
- `withThemeByClassName` decorator handles light/dark via `.dark` class swap; custom `colorTheme` global toolbar exposes Normal/Professional/Mono variants

**Verification:** 28-combination Playwright sweep (7 stories × 2 viewports × 2 themes) pre-Storybook migration, all passed. Post-migration, the same coverage was reproduced via Storybook iframe URLs.

**Status:** accepted (commit `1c54c34`)

---

## D26 — Storybook scope boundary: self-contained screens only (2026-04-28)

**Phase:** Reaction to the Phase 6.3 batch 1 revert (1c75ef4 → 5a39a10). Locks the scope of what Storybook covers vs what lives elsewhere.
**Types:** `mockup-strategy, react-storybook`
**Tier:** mvp
**Source:** Phase 6.3 batch 1 (story `IdleState` as `Flows/Scan/01-Idle`) shipped without proper visual verification. User flagged that translation keys were leaking to UI (`scanSinglePrompt` instead of "Tap to scan a receipt") and that IdleState — documented in `ScanFeature.tsx` as "optional - often handled by FAB" — wasn't the right component for the scan flow's "first step" framing. Both classes of bug traced back to the same root cause: forcing an orchestrator-driven flow into the Storybook surface required wrappers (Zustand store seeding, translation stub, etc.) and each wrapper introduced its own bug surface.

**Decision:** Storybook's scope is **atoms + molecules + self-contained screens only**. A screen is "self-contained" when:
- It mounts with `<View />` (no required props) OR with only optional `_testOverrides` of the type `Partial<UseXViewDataReturn>`
- It reads everything via hooks already provided by `frontend/.storybook/preview.tsx` (Firebase mocks + QueryClient + Auth)

**Excluded from Storybook:**
- **Orchestrator-driven flows** — components selected by a state machine (e.g., `ScanFeature.tsx` switching between `IdleState` / `CameraView` / `ProcessingState` / `ReviewingState` by `phase`).
- **Device-API-coupled views** — anything depending on `getUserMedia`, geolocation, file APIs requiring real browser permission flow.
- **Deep multi-context views** — screens that need >2 mocked contexts beyond what `preview.tsx` provides (e.g., `TransactionEditorView` with category-picker context + scan results + confidence wiring).

**For excluded views:** use the running app (`cd frontend && npm run dev`). For "see all states at once" overviews, author a per-flow reference doc under `docs/reference/<flow>.md` (canonical example: `docs/reference/scan-flow.md` shipped as Step 4 of the post-revert recommendation).

**Decision aid (5-row table) lives in `frontend/STORIES.md` "Scope boundary" section** so future contributors don't re-litigate.

**Status:** accepted (`frontend/STORIES.md` updated in commit `da4e022`; reference doc shipped in `6bb149e`)

---

## D27 — KDBP-only Phase 9 cleanup; don't move legacy mockup directories (2026-04-28)

**Phase:** Phase 9 of the pivot plan (originally specified "archive HTML mockups + spike-toast"). Substituted scope per cost/value evaluation.
**Types:** `mockup-strategy, kdbp-bookkeeping`
**Tier:** mvp
**Source:** Sizing pass before pulling the trigger on `git mv docs/mockups → docs/archive/`. ~1000 files across `docs/mockups/` (8.3 MB, 586 files), `docs/mockups-legacy/` (3.1 MB, 402 files), and `frontend/_spike-toast/` (148 KB, 16 files). Reference scan revealed active production dependencies on the `docs/mockups/` path: `package.json:serve:mockups`, `playwright.config.ts:webServer`, `tests/mockups/validate/runner.mjs` (hardcoded paths to `docs/mockups/screens` + `docs/mockups/assets/js/tweaks.js`), `tests/legacy-extract/` writes to `docs/mockups/atoms/legacy-snapshots/`.

**Decision:** Don't move the directories. Keep `docs/mockups/` and `docs/mockups-legacy/` in place as a **frozen baseline + test target**. Achieve the cognitive closure of "we are done with this layer" via KDBP updates only:
- Close PENDING.md P12 (`open` → `closed`) — see also D24/D25/D26 reasoning.
- Add D24 / D25 / D26 / D27 to DECISIONS.md (this entry).
- Update PLAN.md Current Phase from "L2 mockups-legacy Molecules" → "post-pivot scaling" with explicit note that L2a/L2b/L3-L5 are obsoleted by D24.
- Rewrite `docs/MOCKUP-REWORK-HANDOFF.md` as a Storybook + reference-doc pointer (drops the §3 first-deliverable framing — that target was met by the Dashboard story).

**Why not move directories:** moving 1000 files for symbolic-only value while breaking 4 config files and a working test harness contradicts the user's stated goal ("stop overcomplicating"). The substance of "archived" — no new work goes here, the React app is the source of truth — is achieved by KDBP updates. Filesystem layout staying as-is preserves the test harness baseline (gastify shows 0 active findings per the most recent validate run, per LEDGER 14:25 entry).

**Future opt-in:** if the directory layout needs to reflect archival status later (e.g., before open-sourcing), that's a separate, more careful migration that retires the test harness as a unit.

**Status:** accepted

---

## D28 — P2-Phase 1 tier: ent (2026-05-07)

**Phase:** Scan schema + V4 taxonomy + image processing
**Types:** `upload, data-migration, persistence`
**Tier chosen:** ent
**Prototype:** no
**Reason:** File/Media.Image-pipeline at Enterprise = resize-on-write. Image compression is load-bearing for the scan pipeline — reduces upload bandwidth, standardizes input dimensions for Gemini vision API, and produces thumbnails for UI. MVP cell `none` means raw image goes straight to Gemini (variable quality, wasted bandwidth, no thumbnail).

### Sections rendered
- Core (always, all 4 dims)
- File/Media: 2 dims kept, 3 suppressed
- Data: 2 dims kept, 2 suppressed

### Dimensions suppressed (Layer 2 filter)
- File/Media.Virus-scan — no virus scanning at MVP (add when upload volume warrants)
- File/Media.CDN — no CDN; local filesystem storage at MVP
- File/Media.Retention — no retention policy yet; images persist until explicit deletion
- Data.Backup/restore — infrastructure-level concern (P1 established), not per-phase
- Data.Indexing — scan table queries simple (by scan_id, by ownership_scope_id + status)

### Grade overrides
- None — Enterprise baseline across all kept dimensions

### Δ deferred by tier choice
- L × 2 (Core.Testing happy-path, Core.Abstractions inline)
- M × 1 (File/Media.Upload ΔE→S — resumable upload deferred)
- S × 1 (Core.Error ΔE→S — circuit breaker deferred)

Load-bearing items deferred:
- File/Media.Virus-scan at Enterprise (ClamAV) — add when upload volume makes malicious files a real risk
- File/Media.CDN at Enterprise (origin + edge cache) — add when multi-region deployment needed

### Review trigger
- Image storage backend changes (local FS → S3/GCS)
- Gemini accuracy drops with compressed images (adjust quality parameters)
- Upload volume exceeds local disk capacity

### Status
- active

---

## D29 — P2-Phase 2 tier: ent (2026-05-07)

**Phase:** Stage 1: Vision extraction worker
**Types:** `ai-agent, async-worker, queue`
**Tier chosen:** ent
**Prototype:** no
**Reason:** Three red-lines block MVP simultaneously: (1) AI/Agent.Structured-output — downstream consumer is code (math gate + persistence), regex parse is the documented anti-pattern per U4; (2) BG-jobs.Idempotency — scan deducts credits = money, duplicate processing = financial error; (3) BG-jobs.Dead-letter — dropped scan = silent data loss, unrecoverable without explicit DLQ.

### Sections rendered
- Core (always, all 4 dims)
- AI/Agent: all 4 dims
- Background jobs: 4 dims kept, 1 suppressed

### Dimensions suppressed (Layer 2 filter)
- BG-jobs.Scheduling — scans are user-initiated, not scheduled; no cron trigger

### Grade overrides
- None — Enterprise baseline across all kept dimensions

### Δ deferred by tier choice
- L × 2 (Core.Testing happy-path, Core.Abstractions inline)
- M × 3 (AI/Agent.Prompt-eval ΔE→S auto-eval CI; AI/Agent.Cost-budget ΔE→S SLO+alert; BG-jobs.Concurrency ΔE→S worker pool tuning)
- S × 1 (Core.Error ΔE→S circuit breaker)

Load-bearing items deferred:
- AI/Agent.Fallback-chain at Enterprise (1 retry + null) — multi-model cascade (Scale) deferred until second LLM provider justified
- BG-jobs.Concurrency at Enterprise (bounded worker pool) — worker pool tuning (Scale) deferred until scan volume warrants

### Review trigger
- Second LLM provider added (escalate Fallback-chain to Scale multi-model cascade)
- Scan volume exceeds SLO P95 30s (escalate Concurrency to Scale worker pool tuning)
- Per-scan cost exceeds budget (escalate Cost/latency to Scale SLO + alert)

### Status
- active

---

## D30 — P2-Phase 3 tier: ent (2026-05-07)

**Phase:** Stage 2: Categorization + math gate
**Types:** `ai-agent, persistence`
**Tier chosen:** ent
**Prototype:** no
**Reason:** AI/Agent.Structured-output red-line fires again — the categorization result (V4 taxonomy binding) feeds the math gate and Transaction persistence layer. Code consumes LLM output → `output_type` mandatory → Enterprise floor. Additionally, math-gate failures need typed errors (reconciliation_mismatch vs category_not_found vs extraction_timeout) to drive distinct downstream behavior (needs_review vs retry vs dead-letter).

### Sections rendered
- Core (always, all 4 dims)
- AI/Agent: all 4 dims
- Data: 2 dims kept, 2 suppressed

### Dimensions suppressed (Layer 2 filter)
- Data.Backup/restore — infrastructure-level concern (P1 established), not per-phase
- Data.Migration-safety — no new migration in this phase; schema ships in Phase 1

### Grade overrides
- None — Enterprise baseline across all kept dimensions

### Δ deferred by tier choice
- L × 2 (Core.Testing happy-path, Core.Abstractions inline)
- M × 3 (AI/Agent.Prompt-eval ΔE→S; AI/Agent.Cost-budget ΔE→S; Data.Schema-stability ΔE→S rollback+audit)
- S × 1 (Core.Error ΔE→S circuit breaker)

Load-bearing items deferred:
- Data.Schema-stability at Enterprise (migration file) — rollback + audit (Scale) deferred until production schema changes are frequent

### Review trigger
- V4 taxonomy grows past 100 categories (re-evaluate categorization prompt strategy)
- Math-gate tolerance needs per-currency tuning (adjust from 1 minor unit)
- Categorization accuracy drops below 90% on eval set

### Status
- active

---

## D31 — P2-Phase 4 tier: ent (2026-05-07)

**Phase:** Scan progress streaming
**Types:** `realtime, streaming`
**Tier chosen:** ent
**Prototype:** no
**Reason:** Real-time.Reconnection red-line fires — this is a user-facing scan progress stream. MVP `manual` (user reloads page on disconnect) means losing scan progress visibility mid-scan, which is the core UX promise (V2: Stream Progress). Additionally, the plan explicitly requires dual transport (SSE for web, WebSocket for mobile) — that's the Enterprise cell in Fallback-transport.

### Sections rendered
- Core (always, all 4 dims)
- Real-time: 3 dims kept, 2 suppressed

### Dimensions suppressed (Layer 2 filter)
- Real-time.Presence — single-user scan stream, no multi-user awareness needed
- Real-time.Message-order — scan pipeline events are naturally stage-ordered by processing phase, not reorderable

### Grade overrides
- None — Enterprise baseline across all kept dimensions

### Δ deferred by tier choice
- L × 2 (Core.Testing happy-path, Core.Abstractions inline)
- M × 1 (Real-time.Reconnection ΔE→S jitter + reconnect budget)
- S × 2 (Core.Error ΔE→S circuit breaker; Real-time.Fallback-transport ΔE→S long-poll)

Load-bearing items deferred:
- Real-time.Fallback-transport at Enterprise (SSE+WS) — long-poll last resort (Scale) deferred; SSE + WS covers all modern browsers and mobile clients

### Review trigger
- Stream event count exceeds 50/scan (re-evaluate backpressure policy)
- WebSocket proxy issues on restrictive networks (escalate Fallback-transport to Scale with long-poll)
- PENDING P18 BaseHTTPMiddleware conflict surfaces during SSE testing

### Status
- active

---

## D32 — P2-Phase 5 tier: mvp (2026-05-07)

**Phase:** Exit-signal + error case tests
**Types:** `core-only`
**Tier chosen:** mvp
**Prototype:** no
**Reason:** Test-only phase — ships no production code. The production code it exercises (Phases 1-4) is already at Enterprise tier. Test infrastructure needs happy-path testing of its own fixtures, fail-loud error propagation (assert failures), print/log for test output, and inline helpers. No domain-section red-lines fire.

### Sections rendered
- Core (always, all 4 dims)

### Dimensions suppressed
- None

### Grade overrides
- None — all dims at MVP baseline

### Δ deferred by tier choice
- L × 2 (Core.Testing happy-path, Core.Abstractions inline)
- L × 1 (Core.Error fail-loud)
- M × 1 (Core.Observability print/log)

Load-bearing items deferred:
- None — test-only phase, no production code surface

### Review trigger
- Exit-signal definition changes in ROADMAP §Phase-2
- Error case taxonomy expands beyond the 7 legacy types

### Status
- active

---

## D33 — P3-Phase 1 tier: ent (2026-05-13)

**Phase:** Web scaffold + OpenAPI client + auth
**Types:** `auth, spa`
**Tier chosen:** ent
**Prototype:** no
**Reason:** Firebase Auth SDK + TanStack Query + Zustand inherently operate at Enterprise level. Auto token refresh (Firebase native), tag/key cache invalidation (TanStack Query default), scoped stores (Zustand design) = Enterprise behavior with zero extra effort vs MVP. MVP would mean fighting the tools — manual refetch, component-scoped state, manual relogin.

### Sections rendered
- Core (always, all 4 dims)
- Auth/Session: 4 dims kept, 1 suppressed
- Client State: 3 dims kept, 4 suppressed

### Dimensions suppressed (Layer 2 filter)
- Auth/Session.Multi-tab sync — scaffold phase, multi-tab behavior deferred to Phase 4
- Client State.Optimistic updates — no mutations in scaffold phase
- Client State.Mutation propagation — no mutations in scaffold phase
- Client State.Cross-tab sync — deferred to Phase 4
- Client State.Offline support — SCOPE: online-required, not a variable

### Δ deferred by tier choice
- M × 2 (Auth.Token-refresh ΔE→S rotation+revoke, Auth.Session-invalidate ΔE→S device mgmt)
- S × 2 (Auth.CSRF ΔE→S SameSite+origin, Core.Error ΔE→S circuit breaker)
- M × 1 (Client State.Cache-invalidation ΔE→S selective+SWR)

Load-bearing items deferred:
- Auth.CSRF stays `none` — bearer-token-only API, no cookies (D3 precedent). CSRF XL delta neutralized.

### Review trigger
- Cookie-based session introduced (escalate CSRF)
- Web app auth model changes from Firebase

### Status
- accepted

---

## D34 — P3-Phase 2 tier: ent (2026-05-13)

**Phase:** Scan flow + streaming progress UI
**Types:** `upload, realtime, streaming`
**Tier chosen:** ent
**Prototype:** no
**Reason:** Real-time.Reconnection red-line fires — user-facing scan progress stream. MVP `manual` = user stares at dead scan UI on disconnect, reloads page, loses progress context. Auto-reconnect with exponential backoff is mandatory for the scan UX centerpiece.

### Sections rendered
- Core (always, all 4 dims)
- Real-time: 2 dims kept, 3 suppressed
- File/Media: 1 dim kept, 4 suppressed

### Dimensions suppressed (Layer 2 filter)
- Real-time.Backpressure — scan emits ~7 events total, not high-volume
- Real-time.Presence — single-user scan stream, no multi-user awareness
- Real-time.Fallback transport — web uses SSE only; WebSocket is mobile (P4)
- File/Media.Virus scan — backend concern, already decided in P2
- File/Media.CDN — backend serves images
- File/Media.Image pipeline — backend does compression (P2)
- File/Media.Retention — backend concern

### Δ deferred by tier choice
- M × 1 (Real-time.Reconnection ΔE→S jitter + reconnect budget)
- L × 1 (Real-time.Message-order ΔE→S gap detect + fill)
- M × 1 (File/Media.Upload ΔE→S multipart resume)

Load-bearing items deferred:
- File/Media.Upload stays MVP (direct-to-app POST) — backend handles storage

### Review trigger
- Stream event count > 50/scan
- SSE auth model changes
- PENDING P18 BaseHTTPMiddleware conflict

### Status
- accepted

---

## D35 — P3-Phase 3 tier: ent (2026-05-13)

**Phase:** Transaction ledger + detail + edit
**Types:** `client-state, user-facing`
**Tier chosen:** ent
**Prototype:** no
**Reason:** TanStack Query mutation/cache patterns + semantic HTML + optimistic edits are Enterprise-native. Primary data view — edit UX requires optimistic updates, mutation propagation, inline error recovery. Semantic HTML is the Enterprise a11y floor.

### Sections rendered
- Core (always, all 4 dims)
- Client State: 4 dims kept, 3 suppressed
- UI/UX: 3 dims kept, 1 suppressed

### Dimensions suppressed (Layer 2 filter)
- Client State.Cross-tab sync — deferred to Phase 4
- Client State.Offline support — SCOPE: online-required
- Client State.Store coupling — established in Phase 1
- UI/UX.Streaming — handled in Phase 2

### Δ deferred by tier choice
- M × 2 (Client State optimistic+mutation ΔE→S)
- L × 1 (UI/UX.A11y ΔE→S ARIA + keyboard)
- S × 1 (UI/UX.Loading-states ΔE→S optimistic render)

Load-bearing items deferred:
- UI/UX.A11y Scale (ARIA + keyboard) deferred to post-MVP accessibility pass

### Review trigger
- A11y audit reveals Scale-tier gaps
- Data view complexity spikes

### Status
- accepted

---

## D36 — P3-Phase 4 tier: ent (2026-05-13)

**Phase:** Sign-out isolation + responsive polish
**Types:** `auth, session, client-state`
**Tier chosen:** ent
**Prototype:** no
**Reason:** REQ-14 demands logout broadcast + multi-tab sync. SC-08 is load-bearing exit signal. MVP per-tab logout fails SC-08 — other tabs retain cached data. Enterprise `storage` event is the minimum viable cross-tab mechanism.

### Sections rendered
- Core (always, all 4 dims)
- Auth/Session: 3 dims kept, 2 suppressed
- Client State: 3 dims kept, 4 suppressed

### Dimensions suppressed (Layer 2 filter)
- Auth/Session.Token refresh — established in Phase 1
- Auth/Session.Refresh token — established in Phase 1
- Client State.Optimistic updates — established in Phase 3
- Client State.Stale data — established in Phase 1
- Client State.Mutation propagation — established in Phase 3
- Client State.Store coupling — established in Phase 1

### Δ deferred by tier choice
- M × 1 (Auth.Session-invalidate ΔE→S device management)
- S × 2 (Auth.CSRF ΔE→S, Client State.Cross-tab ΔE→S shared worker)

Load-bearing items deferred:
- Offline support stays MVP (SCOPE: online-required)
- CSRF stays `none` (D3 precedent)

### Review trigger
- Household multi-user activates
- 3+ client surfaces sharing session

### Status
- accepted

---

## D37 — P3-Phase 5 tier: ent (2026-05-13)

**Phase:** E2E journey + edge case tests
**Types:** `core-only`
**Tier chosen:** ent
**Prototype:** no
**Reason:** Escalated from default MVP. 8 edge tests close PENDING P6/P8/P9 and prove multi-tab SC-08 eviction. Page Object Model pays forward into P4 Mobile E2E.

### Sections rendered
- Core (always, all 4 dims)

### Dimensions suppressed
- None

### Edge cases covered
1. Scan failure → error-code-specific UX (closes PENDING P6)
2. Unknown merchant → first-scan affordance (closes PENDING P8)
3. Low confidence → confidence badge + review prompt (closes PENDING P9)
4. Edit with network failure → optimistic rollback + retry
5. Multi-tab sign-out → storage event broadcast (SC-08 edge)
6. Token refresh mid-scan → SSE reconnects
7. Double-submit scan → idempotent
8. Invalid file type → client-side rejection

### Δ deferred by tier choice
- M × 1 (Core.Testing ΔE→S fuzz + load eval)
- S × 1 (Core.Error ΔE→S circuit breaker)

### Review trigger
- Exit-signal definition changes
- New PENDING items surface

### Status
- accepted

---

## D38 — P4-Phase 1 tier: ent (2026-05-14)

**Phase:** Mobile scaffold + typed API + auth
**Types:** `auth, native-mobile, client-state`
**Tier chosen:** ent
**Prototype:** no
**Reason:** Native auth tokens must live in platform keystore/keychain and the app needs real Firebase token refresh plus a generated typed API client before any receipt or ledger flow lands. MVP-style manual token storage would create the exact sign-out and cache-leak risk P4 is meant to eliminate.

### Sections rendered
- Core (always, all 4 dims)
- Auth/Session: 4 dims kept, 1 suppressed
- Client State: 3 dims kept, 4 suppressed
- Native Mobile: 3 dims kept, 1 suppressed

### Dimensions suppressed (Layer 2 filter)
- Auth/Session.Multi-tab sync — web-only concern, replaced by native session eviction
- Client State.Optimistic updates — later Phase 3
- Client State.Mutation propagation — later Phase 3
- Client State.Cross-tab sync — not applicable to native mobile
- Client State.Offline support — SCOPE says online-required
- Native Mobile.App-store release — not part of MVP scaffold

### Δ deferred by tier choice
- M × 1 (Auth.Session-invalidate ΔE→S device management)
- S × 2 (Client State.Offline ΔE→S, Native Mobile.Release ΔE→S)

Load-bearing items deferred:
- Device fleet management stays out of scope until household/shared device requirements land
- App-store release hardening waits for launch packaging, not P4 scaffold

### Review trigger
- Auth provider changes
- Expo managed workflow no longer fits

### Status
- accepted

---

## D39 — P4-Phase 2 tier: ent (2026-05-14)

**Phase:** Camera scan + WebSocket progress
**Types:** `upload, realtime, streaming, native-mobile, file-media`
**Tier chosen:** ent
**Prototype:** no
**Reason:** Native camera capture and reconnecting WebSocket scan progress are core to the mobile receipt loop. A dead stream that requires manual reload fails the P4 exit signal, and file/camera permission states must be handled on both platforms.

### Sections rendered
- Core (always, all 4 dims)
- Real-time: 3 dims kept, 2 suppressed
- File/Media: 3 dims kept, 3 suppressed
- Native Mobile: 3 dims kept, 2 suppressed

### Dimensions suppressed (Layer 2 filter)
- Real-time.Presence — no collaborative presence model
- Real-time.Backpressure — scan event volume is low
- File/Media.CDN — receipt images are upload inputs, not public assets
- File/Media.Retention — backend retention policy owns lifecycle
- File/Media.Virus scan — not in current MVP mobile scope
- Native Mobile.Background upload — foreground scan flow only
- Native Mobile.App-store release — later packaging concern

### Δ deferred by tier choice
- M × 2 (Real-time.Backpressure ΔE→S, File/Media.Retention ΔE→S)
- S × 2 (Real-time.Jitter-budget ΔE→S, Native Mobile.Background upload ΔE→S)

Load-bearing items deferred:
- Scale-grade streaming budgets are deferred until scan event count or proxy behavior changes
- Background uploads are deferred because P4 proves a foreground scan journey

### Review trigger
- Stream events exceed roughly 50 per scan
- WebSocket proxy or auth model changes

### Status
- accepted

---

## D40 — P4-Phase 3 tier: ent (2026-05-14)

**Phase:** Mobile ledger + detail + edit
**Types:** `client-state, user-facing, native-mobile`
**Tier chosen:** ent
**Prototype:** no
**Reason:** Mobile edits are part of the primary product surface and must preserve REQ-13 `user_edited_at` precedence. Optimistic rollback and query invalidation are the minimum safe behavior when scan completion and manual edits share cached state.

### Sections rendered
- Core (always, all 4 dims)
- Client State: 4 dims kept, 3 suppressed
- UI/UX: 3 dims kept, 1 suppressed
- Native Mobile: 2 dims kept, 1 suppressed

### Dimensions suppressed (Layer 2 filter)
- Client State.Cross-tab sync — not applicable to native mobile
- Client State.Offline support — SCOPE says online-required
- Client State.Store coupling — Phase 1 establishes scoped stores
- UI/UX.Advanced accessibility — defer full audit after mobile MVP path exists
- Native Mobile.Background sync — offline/background sync out of scope

### Δ deferred by tier choice
- M × 1 (Client State.Offline ΔE→S)
- L × 1 (UI/UX.A11y ΔE→S)
- S × 1 (Native Mobile.Background sync ΔE→S)

Load-bearing items deferred:
- Offline edits stay deferred until product explicitly supports offline mode
- Full mobile accessibility audit follows after the first working screen set exists

### Review trigger
- Offline editing added
- Transaction data view complexity spikes

### Status
- accepted

---

## D41 — P4-Phase 4 tier: ent (2026-05-14)

**Phase:** Sign-out isolation + push registration + platform polish
**Types:** `auth, session, client-state, native-mobile, notifications`
**Tier chosen:** ent
**Prototype:** no
**Reason:** REQ-14 and REQ-25 are native lifecycle requirements, not polish. Sign-out must clear platform keystore/keychain, app stores, query caches, and cached receipt data; push registration must account for permission denial and unregister-on-sign-out.

### Sections rendered
- Core (always, all 4 dims)
- Auth/Session: 3 dims kept, 2 suppressed
- Client State: 3 dims kept, 2 suppressed
- Native Mobile: 3 dims kept, 1 suppressed
- Notifications: 3 dims kept, 2 suppressed

### Dimensions suppressed (Layer 2 filter)
- Auth/Session.CSRF — bearer-token native API, no cookies
- Auth/Session.Custom refresh endpoint — Firebase owns refresh
- Client State.Optimistic updates — Phase 3 owns edit mutations
- Client State.Mutation propagation — Phase 3 owns edit mutations
- Native Mobile.App-store release — not a launch packaging phase
- Notifications.Campaigning — product notifications only
- Notifications.Quiet hours — Scale notification policy deferred

### Δ deferred by tier choice
- M × 1 (Auth.Session-invalidate ΔE→S device management)
- S × 2 (Notifications.Policy ΔE→S, Native Mobile.Release ΔE→S)

Load-bearing items deferred:
- Remote device management waits for household/shared-device scope
- Notification preference policy waits until concrete alert types exist

### Review trigger
- Household devices become part of MVP
- Push delivery rules or notification categories expand

### Status
- accepted

---

## D42 — P4-Phase 5 tier: ent (2026-05-14)

**Phase:** Mobile E2E journey + edge tests
**Types:** `core-only, native-mobile, test`
**Tier chosen:** ent
**Prototype:** no
**Reason:** The ROADMAP exit signal originally required device-level proof across both mobile runtimes, including keystore/cache eviction. Unit-only coverage cannot prove native camera permissions, WebSocket lifecycle, or platform storage cleanup. Maestro is the selected P4 E2E runner; Detox remains a fallback only if Maestro blocks the phase. D43 amends the local Android lane from simulated builds to physical Samsung S23 hardware. D47 amends closure again: iOS runtime testing is deferred post-roadmap, and current Phase 5 closes on Android/S23 runtime proof.

### Sections rendered
- Core (always, all 4 dims)
- Native Mobile: 2 dims kept, 2 suppressed

### Dimensions suppressed (Layer 2 filter)
- Native Mobile.App-store release — not a distribution phase
- Native Mobile.Deep linking — not needed for the core scan journey

### Edge cases covered
1. Camera permission denied
2. File/image validation failure
3. WebSocket disconnect and reconnect
4. Scan failure event
5. Unknown merchant / low confidence review state
6. Edit network failure with optimistic rollback
7. Token refresh mid-stream
8. Push permission denied
9. Sign-out after scan/edit clears native token + query/cache state

### Δ deferred by tier choice
- M × 1 (Core.Testing ΔE→S fuzz + load eval)
- S × 1 (Native Mobile.Device farm ΔE→S)

Load-bearing items deferred:
- Physical device farm and load testing are deferred until pre-launch packaging

### Review trigger
- Exit-signal definition changes
- CI/device availability changes

### Status
- accepted

---

## D43 — P4 Android E2E execution lane pivot (2026-05-15)

**Phase:** Mobile E2E setup and Phase 5 runway
**Types:** `native-mobile, test`
**Tier chosen:** ent
**Prototype:** no
**Reason:** The local Android emulator path is a poor fit for this workstation. It created multi-GB generated state (`mobile/android/`, `.android-sdk-shim/`, local JDK/platform-tools) and still left Maestro unstable across the WSL-to-Windows ADB boundary. A physical Samsung S23 over USB gives a better Android proof surface for the actual native risks: camera permission, SecureStore/keystore behavior, app cache eviction, push permission, and real device networking.

### Execution posture
- Keep WSL for fast JS/config checks.
- Build Android APKs through EAS first to avoid local Gradle/prebuild resource churn.
- Install and smoke on the Samsung S23.
- Run Maestro only when ADB and Maestro see the same authorized device from the same host side.

### Deprecated
- Local WSL Android emulator as the default P4 lane.
- WSL ADB bridge experiments.
- Repo-local Android SDK shim generation.
- Local non-admin JDK/platform-tools installers for emulator retries.

### Alternatives considered
- Continue the WSL emulator bridge: rejected because it already failed through DADB/ADB stream instability.
- Keep local Gradle/prebuild as the primary lane: rejected because it regenerates large disposable native folders and competes with the workstation's RAM/CPU.
- Start with Firebase Test Lab: deferred until the APK and data-reset story are stable; useful for compatibility evidence, not the first deterministic proof.

### Review trigger
- S23 USB lane fails.
- CI/mobile hardware lane becomes available.

### Status
- accepted

---

## D44 — Receipt prompt v2-dev.9 accepted prompt-lab state with review-warning risks (2026-05-20)

**Phase:** P4 Phase 2D receipt prompt evaluation contract
**Types:** `ai-prompt, scan-pipeline, user-facing, risk-acceptance`
**Tier chosen:** ent
**Prototype:** no
**Reason:** The v2-dev.9 14-case no-cache prompt-lab batch has correct final payable transaction totals for every remaining threshold failure, zero provider/cache evidence blockers, and zero `significant_failure` cases. Remaining strict failures are acceptable as reviewable scan quality issues rather than blockers, provided the runtime/app surface does not silently treat them as perfect extractions.

### Accepted state
- `receipt-extraction-v2-evidence@2026-05-20.v2-dev.9` is the accepted prompt-lab candidate state for now.
- Production prompt promotion still requires staging-e2e S23 fixture proof and staging live Gemini proof.
- Minor item-name mismatches, generic service-line labels, synthesized service rows, weighted quantity/unit detail gaps, and small item amount discrepancies are accepted as user-review/edit concerns.
- P1 remaining risk is not "fix every minor detail before proceeding"; it is "surface a review signal when reconstruction evidence indicates something may be wrong."

### Runtime/UI requirement carried forward
- Preserve the extracted item order as the canonical receipt-order view so a user can compare the item list side by side with the receipt image.
- Category grouping must be a secondary view over the same items, not a replacement for receipt order.
- Any scan with math failure, item-count mismatch, receipt-discount mismatch, or meaningful item amount discrepancy should be eligible for a visible review warning.
- Item names are expected to remain user-correctable.

### Accepted risks
- Users may see imperfect item names or categories on otherwise financially correct scans.
- Users may need to review discount-heavy or promotional receipts, especially when extra rows or small discount deltas appear.
- Small amount discrepancies can produce review warnings even when final payable total is correct.
- Analytics based on quantity/unit price may be less reliable until weighted-item detail work is improved.

### Alternatives considered
- Continue prompt iteration until zero strict threshold failures: rejected for now because the remaining failures are minor-review and final totals are correct.
- Promote silently with no warning concept: rejected because discount/math/item-count mismatches should be visible to users.
- Treat category grouping as the only item view: rejected because receipt-order comparison against the image is a core correction workflow.

### Review trigger
- A future no-cache baseline introduces final-total failures or `significant_failure` cases.
- Runtime scan completion cannot expose enough diagnostics to drive review warnings.
- Mobile/web implementation drops original receipt order or only exposes category-grouped items.

### Status
- accepted

---

## D45 — Runtime scan review signals stay inside the G4 gravity well (2026-05-20)

**Phase:** P4 Phase 2D backend runtime-proof follow-up
**Types:** `scan-pipeline, data-model, api-contract, architecture`
**Tier chosen:** ent
**Prototype:** no
**Reason:** The accepted v2-dev.9 minor-review risks need a durable backend
signal before mobile/web can show warnings. The risk belongs primarily to the
scan pipeline: it is produced by extraction, deterministic postprocessing, and
math reconciliation, not by the UI.

### Decision
- Keep review-signal computation in G4 Scan Pipeline.
- Add one pure helper for signal construction instead of splitting the scan
  pipeline into many small rule modules.
- Cross into G2 Data Model only to persist `scan_review_level` and
  `scan_review_signals` on transactions.
- Cross into G1 API Core only to expose `review_level`, `review_signals`, and
  transaction read fields.
- Do not let manual transaction create/update set scan-owned review fields in
  this pass.

### Accepted risks
- Runtime warnings are diagnostic hints, not proof of a bad item.
- Live scans do not have prompt-lab baselines, so warning signals use only raw
  extraction, processed extraction, and math verdict evidence.
- Mobile/web warning presentation remains a follow-up; backend contract is the
  current scope.

### Alternatives considered
- Create a new review-signal gravity well: rejected because the behavior is
  still scan-pipeline-owned.
- Split `coalesce.py` into rule modules now: rejected because this pass can add
  the warning contract without increasing rule-module surface area.
- Build a shared runtime/prompt-lab engine now: deferred until the runtime
  signal contract proves stable.

### Review trigger
- Review-signal rules start depending on UI concerns or prompt-lab expected
  baselines.
- `coalesce.py` grows further and the helper no longer absorbs enough
  complexity.
- Mobile/web warning UI needs stronger typed details than the current signal
  contract provides.

### Status
- accepted

---

## D46 — Railway remains primary; Render fallback is deferred post-launch (2026-05-20)

**Phase:** Environment/deployment architecture decision
**Types:** `deployment-release, infrastructure, provider-risk, architecture-debt`
**Tier chosen:** ent
**Prototype:** no
**Reason:** The May 2026 Railway outage exposed real provider-concentration risk,
but Gastify's current MVP proof path is already built around Railway staging,
Railway Postgres, Railway-hosted API/web services, and S23 environment gates.
Migrating now would create more delivery risk than it removes. The correct
decision is to keep Railway as the current primary platform and record a
future Render fallback plan after the first production launch.

### Decision
- Railway remains the primary deployment platform for current staging,
  production cutover, and MVP launch work.
- Render is the selected future managed fallback platform to evaluate after
  production launch.
- The Render fallback is architecture debt, not an active migration.
- Current Railway runtime gates remain valid: `staging-e2e` fixture proof and
  `staging` live Gemini proof still close against Railway unless Railway itself
  remains unable to deploy or serve the required lanes.

### Future Render fallback scope
- Prove FastAPI backend deployment, WebSocket/SSE behavior, and health checks.
- Prove static SPA hosting or decide whether web stays on a separate CDN.
- Decide whether Render Postgres is acceptable or whether an external Postgres
  provider is needed.
- Replace or prove the scheduler posture if Render Postgres cannot support the
  current `pg_cron` assumption.
- Make receipt/document storage portable before depending on a second provider.
- Run a database backup/restore drill and a staging smoke before considering
  Render a real fallback.

### Alternatives considered
- Immediate migration to Render: rejected because it would interrupt the
  current Railway/S23 proof path and add platform churn before launch.
- Coolify/Hetzner: deferred because it reduces platform cost but turns backups,
  patching, monitoring, and restore drills into our operational burden.
- Cloud Run plus Cloud SQL: deferred because it raises cost/complexity and
  keeps the system concentrated on Google infrastructure.
- Fly.io, Koyeb, and Kuberns: deferred because they add either cost,
  operational uncertainty, or additional database-provider coupling before MVP.

### Review trigger
- Post-launch infrastructure hardening begins.
- Railway has another incident that blocks production cutover, runtime proof, or
  a critical production deploy.
- Receipt/document storage is moved away from Railway volumes.
- The scheduler/database posture changes away from `pg_cron` plus in-process
  fallback.

### Status
- accepted

---

## D47 — iOS runtime lane deferred post-roadmap (2026-05-24)

**Phase:** Mobile E2E journey + deferred platform proof
**Types:** `native-mobile, test, roadmap-scope`
**Tier chosen:** ent
**Prototype:** no
**Reason:** The current execution lane is Android on desktop/WSL with physical
Samsung S23 runtime evidence. Missing macOS/iOS simulator infrastructure should
not block the Android-first roadmap. The user explicitly chose to revisit iOS
after the full P1-P9 roadmap is implemented.

### Decision
- P4/Phase 5 runtime closure is Android/S23-only for the current roadmap cycle.
- iOS runtime testing is an explicit deferred lane, tracked in P31 and the
  ROADMAP deferred section.
- Existing cross-platform Expo/React Native code and iOS configuration may
  remain, but iOS simulator/device proof is not required before Phase 5 Review,
  Commit, or Push.
- The deferred iOS lane must come back with artifact-backed simulator/device
  evidence before iOS beta/TestFlight distribution is treated as launch-ready.

### Alternatives considered
- Keep iOS as a Phase 5 blocker: rejected because the current work scope is
  Android on desktop/WSL and the user chose to finish the roadmap first.
- Require macOS/TestFlight infrastructure now: rejected because it would switch
  the active proof lane away from the working S23 gate.
- Remove iOS from the product target entirely: rejected because the codebase
  remains cross-platform; only runtime proof is deferred.

### Review trigger
- P1-P9 roadmap implementation completes.
- iOS beta/TestFlight or App Store work begins.
- A team/device lane becomes available and the user explicitly pulls iOS forward.

### Status
- accepted

---

## D48 — P5 Phase 1 card alias + statement schema foundation tier: ent (2026-05-24)

**Phase:** P5-Ph1 Card alias + statement schema foundation
**Types:** `data-migration, persistence, auth, multi-tenant`
**Tier chosen:** ent
**Prototype:** no
**Reason:** Statement reconciliation starts with financial persistence and a PCI boundary. Card aliases must stay alias-only, statement rows must be ownership-scoped, and migrations/RLS need to be correct before upload, worker, web, or mobile phases depend on them.

### Sections rendered
- Core (always, all 4 dims)
- Data/Persistence: schema, migration, indexing, backup posture
- Auth/Session: ownership scope and session-bound access
- Multi-tenant: RLS and authorization checks

### Dimensions suppressed
- Native/mobile and web rendering dimensions — reason: this phase defines backend persistence only.
- Scale noisy-neighbor controls — reason: scope-of-one MVP plus Railway staging proof is enough until volume changes.

### Grade overrides
- Data.Schema: default MVP → **Ent**. Reason: statement lines, verdicts, aliases, and ownership scope become long-lived financial records.
- Multi-tenant.Row-isolation: Ent required. Reason: statement lines and aliases must follow existing ownership privacy guarantees.
- Auth.Authorization: Ent required. Reason: card aliases and statements cannot be readable outside the signed-in ownership scope.

### Δ deferred by tier choice
- Scale audit immutability and separate ledger store are deferred until reconciliation output becomes external-reporting grade.
- Advanced card metadata is rejected, not deferred, because it would enter PCI scope.

### Review trigger
- PCI-shaped fields appear in schema, API, UI, or fixtures.
- Ownership scope/card alias sharing model changes.
- Reconciliation output starts serving compliance or accounting export use cases.

### Status
- accepted

---

## D49 — P5 Phase 2 statement PDF upload + extraction worker tier: ent (2026-05-24)

**Phase:** P5-Ph2 Statement PDF upload + extraction worker
**Types:** `upload, file-media, ai-agent, async-worker, streaming`
**Tier chosen:** ent
**Prototype:** no
**Reason:** PDF upload and statement extraction combine file persistence, AI structured output, worker state, and user-visible progress. P5 cannot safely close with a synchronous parse stub or local-only proof.

### Sections rendered
- Core (always, all 4 dims)
- Upload/File-media: file validation, durable metadata, retention assumptions
- AI/Agent: structured output, typed failures, fixture/live provider separation
- Background jobs: retry/idempotency/dead-letter posture
- Real-time/Streaming: progress events over existing web/mobile channels

### Dimensions suppressed
- Scale multi-provider cascade — reason: one statement extraction path plus fixture/live gates is enough for P5.
- High-volume queue partitioning — reason: current SLO is statements <= 200 lines.

### Grade overrides
- AI.Structured-output: Ent required. Reason: downstream reconciliation treats extracted rows as code/data, not prose.
- Background-jobs.Idempotency: Ent required. Reason: duplicate uploads or retries must not duplicate financial lines.
- File-media.Persistence: Ent required. Reason: Railway-volume-backed proof is part of P5 closure.

### Δ deferred by tier choice
- Multi-provider extraction arbitration is deferred until extraction quality or availability requires it.
- Resumable uploads are deferred unless statement PDF size or mobile upload failure rates justify them.

### Review trigger
- A second statement extraction provider is added.
- Statement PDF volume or file size exceeds current worker/storage assumptions.
- Railway volume behavior blocks staging or production proof.

### Status
- accepted

---

## D50 — P5 Phase 3 reconciliation engine + coverage metric tier: ent (2026-05-24)

**Phase:** P5-Ph3 Reconciliation engine + coverage metric
**Types:** `persistence, user-facing, client-state`
**Tier chosen:** ent
**Prototype:** no
**Reason:** Matching statement lines to receipts is financial logic. The system needs persisted verdicts, deterministic tolerances, ambiguity handling, idempotent reruns, and user-edit precedence before clients can present coverage honestly.

### Sections rendered
- Core (always, all 4 dims)
- Data/Persistence: verdict rows, match provenance, idempotent reruns
- Client-state/User-facing contract: bucket and coverage semantics consumed by web/mobile

### Dimensions suppressed
- Scale ML matching and rule-marketplace behavior — reason: P5 only needs deterministic reconciliation.
- Collaborative review workflows — reason: household/multi-user statement review is not in this phase.

### Grade overrides
- Core.Error-handling: Ent typed reconciliation errors. Reason: ambiguous, no-match, and extraction-failed states must not collapse into generic failure.
- Data.Idempotency: Ent required. Reason: rerunning reconciliation cannot create duplicate verdicts or override user edits.
- Client-state.Contract: Ent required. Reason: coverage and buckets are the user-facing exit signal.

### Δ deferred by tier choice
- ML-assisted matching and learned merchant normalization are deferred until deterministic matching shows real gaps.
- Scale performance work beyond the <= 200-line SLO is deferred.

### Review trigger
- Match tolerances change.
- User correction workflow starts editing statement verdicts directly.
- Coverage metric becomes part of export/reporting commitments.

### Status
- accepted

---

## D51 — P5 Phase 5 web statement reconciliation flow tier: ent (2026-05-24)

**Phase:** P5-Ph5 Web statement reconciliation flow
**Types:** `web, user-facing, client-state, upload, realtime, file-media`
**Tier chosen:** ent
**Prototype:** no
**Reason:** The web flow is a primary P5 surface: card alias CRUD, PDF upload, progress, buckets, coverage, drilldown, and sign-out isolation. Browser proof against deployed Railway services is required before review.

### Sections rendered
- Core (always, all 4 dims)
- Web/UI: responsive stateful workflow, accessible controls, error recovery
- Upload/File-media: user-visible PDF upload states
- Real-time: SSE progress and reconnect behavior
- Client-state: cache isolation and query invalidation

### Dimensions suppressed
- Scale collaborative review and reporting exports — reason: not required for P5 closure.
- Offline web support — reason: statement uploads depend on online API/worker behavior.

### Grade overrides
- Real-time.Reconnection: Ent required. Reason: upload/extraction progress is user-visible and should recover without a manual reload.
- Client-state.Cache-isolation: Ent required. Reason: statement and reconciliation data cannot survive sign-out or cross-user transitions.
- Web.Accessibility/Semantics: Ent baseline. Reason: buckets, coverage, and actions are primary workflows, not mockups.

### Δ deferred by tier choice
- Advanced analytics/export views are deferred to later roadmap/reporting work.
- Multi-user reconciliation comments/assignment are deferred.

### Review trigger
- Web statement flow becomes shared household review.
- Bucket data is exported or used as a formal financial report.
- SSE middleware limitations resurface under P18.

### Status
- accepted

---

## D52 — P5 Phase 6 Android mobile statement reconciliation flow tier: ent (2026-05-24)

**Phase:** P5-Ph6 Android mobile statement reconciliation flow
**Types:** `native-mobile, user-facing, client-state, upload, realtime, streaming, file-media`
**Tier chosen:** ent
**Prototype:** no
**Reason:** Android is the active native runtime lane. File picking, upload progress, WebSocket updates, cache isolation, and the S23 gate are native behaviors that cannot be closed by web or unit tests alone. iOS proof remains deferred by D47/P31.

### Sections rendered
- Core (always, all 4 dims)
- Native-mobile: document picker, navigation, platform storage/cache behavior
- Upload/File-media: PDF upload from device
- Real-time/Streaming: WebSocket progress and reconnect behavior
- Client-state: TanStack/store cache cleanup and session transitions

### Dimensions suppressed
- iOS runtime proof — reason: explicitly deferred post-roadmap by D47/P31.
- Scale device farm/offline-first statement sync — reason: S23 staging-e2e proof is the current runtime closure standard.

### Grade overrides
- Native runtime proof: Ent required. Reason: S23 evidence is the roadmap gate for Android-on-desktop work.
- Real-time.Reconnection: Ent required. Reason: statement progress should recover from transient mobile network changes.
- Client-state.Cache-isolation: Ent required. Reason: statement data must clear on sign-out.

### Δ deferred by tier choice
- iOS simulator/device proof is deferred to the post-roadmap iOS lane.
- Offline-first statement uploads and background sync are deferred.
- Device-farm compatibility is deferred until launch-hardening.

### Review trigger
- iOS beta/TestFlight work begins.
- Offline statement review becomes a product requirement.
- Android runtime artifacts stop being reproducible on the S23 lane.

### Status
- accepted

---

## D53 — P5 Phase 7 exit gate + edge tests tier: ent (2026-05-24)

**Phase:** P5-Ph7 P5 exit gate + edge tests
**Types:** `core-only, test, web, native-mobile`
**Tier chosen:** ent
**Prototype:** no
**Reason:** P5 closure must prove the complete statement reconciliation journey, not only that code was written. The exit signal spans migrations, Railway services, worker behavior, web UI, Android/S23 runtime, and financial edge cases.

### Sections rendered
- Core (always, all 4 dims)
- Test: integration, browser, mobile runtime, artifact integrity
- Web: deployed user journey proof
- Native-mobile: Android/S23 runtime proof

### Dimensions suppressed
- Load tests beyond the 200-line statement SLO — reason: current bound is explicit in SCOPE.
- iOS runtime proof — reason: D47/P31 defers it beyond this roadmap cycle.

### Grade overrides
- Core.Testing: Ent required. Reason: encrypted PDFs, duplicates, ambiguous matches, sign-out mid-stream, and user-edit precedence are P5 financial safety cases.
- Runtime evidence: Ent required. Reason: Railway and S23 artifact proof is the accepted gate before review.
- Observability: Ent baseline. Reason: worker/event failures must be diagnosable during staging proof.

### Δ deferred by tier choice
- Scale load/performance suite beyond the current SLO is deferred.
- Formal data export/report validation is deferred until reporting roadmap work.
- iOS runtime closure remains deferred.

### Review trigger
- P5 exit signal changes.
- Statement SLO changes beyond <= 200 lines / 2 minutes P95.
- Runtime evidence cannot be captured cleanly on Railway or S23.

### Status
- accepted

---

## D54 — P5 Phase 0 statement corpus + extraction contract preflight tier: ent (2026-05-25)

**Phase:** P5-Ph0 Statement corpus + extraction contract preflight
**Types:** `ai-agent, test, file-media, data-contract`
**Tier chosen:** ent
**Prototype:** no
**Reason:** The statement lane touches private banking PDFs, encrypted/password-protected documents, AI extraction contracts, prompt-lab scoring, and a no-PCI card boundary. The runtime schema and UX should not be built until the corpus and output contract are explicit.

### Sections rendered
- Core (always, all 4 dims)
- AI/Agent: prompt identity, structured output, fixture/live separation
- File-media: PDF import, encryption detection, password-state handling
- Test/Data contract: manifest integrity, schema validation, scoring boundaries

### Dimensions suppressed
- Runtime web/native UI — reason: Phase 0 is pre-runtime and should not build user surfaces.
- Database migration — reason: statement table design waits for the Phase 0 contract review.
- Scale provider orchestration — reason: Gemini iteration begins after Codex/manual baselines exist.

### Grade overrides
- File-media.Privacy: Ent required. Reason: raw statements and credentials must stay uncommitted while committed manifests remain useful.
- AI.Structured-output: Ent required. Reason: statement lines become reconciliation inputs and cannot be free-form prose.
- Test.Contract: Ent required. Reason: receipt scoring must not be reused for statement PDFs.

### Δ deferred by tier choice
- Runtime statement upload, worker persistence, web, and Android flows remain deferred until Phase 0 review.
- Full Gemini prompt optimization is deferred until Codex/manual expected files exist.
- iOS runtime proof remains deferred by D47/P31.

### Review trigger
- Statement output contract changes.
- Private corpus location or credential-handling policy changes.
- Gemini statement prompt promotion begins.

### Status
- accepted

---

## D55 — P5 Phase 4 statement Gemini prompt lab + coalesce gate tier: ent (2026-05-25)

**Phase:** P5-Ph4 Statement Gemini prompt lab + coalesce gate
**Types:** `ai-agent, prompt-lab, data-contract, test`
**Tier chosen:** ent
**Prototype:** no
**Reason:** Live statement extraction quality should be proven in a provider-quality prompt-lab lane before runtime Gemini promotion. The phase needs a statement-specific PDF runner, encrypted PDF preflight, cache/no-cache evidence, coalesce diagnostics, cost artifacts, scoring, reconciliation effects, and explicit failure ownership.

### Sections rendered
- Core (always, all 4 dims)
- AI/Agent: Gemini PDF runner, prompt identity, structured output, provider errors
- File-media: encrypted PDF handling and in-memory decryption only
- Test/Data contract: expected fixture scoring, coalesce artifacts, batch readiness report

### Dimensions suppressed
- Web/native UI — reason: UI can build against stable API contracts after provider quality is measured separately.
- Scale multi-provider orchestration — reason: first gate is representative Gemini evidence, not provider marketplace hardening.
- Full 24-PDF production corpus promotion — reason: representative three-case evidence is the Phase 4 exit gate; full corpus expansion is later hardening.

### Grade overrides
- AI.Structured-output: Ent required. Reason: statement lines feed reconciliation and cannot be free-form provider text.
- File-media.Privacy: Ent required. Reason: raw PDFs, credentials, decrypted bytes, PAN/CVV/expiry, and raw statement text must not leak into committed artifacts.
- Test.Contract: Ent required. Reason: the batch report must classify prompt, coalesce, provider/PDF, baseline truth, and expected-fixture gaps before runtime promotion.

### Δ deferred by tier choice
- Full corpus expansion beyond the representative issuer set is deferred.
- Runtime Web and Android UI gates remain separate Phases 5 and 6.
- Scale provider fallback/cascade behavior is deferred until Gemini quality evidence exposes a need.

### Review trigger
- Runtime statement extraction provider switches from fixture/Codex path to live Gemini.
- Representative Gemini runs contain unclassified provider, prompt, coalesce, PDF/OCR, or expected-fixture failures.
- The statement extraction contract changes.

### Status
- accepted
