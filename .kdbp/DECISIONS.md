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
| D56 | 2026-05-28 | P6-Ph1 Analytics contract + seeded 3-month corpus tier = ent | Analytics will become a user-visible trust surface; fixture-backed deterministic contracts prevent taxonomy, currency, and user-edit drift before UI work | Build charts first; derive expected outputs manually during UI review; use production data as the first validation set | active | Analytics schema changes OR taxonomy parent model changes |
| D57 | 2026-05-28 | P6-Ph2 Rollup + gravity-center engine tier = ent | Monthly top categories and gravity centers must be deterministic, explainable, ownership-scoped, cache-safe, and stable under user edits | Client-side aggregation; black-box anomaly score; Scale event-sourced analytics pipeline | active | Baseline thresholds change OR analytics volume exceeds current cache strategy |
| D58 | 2026-05-28 | P6-Ph3 Item flag persistence + exclusion semantics tier = ent | Item flags are personal privacy/context markers; aggregate exclusion must not mutate transaction detail or leak into future shared/cohort contexts | Store flags as display-only client state; delete flagged items from reports; Scale policy engine for all item annotations | active | Household sharing or cohort benchmarking consumes item flags |
| D59 | 2026-05-28 | P6-Ph4 Web insights + flag review flow tier = ent | Web P6 is a primary user-facing analytics surface with cache invalidation, flag mutation, sign-out cleanup, and deployed browser proof requirements | Static dashboard without mutation; mobile-only insights first; Scale interactive report builder | active | Web analytics adds export/reporting or collaborative review |
| D60 | 2026-05-28 | P6-Ph5 Android insights + flag review flow tier = ent | Android/S23 remains the runtime mobile proof lane; the insights journey must prove native cache cleanup, flag mutation, and category drilldowns | Web-only analytics; unit-only mobile proof; Scale offline analytics cache | active | iOS lane is pulled forward OR offline analytics becomes required |
| D61 | 2026-05-28 | P6-Ph6 Exit gate + performance evidence tier = ent | P6 closure must prove the roadmap <=20s top-5 bound, aggregate exclusion, cache behavior, web rendering, and S23 runtime artifacts on staging | Golden-path-only tests; defer performance to P7; Scale load/performance suite beyond staged fixture volume | active | P6 exit signal changes OR staging proof cannot meet the 20s target |
| D62 | 2026-06-03 | Feature-parity Phase 3 Batch scanning = N sequential single-scans + per-scan GET-poll to terminal + post-persist review; tier mvp | No batch backend endpoint exists and the scan worker auto-persists each scan into a transaction, so "review before save" is impossible — review is post-persist (monitor → summary of saved/needs-review/failed → per-item open/edit, or discard via the Phase-2 batch-delete API). GET-poll (not the single-scan SSE/WS) keeps batch within mvp tier — Real-time.Reconnection is ent (D31/D34), and N hardened reconnecting streams would breach the tier cap. | Dedicated batch endpoint (unneeded; N× existing POST /scans); N reconnecting SSE/WS streams (ent-tier overkill at mvp); client-held pre-save review (impossible — backend auto-persists) | active | Batch volume needs concurrency/throttle OR a batch backend endpoint lands OR the review needs inline merchant/amount (would re-introduce per-item transaction fetch or streaming) |

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

**Amendment (2026-06-07, see D89).** The erasure IMPLEMENTATION chosen here was anonymize-in-place (keep rows, scrub PII). P16 D89 changes it to HARD-DELETE the user's own data + keep only the PII-free `dsr_erasure` audit event. D4's audit-event REQUIREMENT is preserved (the event survives); only the data-row handling changed (anonymize → hard-delete), to honor D82's "delete everything".

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

---

## D56 — P6 Phase 1 analytics contract + seeded 3-month corpus tier: ent (2026-05-28)

**Phase:** P6-Ph1 Analytics contract + seeded 3-month corpus
**Types:** `data-contract, analytics, test`
**Tier chosen:** ent
**Prototype:** no
**Reason:** Analytics will become a user-visible trust surface. The contract needs deterministic expected outputs before UI work so taxonomy parent rollups, currency treatment, user-edited fields, statement-created transactions, and item flags do not drift silently.

### Sections rendered
- Core (always, all 4 dims)
- Data: schema stability, fixture integrity, migration awareness
- Analytics: rollup semantics, expected outputs, explainability
- Test: fixture-backed contract tests and regression evidence

### Dimensions suppressed
- Web/native UI — reason: later phases own rendering.
- Scale data warehouse — reason: fixture-backed transactional queries are enough before launch.
- Cohort/DP aggregation — reason: P9 owns cohort benchmarking.
- Report export — reason: launch reports are not part of P6.

### Grade overrides
- Data.Contract: Ent required. Reason: downstream web/mobile views and P7 compliance checks depend on stable analytics semantics.
- Test.Expected outputs: Ent required. Reason: top-5 and gravity-center results must be reproducible from seeded data.
- Analytics.Explainability: Ent required. Reason: deterministic parent rollups are part of the product promise, not cosmetic detail.

### Δ deferred by tier choice
- Scale warehouse/OLAP pipeline is deferred.
- Cohort benchmarking and DP noise are deferred to P9.
- Export/report-generation hardening is deferred.

### Review trigger
- Analytics response schemas change.
- Canonical taxonomy parent relationships change.
- Statement-created transactions change how they enter analytics.

### Status
- accepted

---

## D57 — P6 Phase 2 rollup + gravity-center engine tier: ent (2026-05-28)

**Phase:** P6-Ph2 Rollup + gravity-center engine
**Types:** `analytics, data-view, persistence`
**Tier chosen:** ent
**Prototype:** no
**Reason:** Monthly insights and gravity centers are user-facing financial interpretation. They must be deterministic, explainable, ownership-scoped, cache-safe, and stable under user edits.

### Sections rendered
- Core (always, all 4 dims)
- Data: query shape, cache invalidation, ownership isolation
- Analytics: top categories, trailing baseline, growth/shrink thresholds
- Data-view: drilldown support and response shape

### Dimensions suppressed
- Black-box ML anomaly detection — reason: roadmap requires deterministic explainability.
- Scale materialized analytics warehouse — reason: current volume can use transactional queries plus focused caching.
- Cohort comparison — reason: P9 owns cohort analytics.

### Grade overrides
- Analytics.Determinism: Ent required. Reason: the user must understand why a category is growing or shrinking.
- Data.Cache invalidation: Ent required. Reason: user edits, statement-created transactions, and item flags must refresh aggregates correctly.
- Multi-tenant isolation: Ent required. Reason: analytics queries are privacy-sensitive.

### Δ deferred by tier choice
- Scale event-sourced analytics pipeline is deferred.
- Automated threshold learning is deferred.
- Cross-user cohort baselines are deferred.

### Review trigger
- Gravity-center thresholds change.
- Analytics latency exceeds the 20-second roadmap bound.
- Cache invalidation becomes inconsistent after transaction or item mutations.

### Status
- accepted

---

## D58 — P6 Phase 3 item flag persistence + exclusion semantics tier: ent (2026-05-28)

**Phase:** P6-Ph3 Item flag persistence + exclusion semantics
**Types:** `data-migration, persistence, user-facing, multi-tenant`
**Tier chosen:** ent
**Prototype:** no
**Reason:** Item flags are personal privacy/context markers. Aggregate exclusion must be explicit and reversible, while the source transaction remains visible and future shared/cohort contexts cannot leak another user's personal annotations.

### Sections rendered
- Core (always, all 4 dims)
- Data: migration, schema constraints, auditability
- Multi-tenant: user-private ownership and future household safety
- UI/UX: mutation semantics and transaction-detail visibility

### Dimensions suppressed
- Full household sharing policy — reason: household UI is not in MVP.
- Scale policy engine — reason: two current flag types do not need a general rules engine.
- Tax/reporting flags — reason: explicit non-goal.
- Recurring-series automation — reason: statement recurrence fields already exist but automation is out of scope.
- Cohort suppression automation — reason: P9 owns cohort flow.

### Grade overrides
- Data.Migration safety: Ent required. Reason: item-level financial records must remain intact.
- Multi-tenant.Row isolation: Ent required. Reason: flags are personal-only and must not bleed into shared contexts.
- UI/UX.Error recovery: Ent required. Reason: flag mutations must not leave aggregate and detail views contradictory.

### Δ deferred by tier choice
- Scale annotation policy engine is deferred.
- Household/shared-ledger flag controls are deferred.
- Cohort-specific suppression wiring is deferred to P9.

### Review trigger
- Household sharing lands.
- Cohort benchmarking consumes flagged item state.
- New flag classes are added beyond urgency/special-case.

### Status
- accepted

---

## D59 — P6 Phase 4 web insights + flag review flow tier: ent (2026-05-28)

**Phase:** P6-Ph4 Web insights + flag review flow
**Types:** `web, user-facing, client-state, data-view`
**Tier chosen:** ent
**Prototype:** no
**Reason:** Web P6 is a primary user-facing analytics surface. It must prove deployed rendering, cache invalidation after flag changes, drilldowns, and sign-out cleanup rather than only static dashboard markup.

### Sections rendered
- Core (always, all 4 dims)
- Web: deployed browser journey and responsive behavior
- Client State: cache keys, invalidation, stale data controls
- UI/UX: data density, drilldown, loading/error states

### Dimensions suppressed
- Full report builder — reason: P6 only needs monthly insights and drilldown.
- Export/PDF output — reason: not part of the roadmap exit signal.
- Collaborative review — reason: household sharing is post-MVP.
- Offline analytics — reason: web runtime is online-first.

### Grade overrides
- Client State.Cache invalidation: Ent required. Reason: flagged items must disappear from aggregates immediately while staying in transaction detail.
- Web.Runtime proof: Ent required. Reason: roadmap closure requires deployed browser evidence.
- UI/UX.Accessibility baseline: Ent required. Reason: analytics tables and controls are primary product surfaces.

### Δ deferred by tier choice
- Scale report builder and exports are deferred.
- Offline-first web analytics are deferred.
- Household/collaborative analytics views are deferred.

### Review trigger
- Web insights adds exports or complex custom report filters.
- Analytics cache behavior diverges from Android.
- Browser proof cannot meet the top-5 visibility bound.

### Status
- accepted

---

## D60 — P6 Phase 5 Android insights + flag review flow tier: ent (2026-05-28)

**Phase:** P6-Ph5 Android insights + flag review flow
**Types:** `native-mobile, user-facing, client-state, data-view`
**Tier chosen:** ent
**Prototype:** no
**Reason:** Android/S23 remains the mobile runtime proof lane. The insights journey must prove native rendering, category drilldowns, item flag mutation, aggregate refresh, and sign-out cleanup on the physical device path.

### Sections rendered
- Core (always, all 4 dims)
- Native Mobile: S23 runtime proof, app storage, navigation
- Client State: cache invalidation and mutation recovery
- UI/UX: compact analytics layout and drilldown behavior

### Dimensions suppressed
- iOS runtime proof — reason: D47/P31 defers iOS post-roadmap.
- Offline-first analytics cache — reason: not required for MVP.
- Device farm coverage — reason: S23 is the accepted current hardware lane.
- Push/notification behavior — reason: P6 insights has no push requirement.

### Grade overrides
- Native runtime proof: Ent required. Reason: roadmap closure requires Android/S23 artifacts.
- Client State.Sign-out cleanup: Ent required. Reason: analytics data is authenticated user data.
- UI/UX.Mobile data density: Ent required. Reason: top categories and drilldowns must remain usable on phone viewport.

### Δ deferred by tier choice
- iOS runtime proof remains deferred.
- Scale device-farm testing is deferred.
- Offline analytics sync is deferred.

### Review trigger
- iOS lane is pulled forward.
- Offline analytics is added.
- S23 lane stops being reproducible.

### Status
- accepted

---

## D61 — P6 Phase 6 exit gate + performance evidence tier: ent (2026-05-28)

**Phase:** P6-Ph6 P6 exit gate + performance evidence
**Types:** `core-only, test, web, native-mobile, analytics`
**Tier chosen:** ent
**Prototype:** no
**Reason:** P6 closure must prove the roadmap exit signal across backend, web, and Android/S23: 3-month seeded data, top-5 visible within 20 seconds, gravity-center output, item flag aggregate exclusion, cache behavior, and sign-out cleanup.

### Sections rendered
- Core (always, all 4 dims)
- Test: backend, web, mobile, artifact integrity
- Web: deployed browser proof
- Native Mobile: Android/S23 proof
- Analytics: seeded expected outputs and performance timing

### Dimensions suppressed
- Scale load/performance suite beyond seeded fixture volume — reason: P7 owns launch hardening.
- Production journey smoke — reason: production testing requires separate cutover approval.
- iOS runtime proof — reason: D47/P31 defers iOS post-roadmap.

### Grade overrides
- Core.Testing: Ent required. Reason: exit gate is the proof package for the roadmap phase.
- Runtime evidence: Ent required. Reason: web and S23 artifacts must support phase closure.
- Analytics.Performance: Ent required. Reason: <=20s app-open-to-visible is a roadmap bound.

### Δ deferred by tier choice
- Scale analytics load suite is deferred to P7 if needed.
- Production smoke is deferred until cutover approval.
- iOS proof remains deferred.

### Review trigger
- P6 exit signal changes.
- Staging proof cannot meet the 20-second visibility target.
- P7 launch hardening requires broader analytics load evidence.

### Status
- accepted

## D62 — Real-time scan/statement progress: polling fallback now (Path A), Redis bus + durable workers deferred behind measurable triggers (Path B) (2026-05-30)

**Decision.** Fix the broken mobile progress delivery with a **REST polling fallback** in the mobile progress hooks (Phase 0 / "Path A"): when the progress WebSocket fails or stalls, poll the existing authoritative status endpoints (`GET /api/v1/scans/{id}`, `GET /api/v1/statements/{id}`) until terminal. **Defer** the horizontally-scalable redesign — a Redis-backed pub/sub dispatcher replacing the in-process in-memory `asyncio.Queue` dispatcher, plus a durable worker queue replacing in-process `BackgroundTasks` ("Path B") — behind explicit, measurable triggers (below). Record the full phased path (Phase 1 SSE transport → Phase 2 Redis bus → Phase 3 durable workers) for the future.

**Context / root cause (discovered via S23 device e2e against deployed Railway staging).** Scan/statement processing completes correctly server-side (statement done in ~11s, `error_code: None`), but the mobile UI sits at "queued 0%" forever. Cause: the app receives progress over a **WebSocket** (`/ws/scans/{id}`, `/ws/statements/{id}`); against Railway the WS handshake returns **403** while the backend's equivalent **SSE** endpoint (`/api/v1/statements/{id}/events`) returns **200 and streams correctly** (same token; auth proven fine). The progress/stream/middleware code is unchanged since this flow last passed (2026-05-28), so this is a Railway-edge / WS-handshake behavior — not a code regression. Research indicates a 403 (vs 404/timeout) most likely means the app/uvicorn rejects the upgrade behind the proxy (candidate fix: uvicorn `--proxy-headers --forwarded-allow-ips="*"`), with Railway's 15-min connection cap + ~45s idle reap as additional constraints on any long-lived transport.

**Two-axis framing (the load-bearing insight).** The problem has two orthogonal axes: **Axis A — edge transport** (the 403: how bytes reach the client) and **Axis B — fan-out / horizontal scale** (how an event reaches the connection-holding process). The progress dispatcher is an **in-process in-memory singleton** (`backend/app/services/scan_events.py:62`, `statement_events.py:97` — module-level, holding `asyncio.Queue`s), fed by **in-process `BackgroundTasks`** (`scans.py:107,151`, `statements.py:112,168,295`). This works **only with exactly one API instance**: with 2+ replicas, a client's stream on replica A and processing on replica B (emitting to B's in-memory dispatcher) never meet — regardless of transport. Switching WS→SSE fixes Axis A only; it does **not** fix Axis B.

**Rationale for Path A now.** (1) It is the **only option already multi-replica-safe** — polling reads shared Postgres `status`, so it is replica-independent by construction, which uniquely makes adding uvicorn workers / Railway replicas safe (impossible today under the in-process dispatcher). (2) **Zero backend/infra change**, lowest blast radius, reversible. (3) It fixes the user-facing 403 immediately and unblocks the S23 device flows. (4) For a multi-user app, polling's capacity ceiling (Postgres + Gemini RPM) is far higher than the single-event-loop ceiling it replaces. Accepted cost: **coarser progress granularity** (DB-status milestones, not sub-step streamed events) and a small steady DB-read load proportional to concurrent active jobs (mitigated by jittered/adaptive polling + status caching).

**Alternatives considered.**
- **(b) Switch mobile WS → existing SSE endpoints.** Fixes Axis A with smoother UX; backend SSE already built + tested. Rejected for *now*: needs a React Native SSE client (`react-native-sse` — Expo dev-build bug #27526 + backgrounding caveat), more blast radius than polling, and still single-instance for fan-out. Retained as **Phase 1**.
- **(c) uvicorn `--proxy-headers --forwarded-allow-ips="*"` (keep WS).** Cheapest *potential* WS repair (1 line + redeploy). Rejected as the primary fix: unverified until redeployed, and WS is the **worst** load-balancer fit (Railway: no sticky sessions across replicas → WS bounced) — a dead-end for multi-user scale. May be tried opportunistically but does not change the phased path.
- **(d) Redis dispatcher + durable worker queue now (Path B).** The real horizontal-scale fix. Rejected for *now*: high blast radius (new Redis infra, backend changes, new failure modes) to solve a multi-replica load we do not have on a single instance today. Retained as **Phase 2 + 3**.

**Capacity estimate (config-derived; validate via load test).** Bound by **peak concurrent active scans**, not registered-user count. Binding constraints: DB pool `5+10=15` (`db.py:11`), single uvicorn worker (no `--workers`), Gemini `gemini-2.5-flash-lite` ~2 calls/scan (I/O-bound), free-tier usage ≈50 scans/month/user. Rough: **~5,000–15,000 registered users untuned**; **~50,000–150,000 with config-only knobs** (pool↑, jittered/adaptive polling, status cache, add workers/replicas — all polling-safe), then bound by Postgres + Gemini RPM. **Load test must use the existing `scan_provider=mock`/`fixture` + `statement_provider=fixture` paths with `e2e_scan_event_delay_ms` to simulate latency — ZERO Gemini calls / $0** (mock/fixture are blocked in production by config guard, so run against a dedicated load env). Gemini's own RPM/TPM ceiling is computed analytically, never load-tested live.

**Path B triggers (measurable, armed in this ADR).** Move Phase 2 (Redis bus) **before any 2nd API replica** is added. Move Phase 3 (durable workers) **before sustained concurrent processing degrades p95 request latency or in-flight-job loss on deploy is unacceptable**. Concretely, escalate when monitoring shows: peak concurrent active scans approaching Gemini RPM limits, OR Postgres connection-pool saturation / pool-wait p95 climbing despite added workers/replicas, OR a product need for smooth sub-step streaming at scale. Not "at N users" — these are the real signals.

**Status:** accepted.

**Review trigger:** (a) load-test results contradict the capacity estimate; (b) decision to add a 2nd replica (forces Phase 2); (c) the uvicorn proxy-headers experiment changes the transport calculus; (d) Railway changes its WS/edge behavior.

### Amendment (2026-06-02) — Load test validates capacity estimate

Zero-Gemini load test (Phase 2) confirms D62's capacity estimate. Run against `gastify-api-staging-e2e` with `scan_provider=fixture`, `e2e_scan_event_delay_ms=600`, $0 Gemini cost.

**Results at three concurrency levels (C=concurrent scan lifecycles):**
- **C=1**: 0% errors, status poll p95=1677ms, 1.5 req/s — comfortable.
- **C=5**: 0% errors, status poll p95=1616ms, 4.5 req/s — healthy, near-linear scaling.
- **C=15**: 0.11% errors, poll p99=29,442ms, 4 poll timeouts, 1 HTTP 500 — pool saturated.

**Bottleneck confirmed: DB connection pool** (`pool_size=5 + max_overflow=10 = 15`). At C=15 the pool is fully utilized; tail latency spikes and some workers/pollers fail to acquire connections. CPU, network, and Gemini RPM (fixture = $0) are not the binding constraint.

**D62 estimate validated:** 5 concurrent scans comfortable with untuned pool=15, degradation onset at 15 concurrent. At 50 scans/month/user, 5 concurrent ≈ 5,000–10,000 registered users — consistent with D62's "~5,000–15,000 untuned" lower bound. Config-only levers (pool↑, workers↑, replicas↑) provide 10x+ headroom before Path B is needed.

**Path B trigger status (unchanged):** no trigger fired. Pool saturation at C=15 is resolved by config-only tuning, not architecture change. Path B remains deferred until post-tuning saturation or multi-replica fan-out need.

Full report: `scripts/loadtest/CAPACITY-REPORT.md`. Raw data: `scripts/loadtest/results.json`.

### Amendment (2026-05-30) — Path B is Postgres-native-first; bus/queue/streaming design stays an OPEN architecture decision

Refines D62's Path B (deferred). The founding architecture decision is **FastAPI + Postgres, minimize moving parts** (Postgres deliberately does work other components might) — and Path A adds **zero** new runtime components, so Path B must be evaluated against the same minimalism.

- **Preferred Path B implementation = Postgres-native (no new datastore):**
  - *Fan-out (Phase 2's job):* Postgres **`LISTEN/NOTIFY`** (native to `asyncpg`, zero new dep) — or skip a bus entirely, since **polling already makes fan-out replica-safe** (reads the shared status row). Redis-pub/sub would only buy smoother streaming UX, not correctness.
  - *Durable jobs (Phase 3's job):* Postgres **`SELECT … FOR UPDATE SKIP LOCKED`**, e.g. the **`procrastinate`** async Postgres-only task queue (LISTEN/NOTIFY wakeup + SKIP LOCKED durability). Replaces Celery/arq **and** Redis with a `jobs` table; the only genuinely new deployment unit is a **worker process** (talks only to Postgres — no new technology).
- **Redis = throughput-triggered escalation, not the default.** Adopt Redis (pub/sub bus and/or queue broker) only when **measured** load exceeds the Postgres-native ceiling — `LISTEN/NOTIFY` connection pressure (pool=15) / NOTIFY-rate bottleneck, or the SKIP-LOCKED queue throughput ceiling / vacuum-bloat pressure. The capacity estimate puts that well above the near-term horizon.
- **Open architecture decision (explicitly NOT locked here).** The concrete Path-B bus/queue/streaming design — Postgres-native vs **Redis** (Pub/Sub or Streams) vs an event-streaming platform like **Kafka/NATS/Redpanda** — is reserved for a dedicated architecture session **when a trigger fires, informed by measured load**, with updated architecture knowledge. Initial architect lean (to be challenged in that session): **Kafka/NATS are likely disproportionate** for our needs — they solve high-volume durable event streaming / event-sourcing / many-consumer fan-out at platform scale, a different problem class than "deliver a scan's progress to one owner + run a durable job queue." The expected ladder is **Postgres-native → Redis → (only at true event-platform scale) Kafka/NATS**, but the session may revise this if requirements shift (e.g., analytics event firehose, multi-product event bus, external integrations consuming our events).

**Status of amendment:** accepted. **Trigger for the architecture session:** any D62 Path-B trigger fires, OR a requirement emerges that needs durable multi-consumer event streaming (which would change the calculus toward a real bus/log).

## D63 — Phase 0/Phase 1 tier: mvp (2026-05-30)

**Phase:** Mobile polling fallback
**Types:** native-mobile, client-state, realtime, resilience
**Tier chosen:** mvp
**Prototype:** no
**Reason:** Focused resilience fallback — happy path + WS-fail/stall trigger + terminal stop is the honest baseline (U2). No backend change; reads existing Postgres-backed REST. Runtime evidence (S23 Maestro flows reaching reconciliation/scan-result) gates Exec.

### Sections rendered
- Core (always)
- Client-State / Realtime: relevant dims (polling cadence, reconnect/foreground reconcile, terminal detection)

### Dimensions suppressed (Layer 2 filter)
- none material at mvp

### Per-dim tier overrides (if any)
```yaml
dim_overrides: []
```

### Δ deferred by tier choice
- Ent-tier extras deferred: exhaustive backoff/jitter edge matrix, offline-queue of polls, telemetry on poll efficiency — fold in only if Phase 2 load data shows polling pressure.

### Review trigger (when to escalate this phase)
- Phase 2 load test shows poll-driven DB pool-wait climbing, OR users report "stuck" progress between milestones at a rate that needs richer client-side progress modeling.

### Status
- accepted

## D64 — Phase 2 tier: ent (2026-05-30)

**Phase:** Zero-Gemini load test + capacity validation
**Types:** test, performance, backend
**Tier chosen:** ent
**Prototype:** no
**Reason:** Load/capacity evaluation IS the deliverable (Core.Testing load-eval dimension), and it validates the multi-user capacity claim in D62 (~5–15k untuned / ~50–150k tuned). Escalation over mvp justified because the output is a capacity gate, not a smoke check.

### Sections rendered
- Core (always)
- Performance: load profile (ramp concurrency), saturation point, pool-wait p95, status-endpoint p95, throughput, error/timeout rate

### Dimensions suppressed (Layer 2 filter)
- Performance.Caching — reason: deferred; only add status caching if the load test proves the pool is the bottleneck (don't pre-optimize).

### Per-dim tier overrides (if any)
```yaml
dim_overrides: []
```

### Δ deferred by tier choice
- Scale-tier deferred: continuous/automated load regression in CI, real-Gemini soak (intentionally excluded — cost), multi-replica fan-out load (belongs to Path B).

### Review trigger (when to escalate this phase)
- Results contradict the D62 estimate, OR a decision to add a 2nd replica forces measuring fan-out (Path B territory).

### Load test outcome (2026-06-02)

Load test executed and validates D62. Pool saturation onset at C=15 confirms untuned capacity. No D62 triggers fired; config-only levers provide adequate headroom. Full analysis: `scripts/loadtest/CAPACITY-REPORT.md`.

### Status
- accepted (load test complete, estimate validated)

## D65 — Phase 3 tier: mvp (2026-05-30)

**Phase:** Path-B trigger instrumentation
**Types:** observability, backend, docs
**Tier chosen:** mvp
**Prototype:** no
**Reason:** Lightweight — reuse existing `app/observability.py` + middleware metrics to surface the D62 trigger signals (peak concurrent active scans, DB pool-wait, Gemini 429 rate) and document scaling levers + thresholds. No new infra; honest baseline.

### Sections rendered
- Core (always)
- Observability: metric surface for the three trigger signals + a runbook note

### Dimensions suppressed (Layer 2 filter)
- Observability.Tracing/Alerting — reason: metric exposure + a documented threshold is enough to arm the trigger; alerting wiring is a separate ops task.

### Per-dim tier overrides (if any)
```yaml
dim_overrides: []
```

### Δ deferred by tier choice
- Ent-tier deferred: automated alert rules / dashboards on the trigger signals — add when the team operationalizes on-call.

### Review trigger (when to escalate this phase)
- A D62 Path-B trigger approaches → promote to ent (real alerting/dashboards) as part of the architecture session.

### Status
- accepted

## D66 — Phase 1 scope discovery: add GET /scans/{id} + persist scan.transaction_id (corrects D62 premise) (2026-05-30)

**Decision.** Relax PLAN Phase 1's "mobile-only / no backend change" constraint to add a **minimal additive backend change**: (1) a nullable `scans.transaction_id` FK column (Alembic migration) set by the scan worker when it creates the transaction, and (2) `GET /api/v1/scans/{scan_id}` → `ScanResult` (ownership-scoped, mirrors the existing `GET /api/v1/statements/{statement_id}`). Both scan and statement progress then use true **REST Postgres-status polling** — uniform, replica-safe, Railway-correct (plain GET, no 403), cheap per tick.

**Why (surfaced by the Phase-1 understand→design workflow's adversarial critique, verified against source).** D62 stated Path A would "poll the existing authoritative status endpoints `GET /api/v1/scans/{id}` + `GET /api/v1/statements/{id}`" — but `GET /scans/{id}` **does not exist** (scans.py has only `POST ""` + `POST /{id}/process`), and the scan **completion payload is not persisted** (`ScanCompleteData`, incl. `transaction_id`, is built ephemerally in `scan_worker._scan_complete_data()` and stored only in the in-process dispatcher terminal snapshot; there is NO `scan.transaction_id` and NO `transaction.scan_id`). So a mobile-only scan fallback could only be a fragile SSE re-subscribe that delivers no in-flight progress and is single-instance-only — failing the replica-safety that is the entire point of Path A, and unable to drive the golden flow's `scan-view-transaction-button`.

**Decision detail (user chose "persist scan.transaction_id", the minimal correct option).** Persist only `transaction_id` (not the full amount summary). Under poll-fallback the scan completion panel renders `complete` + a working view-transaction navigation (golden flow passes); inline amounts/line-items remain delivered via the WS path when it works. This fills a genuine data-model gap (a scan that produced a transaction should record which one — queryable + durable + replica-safe), at the cost of one nullable column.

**Alternatives considered.** (B) status-only GET, no migration — rejected: scan completion can't navigate to its transaction under fallback, golden flow's view-transaction step fails, degraded UX. (C) persist the full completion summary (transaction_id + amounts) — deferred: bigger migration + more worker-sync surface than needed for Phase 1; revisit if fallback amount-parity is wanted.

**Net architecture impact.** Still **FastAPI + Postgres, no new runtime component** — one additive read endpoint + one nullable column. Consistent with D62's amendment (Postgres-centric, minimize moving parts).

**Status:** accepted. **Review trigger:** if fallback completion UX needs inline amounts (→ option C), or if a `transaction.scan_id` direction is later preferred for analytics.

> **D62 correction.** D62's Path-A description naming an existing `GET /api/v1/scans/{id}` was inaccurate; that endpoint is created here in D66. The statement endpoint (`GET /api/v1/statements/{id}`) did already exist. The two-axis finding and the rest of D62 stand.

## D67 — Backend connects via split least-privilege DB roles + startup RLS guard (P43; mirrors Gustify D32) (2026-06-01)

**Decision.** The backend no longer connects to Postgres as a superuser. Two dedicated **non-superuser** roles + a durable startup guard:
- **`gastify_app`** (runtime, `GASTIFY_DATABASE_URL`) — non-owner, table CRUD only, `NOSUPERUSER NOBYPASSRLS`. Because it is a non-owner, the existing RLS policies apply to it → tenant isolation is enforced at the database, not just in app-layer query filters.
- **`gastify_migrator`** (migrations, `GASTIFY_MIGRATION_DATABASE_URL`) — owns the tables so it can run DDL + `CREATE POLICY`, but still `NOSUPERUSER NOBYPASSRLS`.
- **Startup guard** (`app/db.py::assert_least_privilege_role`, called from the FastAPI lifespan): queries `pg_roles` for the connected role and **raises — refusing to boot — if it is superuser or `BYPASSRLS`**. Skips local + SQLite. This is the "can never silently regress" piece: a future misconfig (e.g. `GASTIFY_DATABASE_URL` pointed back at `postgres`) fails loudly at startup instead of silently re-disabling RLS.

The `postgres` superuser is used **once, operationally**, to provision the two roles (runbook), then never by the app.

**Why (P43, surfaced by the P32 PostgreSQL-executed RLS test).** PostgreSQL RLS is bypassed by superusers and `BYPASSRLS` roles, and by table owners unless `FORCE ROW LEVEL SECURITY`. The deployed app connected as `postgres`, so every RLS policy was **silently inert** — RLS-as-defense-in-depth was doing nothing, and any bug/injection ran with DB god-mode. Not an active leak (app-layer `.where(ownership_scope_id == auth.ownership_scope_id)` + per-request `set_config('app.ownership_scope_id')` held), but the second barrier was absent. The sister app Gustify fixed the same latent issue as DECISIONS D32; this mirrors that pattern, adapted to Gastify.

**Supersedes** the earlier P43 bootstrap approach (commit 6824baa: an `app/bootstrap_db.py` that provisioned a single app role at startup while keeping the superuser as the migration/admin URL). That was never deployed (vars never set) and still kept god-mode in the deploy path with no boot guard. Removed in favor of this two-role + guard design.

**Migration interaction discovered + fixed.** FK-validation during migrations scans FORCE-RLS tables, which evaluates the policy reading `current_setting('app.ownership_scope_id')` — unset during DDL. A superuser silently bypassed this; the non-bypassing `gastify_migrator` errored. `alembic/env.py` now sets a placeholder `app.ownership_scope_id` for the migration session. (This is precisely why migrating as a superuser was dangerous — it masked the interaction.)

**Proven end-to-end** against a real Postgres (zonky embedded binary): provision two non-super roles → `alembic upgrade head` as `gastify_migrator` (owns 25 tables) → runtime as `gastify_app`: RLS isolates a real `transactions` row across scopes + WITH CHECK blocks cross-scope insert + role confirmed non-super; the boot guard **rejects** a superuser DSN and **passes** the `gastify_app` DSN.

**Net architecture impact.** No new runtime component. Two DB roles instead of one superuser; one env var added (`GASTIFY_MIGRATION_DATABASE_URL`); a lifespan guard. FORCE ROW LEVEL SECURITY (already present) is retained — it is what lets the owner `gastify_migrator` remain subject to policy during migration validation, and is harmless for the non-owner `gastify_app`.

**Status:** code accepted + merged; **operational rollout pending** — set the two role DSNs on each Railway API service + provision the roles per `docs/runbooks/db-role-split.md`, then redeploy (the boot guard verifies it). **Review trigger:** if a future migration needs a privilege `gastify_migrator` lacks (would need an explicit GRANT, not a return to superuser).

## D68 — Phase 4 dashboard/charts architecture: thin server-side series endpoint + parity charts + dashboard absorbs /insights (2026-06-03)

**Decision.** Phase 4 (Dashboard + Charts/Trends) is built on four grounded choices, made with the user after a understand-the-pipeline workflow verified the real contracts against the deployed `staging-e2e` OpenAPI:

1. **Time-series source = a new thin, read-only backend endpoint** `GET /api/v1/insights/series?from=YYYY-MM&to=YYYY-MM&granularity=month|quarter|year&currency=` → `InsightsSeriesResponse { granularity, currency, period_start, period_end, points:[{period, period_start, period_end, total_spend_minor, transaction_count}] }`. It reuses `load_insight_records_from_db` (one range query) + `_prepare_transaction` (post-exclusion `included_total_minor`, identical semantics to the monthly `total_spend_minor`) + the month/quarter/year bucketer. **No DB migration** (additive read aggregate). Range capped at 24 months.

2. **Chart libraries:** web = **Recharts 3.8.1** (SVG renderer reads the Phase-1 `--chart-1..6` CSS-var tokens directly; `<ComposedChart>` for bar+line; declarative, React-19 peer; lazy-loaded to keep ~136 KB gzip off the shared main chunk). Mobile = **react-native-gifted-charts** + `react-native-svg` + `expo-linear-gradient` (smallest native surface: svg-only, no Skia/Reanimated).

3. **Mobile native rebuild accepted.** `mobile/` ships zero graphics native modules today, so any chart (even a hand-rolled SVG donut) requires `react-native-svg` = **one EAS dev-client rebuild** + reinstall on the S23. Taken now for true donut+bar/line parity (user choice over a View-only-bars no-rebuild alternative).

4. **Dashboard absorbs `/insights`.** The home (`web/src/routes/index.tsx`, a 19-line stub) becomes the rich dashboard (summary + category **donut** + "what's shifting" gravity + month nav); `/trends` adds distribution + the time-series bar/line. The existing `/insights` route's widgets are extracted into `web/src/components/insights/` and reused; the now-redundant `/insights` **nav entry is retired** (single spend-home).

**Why.** The backend has only `GET /insights/monthly` (single month; `period=YYYY-MM` required) — donut + drill-down have full data (`InsightCategoryRollup`: `label`, `total_minor`, `share_of_total_percent` (Decimal-as-string), `category_level` 2/4, `parent_key`, `dimension`), but **time-series has no backing contract**. Client fan-out of N monthly calls is an analytics anti-pattern: each `/insights/monthly` internally scans the current + 3 baseline months and computes gravity the trend never uses, so N calls = N×~4 month-scans + N discarded gravity calcs per view-open. A single `GROUP BY period` endpoint is O(1) requests, scales with users, natively supports quarter/year, and **is reused by Phase 5 Reports**. User explicitly prioritized future-scalability over fastest-MVP.

**Adopted defaults (not separately gated).** Category color = deterministic `category_key`→`--chart-1..6` hash (stable per category across months, theme-native, no vendoring of the parked 86-color legacy `categoryColors/` map) + a synthesized **"Other"** slice (`total_spend_minor − Σ top5`) so the donut sums to 100% (the API caps top categories at 5). In-chart drill-down by `parent_key` (L1→L2 / L3→L4, with the top-5 truncation caveat surfaced in-UI); drill-*to-transactions* only for `transaction_category` (L2) slices via a `category_key`→`store_category_id` UUID lookup (`/transactions` has no item-category filter), disabled on item (L4) slices.

**Alternatives considered.** (Time-series) client fan-out — rejected for scale + Phase-5 rework; phased fan-out-now-endpoint-later — rejected (builds the series twice). (Mobile) View-only bars no-rebuild — rejected by user for parity; Victory-Native-XL — rejected (Skia+Reanimated = 3 native modules). (Color) ordinal-by-rank palette — rejected (a category's color would shift month-to-month); full legacy per-category vendoring — deferred (86 colors, taxonomy-coupled).

**Net architecture impact.** One additive read-only endpoint (no migration), two new frontend chart deps (web Recharts lazy-loaded; mobile gifted-charts + svg behind one EAS rebuild), `/insights` route folded into the dashboard. Backend must deploy to `staging-e2e` before the B2 runtime proof can close (per BEHAVIOR §B2).

**Status:** accepted; implementation in progress (Phase 4). **Review trigger:** if quarter/year buckets need calendar-complete bounds beyond the requested window, if item-category drill-to-list becomes required (→ backend `category_key`/item filter on `/transactions`), or if faithful L1/L3 parent rollups are needed (→ backend parent-rollup rows).

**Amendment (2026-06-03, during T7 proof).** Web chart lib changed **Recharts 3.8.1 → 2.15.4**. Recharts 3 pulls `es-toolkit`, whose `./compat/*` subpath exports are CJS-only (no ESM condition); recharts default-imports them, so Vite's **dev** dependency optimizer produces a broken `require_isUnsafeProperty is not a function` shim and the dashboard crashes under `vite dev` (the production Rollup build is unaffected). The B2 web proof harness runs `vite dev --mode staging-e2e`, and the gated test-auth button is stripped from production builds (`!import.meta.env.PROD`), so `vite preview` is not a viable proof path either — `vite dev` must work. Recharts 2.15.4 uses lodash (no es-toolkit), supports React 19, and required **zero code changes** (the `<Cell>` / `<ComposedChart>` API is identical), so the donut + bar/line are unchanged. Deferred: revisit Recharts 3 if/when es-toolkit ships ESM subpath exports (tracked [[P48]]). Separately: PUSH.md's `railway up` fallback named `--environment staging`, but the staging-e2e service lives in environment **`staging-e2e`** (per the service URL); the 404 on the wrong env name cost a deploy cycle — PUSH.md fallback to be corrected.

## D69 — Analytics architecture: server-aggregated drill-down tree, NOT a global client buffer; groups via RLS scope-swap (2026-06-03)

**Decision.** For category drill-down + future shared-group analytics, adopt a **hybrid**: the **server stays system-of-record and aggregator**, and exposes a new read-only endpoint that returns a **pre-grouped, drill-down-ready L1→L4 category tree** which the web/Expo client expands **in memory** (instant bidirectional drill, zero round-trips per step). **Reject** the alternative of pulling all of a user's transactions into a global client-side buffer and deriving stats client-side. Decided after a 6-agent research+adversarial Workflow grounded in gastify's actual code + comparable apps; the user was genuinely undecided and asked for a critical evaluation.

**Endpoint (additive, sibling to the shipped /monthly + /series):**
`GET /api/v1/insights/tree?period=YYYY-MM&dimension=transaction_category|item_category&currency=&group_id=optional` → the FULL two-level tree for the dimension (store: L1 Industry → L2 Store-type; item: L3 Family → L4 Item/subcat), each node `{key, label, parent_key, level, total_minor, share_of_total_percent, transaction_count, item_count, excluded_total_minor}`. Reuses the existing engine (`load_insight_records_from_db`, `_rollups_for_dimension`, `_build_rollup`, `insight_parent_for_category`, the FX-minor-units path, the `MonthlyInsightsCache` fingerprint) — the only new behavior is **not truncating at `_TOP_CATEGORY_LIMIT`**. Client adds `useInsightsTree(period, dimension, currency)` mirroring the existing thin fetch-and-display hooks; the drill UI navigates the cached tree (expand L1↔L2 / L3↔L4 + reverse roll-up item→family→store-type→industry) with no per-step fetch.

**Why reject the global client buffer (grounded in code).**
1. **Reverses this-week's ent decisions with no scope change.** D57 explicitly lists "client-side aggregation" as REJECTED; D68 (today) built `/insights/series` as "the O(1)-request replacement for a client fan-out" (`services/insights.py:386`). A global buffer silently un-makes both = decision-debt.
2. **Re-creates the legacy failure mode.** BoletApp was abandoned for SEAMS where authority/state lived in the client (scan races, processScan→editor mutation, Gemini drift) — NOT for drill-down. A buffer relocates analytics system-of-record to the client and **duplicates** trusted server logic (L1-L4 taxonomy + `insight_parent_for_category`, FX-in-minor-units, D58 flag-exclusion, gravity thresholds, "Other"-synthesis, top-5 cap) → client↔server drift, the exact root cause.
3. **Performance is a non-bottleneck.** Indexed Postgres `GROUP BY` over ≤10⁴ per-scope rows is sub-ms, already fingerprint-cached; the buffer solves a problem gastify doesn't have.
4. **Shared groups break the buffer fundamentally** (the decisive concern). RLS sets ONE `app.ownership_scope_id` per request (`auth/deps.py:81`, D67); "pull all transactions across N groups" is a cross-scope union RLS literally denies. Revocation is unenforceable client-side (a removed member's buffer keeps the rows — a CRITICAL leak). Partial visibility ships rows RLS would have filtered (server GROUP BY runs INSIDE the scope boundary; the buffer runs OUTSIDE it). D58 personal flags + consent suppression would need client re-implementation.

**Shared groups = a scope-swap, not a new code path.** A request names `group_id`; the server validates the caller against `OwnershipScopeMember` (table exists, `user.py:55`), sets the RLS GUC to that scope, and runs the SAME tree/monthly/series query. RLS makes "only your groups, only their rows, partial-visibility-correct" automatic. This is what Monarch + Maybe Finance do for households. **Every analytics endpoint then works for groups with zero new aggregation code** — the payoff of staying server-side.

**Precedent.** gastify's camp (relational + multi-currency + shared: Firefly III, Maybe Finance, Monarch, Ghostfolio, Lunch Money) aggregates server-side almost universally. Local-first apps (Actual, YNAB, Copilot) buy offline/instant drill but NEVER do a cross-scope client cube — they sync ONE budget file. So a global buffer has zero precedent. Caveat: every surveyed app is 2-level category↔group; gastify's 4-level L1→L4 is deeper than any precedent → the drill UX must be designed (one-level-deep donut + on-tap expand is the validated MVP cut). The user's **90-day-immutability** idea is retained as the enabler that makes the per-scope tree hard-cacheable (fingerprint ETag).

**Explicitly NOT adopted** (record so it isn't re-litigated): global client buffer / client SQLite cube, sync engine (PowerSync/ElectricSQL), CQRS read-models, materialized views, columnar — all earn their keep only above ~10⁶ rows or for offline/real-time-collab requirements gastify's online read-only dashboard doesn't have. If offline/real-time-collab ever becomes first-class, the correct move is a permission-aware sync engine (PowerSync, given native mobile), NOT a hand-rolled buffer.

**User decisions (2026-06-03):** (a) **Build `/insights/tree` + recursive drill-down INTO the current Phase 4** (not a later phase). (b) **Pull the Groups feature forward as a new phase** (group CRUD + membership + the `group_id`→GUC scope-swap validation) — the data model + RLS are ready.

**Risks to gate (from the eval).** Fingerprint must also bust on category remap + (later) membership change — add with a regression test (HIGH). The `group_id`→GUC path MUST validate membership before `set_config` — test "user A cannot read group B's tree" (CRITICAL). Do NOT widen RLS to "any scope I belong to" via subquery (over-broad). Add composite index `(ownership_scope_id, transaction_date)` + category-id indexes before the tree ships. 4-level drill UX has no precedent → ship one-level-deep first.

**Status:** accepted. Fires D57 + D58 revisit triggers. **Supersedes** the P47 "lossy client-side parent grouping" deferral — drill-down is now server-tree-backed (exact, not truncated). **Review trigger:** if real-time shared-group freshness becomes a launch requirement (→ SSE/WebSocket+NOTIFY, net-new multi-replica infra), or if a single scope's L4 tree exceeds a sane payload budget (→ lazy L4-per-L3).

**Amendment (2026-06-03, Phase 4 v2 build).** User chose the **full 4-level cross-walk** drill UX (`AskUserQuestion`, this session) over the "one-level-deep first" MVP cut D69 proposed. Consequences, all within mvp tier (no new infra/deps/red-lines):
- **`dimension=transaction_category` returns a 4-level store-rooted tree** Industry(L1) → Store-type(L2) → Item-family(L3) → Item(L4). L1/L2 aggregate at the transaction level; **L3/L4 are a cross-walk** — the item families/items of the *items inside* each store-type's transactions. `dimension=item_category` returns the 2-level Family→Item tree (preserves the v1 store/item toggle).
- **The cross-walk is an in-memory aggregation over the already-loaded records, NOT a new SQL query or JOIN.** `load_insight_records_from_db` already eager-loads each transaction's items, so `/insights/tree` issues the *same single range query* as `/monthly` + `/series`. This is why the index gate below is moot.
- **Index migration gate already satisfied — NO new migration shipped.** D69's "add composite `(ownership_scope_id, transaction_date)` + category-id indexes before the tree ships" is redundant: `001_core_tables.py` already declares `idx_transactions_scope_date` `[ownership_scope_id, transaction_date DESC, id]`, `idx_transactions_store_category`, `idx_transaction_items_category` (on `transaction_items`), and `idx_transactions_scope`. The tree query is the same scope+date range scan those serve; grouping is in Python. Re-creating any would raise "relation already exists." A genuinely-missing `(scope, store_category_id)` group-by index can be added later if `EXPLAIN` shows it.
- **Fingerprint HIGH gate done.** `_database_fingerprint` now folds in `_TAXONOMY_VERSION_TOKEN` (sha256 of every category's `key:level:parent_key`), so a category remap busts the monthly cache. Regression: `test_insights_tree.py::test_taxonomy_fingerprint_is_order_independent_and_remap_sensitive` + `::test_database_fingerprint_carries_the_taxonomy_token`.
- **Tree is uncached server-side for MVP** (one range query + sub-ms aggregation; client TanStack Query caches 60s). The D69 "hard-cacheable per-scope ETag / 90-day immutability" idea is deferred; a future tree cache inherits remap-busting via the shared fingerprint token.
- **DTOs:** `InsightsTreeNode` uses a free `int` level (1-4) + recursive `children`, NOT `InsightCategoryRollup` (whose `Literal[2,4]` validators reject L1/L3 parent nodes). `share_of_total_percent` is grand-total-relative; clients recompute within-parent % per donut level.
- **Mobile (S23) runtime proof deferred** per explicit user direction (2026-06-03): web is the sole proof surface this session and must be thorough. The mobile drill UI + S23 Maestro proof land when the user greenlights S23 (tracked in PENDING). Backend serves both; web + mobile api-types both regenerated (CI `mobile-api-drift` stays green).

## D70 — Phase 5 Groups product model: whole-app scope-switch, scan-personal-only, share-to-group, invite-links, aggregates-by-default + consent-gated detail (2026-06-03)

**Decision.** Resolves the D69-open Phase 5 questions (D58 shared-flag semantics, group freshness) plus the population + membership + UX cuts, via `AskUserQuestion` (2026-06-03, this session) grounded in a 7-agent contract-map Workflow (`wsckq3qxd` + `whet1s9h7`). Phase 5 ships the **full legacy-style group model**, not the minimal analytics-only cut originally proposed.

**Membership validation mechanism (security spine — settled, not asked).** A `SECURITY DEFINER` SQL function `app_is_scope_member(p_user_id uuid, p_scope_id uuid) RETURNS boolean`, **owned by `gastify_migrator`**, `EXECUTE` granted **only** to `gastify_app`, `STABLE`, pinned `SET search_path = pg_catalog, public`, no dynamic SQL, returns one bit (never row data). It is the ONLY D3-safe option because: (1) there is **no `app.user_id` GUC** anywhere — Postgres only knows `app.ownership_scope_id` + the shared `gastify_app` role, so it cannot identify the human from session state; (2) `ownership_scope_members` has `FORCE ROW LEVEL SECURITY` (003 L92), so even the owner is policy-bound — the function body must `PERFORM set_config('app.ownership_scope_id', p_scope_id::text, true)` (transaction-local, self-reverting) for its own EXISTS read; (3) it does **not** alter any `CREATE POLICY` (D3 forbids policy-widening — option "add `OR user_id = current_setting('app.user_id')` to the members policy" is the literal D3-forbidden widen AND needs net-new GUC plumbing AND erodes the members-table trust root); (4) it does **not** run analytics on the migrator/superuser connection (D3). Validate-then-swap ordering is enforced by making the deliberate swap (`_set_postgres_ownership_scope(db, group_id)`, which writes `db.info[SCOPE_INFO_KEY]`) physically unreachable until the boolean returns `true`. The validation read must NOT write `db.info` (so a failed check leaves the session personally scoped). Migration `028`; helper + dependency in `backend/app/auth/deps.py` beside `_set_postgres_ownership_scope`.

**Failure semantics:** `404 "Group not found"` for BOTH non-member and non-existent `group_id` (anti-enumeration: a 403 would confirm a group exists; the oracle returns `false` identically for unknown-vs-not-mine, so the endpoint cannot branch on the difference). Reserve 403 for a later *role*-permission axis (membership already established).

**Group freshness:** per-request RLS, **no membership-fingerprint bust needed** (D69's HIGH risk is moot). A membership change touches no transaction/item/flag row inside the scope; access is gated per-request at the auth boundary (the oracle before `set_config`), so a revoked member fails validation and never reaches the cache/loader. `/tree` + `/series` stay uncached; `/monthly`'s `_InsightsCacheKey` already isolates by `(scope, user_id, period, currency)`.

**User-chosen product model (`AskUserQuestion` 2026-06-03):**
1. **Whole-app scope switch** (personal ↔ group), legacy-style: switches the entire app's `ownership_scope_id`, not just analytics. In group mode every section (dashboard, trends, transactions) shows that group's data. Stored client-side in `uiStore.activeScope` (`{kind:'personal'} | {kind:'group', id, name}`), persisted to localStorage like `locale`. Backend resolves+validates `group_id` per request and swaps the GUC.
2. **Scanning is personal-only.** Receipt / credit-card / batch scan are disabled in group mode. (Interpretation of the user's "only … only allowed on personal mode" — a restriction, NOT scan-into-group. If reversed later, thread scope through the scan enqueue + worker via `set_session_ownership_scope`.)
3. **Populate via Share** (NOT auto-copy, NOT scan-into-group for MVP): a "Share to group" action copies a personal transaction into a group scope — read the source under the personal GUC, then (after membership validation) insert a COPY under the group GUC (`WITH CHECK new.ownership_scope_id = GUC = group` passes). Original stays personal; the copy carries the contributor's `user_id` for "Aportes"/attribution. True cross-scope reassignment is impossible in one GUC (USING wants old scope, WITH CHECK wants new) — so Share = copy.
4. **Invite-links** (chosen over invite-by-email): rotatable `invite_link_token`, 7-day expiry, public unauthenticated `/invite/:token` landing, join flow + expired / already-member / limit-reached / joining states. Caps from mockups: max 5 groups/user, 50 members/group, **3 admins/group**.
5. **Shared group = aggregates by default.** The per-group dashboard/trends (D69 scope-swap) sum *everyone's* shared group transactions as totals — RLS admits all group-scope rows, so aggregates naturally include every member's shares. No individual line-item detail from other members is shown by default; the group transactions LIST filters to the viewer's own `user_id` (app-layer, NOT RLS — RLS must still admit all rows for aggregates).
6. **Consent-gated detail.** Revealing another member's individual transactions is admin-requested (up to 3 admins configure) + per-user **accept/decline**. App-layer visibility, sequenced LAST (sub-phase 5e, may extend to a follow-up phase).
7. **D58 personal flags stay personal-scope-only.** A flag created in personal scope has `ownership_scope_id = personal`, so it is RLS-invisible in group scope by construction → group aggregates are unflagged and never diverge between members. No migration, no per-viewer divergence. (Supersedes the "per-viewer vs group-visible flags" choice — neither, because personal flags simply don't cross into group scope.)

**Sub-phase sequence (isolation core first, proven before broad UI):**
- **5a — scope-swap CORE (backend):** migration 028 (`scope_type='group'` via widened `ck_ownership_scopes_type`; `name` column on `ownership_scopes`; `app_is_scope_member` oracle; membership/scope indexes if `EXPLAIN` warrants), validate-then-swap dependency, optional `group_id` on `/insights/monthly|series|tree`. **Tests A–D Postgres-gated** (user A cannot read group B [CRITICAL], validate-then-swap ordering, revocation, chicken-and-egg-under-personal-GUC) via the `test_rls_postgres.py` non-bypassing-role harness.
- **5b — group CRUD + roles + invite-links (backend):** `api/groups.py`, `schemas/groups.py`, roles owner/admin(≤3)/member, invite tokens + join + states, caps. Tests E–I (create→owner, role gating, unique-membership 409, fingerprint, D58-in-group).
- **5c — share-to-group (backend):** copy a personal txn into a validated group scope.
- **5d — web:** `uiStore.activeScope`, global `GroupSwitcher`, `/groups` route (list/create/roster/invite), `/invite/:token` landing, thread scope app-wide (insights + transactions list with own-user default), scan disabled in group mode, i18n `group.*` (es/en/pt). **Web Playwright is the primary runtime proof this phase.**
- **5e — consent-gated detail sharing** (admin request + accept/decline). Sequenced last; may defer to a follow-up phase.
- **Mobile (DEFERRED until device reconnect):** `GroupsScreen` + mobile switcher + S23 isolation Maestro proof → PENDING.

**Risks to gate.** "User A cannot read group B's tree" is the CRITICAL test and MUST run under the real non-bypassing `gastify_app` role (SQLite/superuser falsely passes — RLS inert). The `SECURITY DEFINER` oracle is itself a privilege surface — constrain it exactly as specified (owner=migrator, EXECUTE=app-only, pinned search_path, boolean-only, no dynamic SQL). Share-to-group must validate membership BEFORE the insert-under-group-GUC. Backend RLS pytest is the PRIMARY isolation proof while S23/staging-e2e device proof is deferred.

**Status:** accepted. Refines D69; honors D3 (no policy-widening) + D67 (least-privilege role). **Review trigger:** if consent-gated detail (5e) or auto-copy is pulled into MVP scope, or if "scanning while in group mode" is later chosen (→ scope-thread the scan pipeline).

## D71 — Cross-scope membership reads: ownership_scope_members is ENABLE-but-NOT-FORCE RLS + migrator-owned SECURITY DEFINER readers (2026-06-03)

**Decision.** Phase 5b needs **user-centric, cross-scope** membership reads that the single-GUC RLS model cannot express: "list the groups I belong to" and "preview/join a group by invite token" must read membership rows across scopes the caller cannot yet see. The 5a oracle's GUC-juggling (`app_is_scope_member`, D70) only resolves membership for an **already-known** scope — it cannot enumerate the unknown set of scopes a user belongs to. Resolve this by making `ownership_scope_members` **`ENABLE ROW LEVEL SECURITY` but NOT `FORCE`**, so a small, fixed set of `SECURITY DEFINER` functions **owned by `gastify_migrator`** can read membership across scopes (the owner is exempt from a non-FORCE policy), while the runtime role `gastify_app` (non-owner) stays fully RLS-isolated.

**Why this is the right mechanism (and D3-safe).**
- **No policy is widened (D3 holds).** The `USING`/`WITH CHECK` of `ownership_scope_members_scope_isolation` is unchanged. D3 forbids widening a policy to an "any scope I belong to" subquery; removing FORCE changes only whether the *table owner* is bound, not the policy predicate.
- **`gastify_app` isolation is unchanged.** `ENABLE` (without `FORCE`) applies RLS to every role EXCEPT the table owner. `gastify_app` is NOT the owner (D67), so direct app reads/writes to the members table remain scope-isolated — including `WITH CHECK` on INSERT (a user can still only add a member to a scope they've swapped into, which requires proven membership).
- **Only the access-control metadata table is relaxed, owner-only.** All DATA tables (`transactions`, `transaction_items`, `statements`, `credit_balances`, …) keep `FORCE ROW LEVEL SECURITY`. The relaxation is confined to `ownership_scope_members` and benefits only `gastify_migrator`, which never serves user requests directly — it is reachable only through the narrow, parameterized definer functions below.
- **vs the rejected alternatives.** (a) A self-visibility policy clause keyed on a new `app.user_id` GUC needs a second GUC threaded through `deps.py` + the `after_begin` event + every worker, and edits a live policy — more surface, closer to D3. (b) A BYPASSRLS owner role reintroduces a broad bypass surface against D67's spirit. NO-FORCE is the most surgical, no-new-GUC, no-policy-change option.

**The fixed set of cross-scope membership readers (all `SECURITY DEFINER`, owner `gastify_migrator`, `EXECUTE` to `gastify_app` only, pinned `search_path`, return only membership facts / safe fields, parameterized — never a `SELECT *` egress):**
- `app_is_scope_member(user, scope) -> bool` (028, D70). Its internal GUC save/restore is now **belt-and-suspenders** — with FORCE off the owner already bypasses, but the juggling stays correct and harmless; left as-is to avoid churning the shipped 028.
- `app_user_groups(user) -> (scope_id, name, role, member_count)[]` (029). Backs `GET /groups` (the group switcher) + the 5-groups-per-user cap. Reads only the *passed* user's rows; the endpoint always passes `auth.user_id`.
- `app_group_invite_preview(token) -> (group_id, name, member_count, expires_at)` (030, 5b-2). Backs invite preview/join for a not-yet-member bearer of a token.

**Roles + caps (5b).** `ck_scope_members_role` widened to `('owner','admin','member')` (029). Caps enforced in the app layer (mockups): **5 groups/user, 50 members/group, 3 admins/group**. Role gating: only `owner`/`admin` may mutate membership/roles; `owner` cannot leave while they are the last admin (ENTITIES invariant). Writes to members stay RLS-isolated (require GUC=target scope), so write-isolation is unaffected by NO-FORCE.

**Status:** accepted. Extends D70; honors D3 (no policy widen) + D67 (least-privilege runtime role unchanged). **Review trigger:** if a future need arises to read *other* users' cross-scope memberships (admin tooling), revisit — the current definer set is deliberately self-or-token scoped.

## D72 — Shared transactions outlive the sharer's membership: kept in group statistics, hidden from the transactions list when the contributor leaves (2026-06-04)

**Decision (user direction, 2026-06-04).** When a member LEAVES (or is removed from) a group, the transactions they shared into it (D70 share-to-group copies) are **NOT deleted** — they remain part of the group's spending history. Consequences:
- **Statistics / aggregates (dashboard, trends, /insights/*) KEEP counting them.** The group's analytics sum every transaction in the group scope regardless of whether its `shared_by_user_id` is still a member. This is automatic: leaving only deletes the `ownership_scope_members` row; the `transactions` rows are untouched. Proven by `test_group_share.py::test_shared_transactions_remain_in_statistics_after_sharer_leaves`.
- **The group TRANSACTIONS LIST hides a departed contributor's rows.** When the per-group transactions list view is built (5e / threading `/transactions` into group scope), it must filter to rows whose `shared_by_user_id` is a CURRENT member of the group; a departed member's shared rows drop out of the list but stay in the aggregates. (Requirement recorded — the list view is not built yet; aggregates are the 5d deliverable.)
- **DELETE-the-whole-group is different from LEAVE.** Deleting a group (owner-only) removes the group entirely, so its shared transactions are deleted with it (they would also FK-block the `ownership_scopes` delete otherwise); items/images/flags cascade via their `ON DELETE CASCADE` FKs. `delete_group` now deletes the group's `transactions` before the members + scope.

**Why.** A group's spending history shouldn't silently shrink when someone leaves — the aggregates reflect what the group actually spent over time. But an ex-member's individual line items shouldn't keep appearing as live, attributable transactions once they're gone. Keeping the `shared_by_user_id` column (never NULLed on leave) is what lets the list filter on "current member?" while the aggregate ignores it.

**Status:** accepted. Extends D70 (share-to-group) + the 5e consent-gated detail model (the same `shared_by_user_id`-vs-current-membership filter governs both "whose rows show in the list" and "departed members' rows hidden"). **Affects:** 5e group transactions list (must apply the current-member filter); no schema change (uses existing `shared_by_user_id`).

## D73 — 5e consent-gated member detail: opt-in per member, two flags + an app-level list filter (no new RLS) (2026-06-04)

**Decision (user direction, 2026-06-04).** Implements the D70 "showing the transaction of other users can be asked by the group, configured by the admin(s), and each user can accept or decline" promise with an **opt-in, privacy-first** model:
- **Group flag** `ownership_scopes.member_visibility_enabled` (bool, default `false`). An owner/admin turns it on to *request* that members expose their individual transactions. Off by default → group shows aggregates only (the 5d behaviour).
- **Per-member flag** `ownership_scope_members.shares_detail` (bool, default `false`). Each member must **explicitly ACCEPT** (opt-in) before *their* shared rows appear individually to others. Default decline; a member can flip it back any time.
- **Group transactions-list endpoint** (`GET /groups/{id}/transactions`) shows a shared row iff: `shared_by_user_id == viewer` (your own, always) **OR** (`member_visibility_enabled` AND the sharer is a **current** member AND `sharer.shares_detail`). Departed contributors' rows are excluded (D72) but **aggregates are unchanged** — the consent/membership filter applies **only to the list**, never to `/insights/*` (monthly/series/tree still sum every group row).

**Why app-level filter, not RLS.** The rows are already group-scoped by the D70 RLS GUC swap; 5e only decides *which group rows to surface in the list view*. That is presentation, not isolation — a `WHERE` clause in the endpoint, not a policy change. Keeps D3 intact (no policy widened) and avoids modelling per-viewer consent in RLS (which would need per-(viewer,sharer) policy state). Admins see each member's consent status via the group detail; non-admins see the toggle + their own consent control.

**Endpoints.** `PATCH /groups/{id}` gains `member_visibility_enabled` (admin-only); `POST /groups/{id}/consent {shares_detail}` (any member, self); `GET /groups/{id}/transactions` (filtered list). `GroupDetail` returns `member_visibility_enabled` + the viewer's `shares_detail`; `MemberSummary` returns each member's `shares_detail` (for admins).

**Status:** accepted. Implements D70 (consent-gated detail) + honours D72 (departed-contributor list filter). **Affects:** migration 032 (two bool columns), `api/groups.py` (3 endpoints), `schemas/groups.py`, web + mobile group UI, openapi types regen.

## D74 — Sharing LOCKS the source transaction's content (snapshot integrity); personal/tangential ops still allowed (2026-06-04)

**Decision (user direction, 2026-06-04).** A shared group copy is a point-in-time SNAPSHOT (confirmed; matches D70 "share = copy" — editing the source later does NOT change the group copy). To keep the snapshot honest, once a transaction is shared into ANY group its SOURCE becomes **content-locked**:
- **Blocked (immutable once shared):** merchant, store category, item edits (name/qty/prices/category), currency, all amounts (total/discount/gross/reconstructed), transaction_date/time, receipt_type, country/city — anything "inside" the receipt.
- **Still allowed (tangential / personal-level):** pairing to a credit card (`card_alias_id`), marking it recurrent (recurrence_*), and per-item personal flags (D58 — these never leave personal scope). Statement-reconciliation matching is a separate table, so it is unaffected by the content-lock automatically.
- **Delete is still allowed** (D-Q3): deleting the personal source leaves the group copy orphaned (the group keeps the spend, mirroring D72). There is no per-copy "un-share" — only delete-group removes a group's copies. So "delete + re-add + re-share" yields a NEW source id (different `shared_from`) → a second copy; the dedup `uq_transactions_scope_shared_from` only blocks re-sharing the SAME source id.

**Mechanism.** `transactions.is_shared` (bool, default false) is set true on the source when `share_transaction` succeeds (set under the personal GUC after the copy commits — RLS forbids touching the personal source under the group GUC). Lock is **permanent** once set (not cleared on delete-group — conservative; avoids cross-scope un-lock). `update_transaction` 409s when `is_shared` AND the patch touches any blocked field or items. `TransactionDetail.is_shared` drives a UI lock indicator + disabled content fields.

**Why.** The group's view of a shared receipt must not silently change because the contributor later edited their personal copy — that would corrupt shared statistics other members rely on. Locking content (not personal/tangential ops) preserves shared-snapshot integrity while keeping the source useful for the owner's own bookkeeping (card pairing, recurrence). **Status:** accepted. **Affects:** migration 033 (`transactions.is_shared`), `api/groups.py` (share sets is_shared), `api/transactions.py` (update_transaction lock), `schemas/transactions.py` (TransactionDetail.is_shared), web + mobile transaction-edit UI.

## D75 — Groups get an avatar: emoji icon + accent color (2026-06-04)

**Decision (user direction, 2026-06-04).** Groups gain a lightweight editable **avatar** — an emoji `icon` + an accent `color` — replacing the static 🏠. Owner/admin can change it (alongside rename). `ownership_scopes.icon` (text, nullable) + `ownership_scopes.color` (text, nullable, a hex/token); `GroupSummary` + `GroupDetail` return them; a small emoji+color picker on web + mobile. Default icon 🏠 + a default accent when unset. **Why.** A per-group avatar makes groups distinguishable at a glance (legacy parity) and gives the membership/visibility UI a recognizable identity. Kept to emoji + color (no image upload) to avoid storage/moderation scope. **Status:** accepted. **Affects:** migration 033 (`ownership_scopes.icon`/`color`), `api/groups.py` (PATCH icon + return in summary/detail), `schemas/groups.py`, web + mobile group UI, openapi regen.

## D76 — Gemini runs as a deterministic MOCK in staging-e2e; REAL in staging + production (2026-06-04)

**Decision (user direction, 2026-06-04; mirrors the parallel Gastify project).** Three runtime environments, three LLM (Gemini) behaviors:
- **`staging-e2e`** — Gemini runs as a **deterministic mock/fixture** for BOTH receipt scanning AND statement extraction. This is the environment the e2e suite drives (web Playwright + S23 Maestro, screenshots), so it must be reproducible and $0 — no real Gemini calls.
- **`staging`** + **`production`** — Gemini runs **for real** (production-like). staging is no longer a "cheap/fixture" integration env for LLM purposes; it exercises the real provider exactly as production does.
- **`local`** — `mock` provider (unchanged).

**Enforcement (the actual change).** The mock-in-e2e behavior was previously gated on a flag (`GASTIFY_E2E_SCAN_FIXTURES_ENABLED`) — if that flag were forgotten, or `GASTIFY_SCAN_PROVIDER=gemini` set, **real Gemini could leak into the e2e env**. Now `app/config.py` enforces it by **ENVIRONMENT, not a flag**: `environment == "staging-e2e"` unconditionally coerces both `scan_provider` and `statement_provider` to `fixture` (even an explicit `gemini` is coerced). Symmetrically, `staging` + `production` (the new `REAL_LLM_ENVIRONMENTS` set) **refuse** `mock`/`fixture` scan and `fixture` statement providers, so they can never silently degrade to a mock. The legacy `e2e_scan_fixtures_enabled` flag survives only as a local/dev opt-in (substitute fixtures for `gemini` on request). **Why.** Determinism in the proof environment must be a property of *where* the code runs, not of an env var someone has to remember — and the two real environments must be guaranteed to exercise the real model. **Status:** accepted. **Affects:** `app/config.py` (provider resolution + `REAL_LLM_ENVIRONMENTS` guards), `tests/test_config.py`. Deploy-safe: every environment's existing config (`.env.*`) already complies — staging-e2e=fixture, staging/production=gemini — so no Railway dashboard change is required; the code just makes the policy unbreakable.

## D77 — Reports gains a period granularity toggle: month/quarter/year now, week next (2026-06-04)

**Decision (user direction, 2026-06-04).** The legacy app offered week / weekly / monthly / quarterly / annual reports; the Phase 6 Reports MVP shipped monthly-only. Close the gap in two steps:
- **#1 (now, frontend-only):** add a **month/quarter/year** granularity toggle to the Reports screen (web + mobile). The backend `/insights/series` already supports `granularity ∈ {month, quarter, year}` and the Trends screen already toggles it — so this is pure reuse (no backend). The toggle drives the report CARDS (the period buckets + trend); the category-breakdown donut stays a **month-only** affordance (the backend has no quarterly/annual category rollup), shown only when granularity=month. `periodLabel` handles all three bucket formats (`YYYY-MM`, `YYYY-Q{n}`, `YYYY`).
- **#2 (next, backend):** add a **`week`** bucket to the series engine — extend `SeriesGranularity` to include `"week"` + the SQL date-trunc to ISO weeks — then wire it into the Reports toggle. This is the only legacy period that needs new backend (the aggregation engine had no sub-month bucket).

**Why.** Quarterly + annual were already 90% there (data + Trends), so a toggle finishes them cheaply; weekly genuinely needs an engine change, so it's sequenced second. **Status:** accepted, in progress. **Affects (#1):** web `routes/reports.tsx` + mobile `ReportsScreen.tsx` (granularity toggle + periodLabel), reuse `/insights/series`. **Affects (#2):** `schemas/insights.py` (SeriesGranularity), `services/insights.py` (week bucketing), tests, then the Reports toggle.

## D78 — Notification Center: a user-global feed bound to the caller's PERSONAL ownership_scope (never group) (2026-06-05)

**Decision (Phase 7).** The in-app Notification Center is a **user-global** feed — a bell independent of the active personal/group scope. The whole app is RLS-scoped by `ownership_scope_id`, so "user-global" is realized the same way `push_tokens` already does it (the verified precedent): every `notifications` row carries `ownership_scope_id` (the user's **personal** scope) + `user_id`, and the router reads/writes **only** under the personal-scope GUC. Concretely the notifications router does **NOT** call `resolve_analytics_scope` and does **NOT** accept a `group_id` — `get_auth_context` already pins `app.ownership_scope_id` to the user's personal scope at request start, so filtering on `user_id == auth.user_id` yields exactly the caller's user-global rows regardless of any active group. Background workers (no auth dep, no GUC) write under the **same** personal scope by resolving the target user's personal scope and calling `set_session_ownership_scope(db, personal_scope_id)` before insert.

**Shape.** New `notifications` table (migration 034 ← 033): `id`, `ownership_scope_id` FK, `user_id` FK, `kind`, `title`, `body`, `data` (JSONB deep-link payload), `read_at` (nullable — **NULL = unread**, single source of truth, no redundant `is_read` boolean), `created_at`/`updated_at`. Deny-by-default RLS using the **027 fail-safe** GUC form (`(NULLIF(current_setting('app.ownership_scope_id', true), ''))::uuid`), `ENABLE`+`FORCE`, policy `notifications_scope_isolation`, no GRANT (owner-inherited via ALTER DEFAULT PRIVILEGES). MVP **kinds** = `{scan_complete, scan_needs_review, statement_reconciled}` (exhaustive CheckConstraint), created by hooks in `scan_worker` (both math-gate branches) + `statement_worker` (reconciliation complete), threading `created_by_user_id` from the `scans.py`/`statements.py` dispatch sites. Endpoints: `GET /notifications` (cursor list, `unread` filter), `GET /notifications/unread-count` (bell badge), `PATCH /{id}/read`, `POST /mark-all-read`, `DELETE /{id}` (204). Foreign id → **404** (anti-enumeration, not 403). Deep-link via the JSONB `data` (e.g. `{"transaction_id": ...}`) — no per-kind FK columns.

**Deferred.** Group-share notification **kinds** (e.g. someone shared a txn to your group) and **fan-out to all group members**: in a group scope a scan/statement has one dispatching user, so MVP notifies **only** that user (`created_by_user_id = auth.user_id`); fan-out is a group-share concern, deferred with the rest of the group-share kinds (widen `ck_notifications_kind` in a later migration). Statement re-reconciliation may emit a duplicate notification (accept for MVP; dedupe later if noisy). S23 Maestro proof tracked separately.

**Why.** A notification feed must be account-level, not scope-level — threading `group_id` would imply a scope-awareness the feed doesn't have and pointlessly split the cache. Binding to the personal scope keeps it D3-safe (standard direct-scope policy on the new table, no policy widening), D67/P43-safe (027 fail-safe GUC form), and D70-consistent (notifications deliberately do **not** participate in the group scope-swap). **Status:** accepted, in progress. **Affects:** `models/notification.py`, `alembic/versions/034_notifications.py`, `schemas/notifications.py`, `services/notifications.py` + `scan_worker.py`/`statement_worker.py` hooks (+ `scans.py`/`statements.py` dispatch threading), `api/notifications.py` + `main.py`, `backend/schema/RLS.md`, openapi regen, web (`useNotifications` + `routes/notifications.tsx` + `NotificationBell` + i18n), mobile (`lib/notifications.ts` + `useNotifications` + `NotificationsScreen` + nav).

## D79 — Reports v2 Phase 1 tier: mvp (2026-06-05)

**Phase:** Report Detail Overlay + grouped breakdown
**Types:** [user-facing, web, native-mobile, data-view, analytics]
**Tier chosen:** mvp
**Prototype:** no
**Reason:** default MVP pick per U2 — a read-only detail surface assembled over the EXISTING `/insights/tree` + `CategoryDonut`; no new backend, no migration. Legacy-parity-as-reference (rebuild the feel, don't gold-plate).
**Δ deferred by tier choice:** enterprise edge-case polish (empty/zero-period overlays, deep ARIA on the new modal), Scale interactive/export affordances. Acceptable at scope-of-one MVP. **Review trigger:** escalate the overlay's a11y when the app does a Scale accessibility pass. **Status:** accepted.

## D80 — Reports v2 Phase 2 tier: mvp (2026-06-05)

**Phase:** Persona insight + highlights
**Types:** [user-facing, web, native-mobile, analytics]
**Tier chosen:** mvp
**Prototype:** no
**Reason:** default MVP pick per U2 — a presentational insight string + highlights derived from data `/insights/monthly` `gravity_centers` already returns; ported thresholds + seasonal copy from legacy `reportInsights.ts`. Mostly frontend.
**Δ deferred by tier choice:** richer ML-style insight ranking / personalization (Scale). MVP keeps it data-grounded (only asserts what `gravity_centers` supports). **Review trigger:** revisit if users find the copy generic. **Status:** accepted.

## D81 — Reports v2 Phase 3 tier: mvp (2026-06-05)

**Phase:** Quarter/Year breakdowns + per-category trend
**Types:** [analytics, data, user-facing, web, native-mobile]
**Tier chosen:** mvp
**Prototype:** no
**Reason:** default MVP pick per U2 — additive read-only analytics aggregation that generalizes the existing month rollup to quarter/year + exposes a per-category prior-period trend; no migration. Lifts the D77 month-only breakdown limit.
**Δ deferred by tier choice:** per-tenant rollup caching / materialized aggregates (Scale — scope-of-one volume makes per-request aggregation fine). **Review trigger:** add caching on the first quarter/year-breakdown latency signal. **Status:** accepted.

## D82 — Erasure vs shared-group data: account-delete is total; group-leave is a choice (2026-06-07, rev 3)

**Context.** P16 Phase 1 (DSR) must service a right-to-erasure request. The hard case: a
member shared transactions into a group (D74 content-locks the group copy), then either
DELETES THEIR ACCOUNT or LEAVES A GROUP. What happens to the shared transactions + the
group's aggregate statistics? Rev 3 distinguishes the two triggers (rev 1 = recompute,
rejected as infeasible; rev 2 = a single sign-off choice, refined here).

**Decision (rev 3).** Two distinct triggers, only one of which offers a choice:

**ACCOUNT DELETION (signing off from the app) — TOTAL erasure, NO choice.** The user is
leaving the app and expects everything gone:
- Delete all the user's data — their own transactions AND the content-locked group copies
  they shared.
- VOID the affected group-period statistics. A stat is fact-based; it cannot be shown once
  its underlying data is deleted. Tombstone the affected `(group, period)` pairs.
- Groups see a notice: *"this member left the application; these statistics were shut down
  for the months their data affected."*

**LEAVING A GROUP (keeping the account) — the ONLY place a choice lives.** The user keeps
their account + their own data; the question is only what happens to the copies already
shared into THAT group:
- KEEP — the shared copies remain available to the group; group stats unchanged.
- DELETE — remove the shared copies from the group + VOID the affected group-period stats
  (tombstone + notice: *"this member left the group and removed their shared data; these
  statistics were shut down for the affected months."*).
The user's own transactions are untouched either way.

**Mechanism.** A TOMBSTONE `(group, period, reason, date)` the stats layer checks BEFORE
display — voiding is O(mark affected periods), never a recompute; a voided figure is stronger
for privacy than a recomputed one (gone, not adjusted). Both deletion paths (account-delete,
group-leave-delete) feed the SAME void mechanism; they differ only in the trigger, the notice
text, and whether a choice is offered.

**Why this shape.** User-directed. Account deletion = "I'm done, delete it all" → total, with
no confusing leave-behind option — so NOTHING is orphaned (the rev-2 "detach the left-behind
data from a deleted identity" sub-question is moot). The keep-vs-delete choice belongs only
where the account SURVIVES (group-leave), so the shared copies always have a live owner.

**Open / load-bearing.** Engineering's defensible read, NOT legal advice. The four launch
jurisdictions differ on MINIMUM-retention of financial records (which can conflict with
deletion) and on whether "keep on group-leave" affects an erasure request. FINAL policy is
SELF-ATTESTED against a documented 4-jurisdiction checklist at P16 Phase 5 (see D88);
external counsel review is deferred to the D88 review trigger (EU scale / special-category
volume / budget).

**Amendment (2026-06-10, P16 Phase 1 review remediation — implemented-reality reconciliation).**
Rev 3's prose says account-delete "Delete all the user's data — their own transactions AND the
content-locked group copies they shared." The IMPLEMENTATION (per the Phase-1 hand-off + D74)
does NOT physically delete the group copies: a group copy is a content-locked snapshot other
members' aggregates were built on, so erasure RETAINS the copy row but renders it INERT —
(1) tombstones the affected (group, month) so the aggregate reads VOID (gone, not recomputed),
and (2) removes the user's group membership so D72's current-member filter drops the rows from
every member-facing list. Net effect = the erased user's shared data is invisible everywhere
(aggregates voided, lists filtered), with no PII attributable (the `users` shell is scrubbed),
while the snapshot integrity D74 protects is preserved. This "retain-but-void-and-delist" is the
binding behaviour; rev 3's "delete the copies" wording is superseded by it. The group-leave-DELETE
choice uses the identical mechanism (reason `member_removed_data`). DOCUMENTED residual: a group
the user shared into then ALREADY LEFT before account-delete keeps its anonymous aggregate (the
contributor row is RLS-hidden cross-scope under FORCE; the `users` shell is scrubbed → no PII).

### Status
- accepted (rev 3 + 2026-06-10 implemented-reality amendment; engineering default, self-attested at Phase 5 per D88)

## D83 — Phase 1 tier: ent (2026-06-07)

**Phase:** Data-Subject Rights (DSR)
**Types:** auth, data, user-facing, compliance
**Tier chosen:** ent
**Prototype:** no
**Reason:** Irreversible erasure + legally-mandated data export across four privacy regimes; a wrong erasure leaks or fails to delete personal data. Data-safety mandates ent over the project mvp baseline.
### Per-dim tier overrides
dim_overrides: []
### Status
- accepted

## D84 — Phase 2 tier: ent (2026-06-07)

**Phase:** Consent cascade + Retention TTL
**Types:** data, data-migration, compliance, scheduled-job
**Tier chosen:** ent
**Prototype:** no
**Reason:** Data-lifecycle correctness — a missed revocation cascade leaves revoked data live; a wrong TTL deletes financial records a jurisdiction mandates keeping. Both are compliance-breaking.
### Per-dim tier overrides
dim_overrides: []
### Status
- accepted

## D85 — Phase 3 tier: ent (2026-06-07)

**Phase:** LLM quota-throttle degradation
**Types:** integration, resilience, observability
**Tier chosen:** ent
**Prototype:** no
**Reason:** The no-5xx-under-throttle guarantee is a launch-day reliability promise; the paid Gemini tier introduces real quota limits that must degrade gracefully to `queued`.
### Per-dim tier overrides
dim_overrides: []
### Status
- accepted

## D86 — Phase 4 tier: ent (2026-06-07)

**Phase:** Monetization plumbing
**Types:** data, billing, concurrency
**Tier chosen:** ent
**Prototype:** no
**Reason:** Financial primitives — the existing billing is concurrency-naive (PENDING P36); double-charging or a lost tier-update under concurrency is a money bug. Idempotency/locking is mandatory.
### Per-dim tier overrides
dim_overrides: []
### Status
- accepted

## D87 — Phase 5 tier: ent (2026-06-07)

**Phase:** 4-jurisdiction audit + go/no-go
**Types:** compliance, observability, audit
**Tier chosen:** ent
**Prototype:** no
**Reason:** The launch sign-off must be rigorous enough to stake a four-jurisdiction launch on. Lightest phase in NEW code (validation + documentation + runbook rehearsal), but the gate itself is ent.
### Per-dim tier overrides
dim_overrides: []
### Status
- accepted

## D88 — Compliance sign-off approach: self-attestation via a documented checklist (2026-06-07)

**Context.** The P16 erasure (D82) + retention policies need a compliance sign-off for the
four-jurisdiction launch (GDPR / CCPA-CPRA / Chile Law 21.719 / PIPEDA). Options weighed: (1)
block building on external legal review, (2) build config-driven + a one-off counsel review
at Phase 5, (3) build + self-attest against a checklist (no external counsel).

**Decision.** Option 3 — SELF-ATTESTATION (user-directed). Build Phases 1–2 to the strict D82
default; the Phase 5 go/no-go gate is a DOCUMENTED 4-jurisdiction DSR + retention compliance
checklist, completed + signed off by the team — NOT external counsel. The checklist is the
audit evidence: it must map each right + obligation per regime to the concrete implementation
(the DSR endpoints, the void/tombstone mechanism, the retention TTLs per data class, the
consent/processing register, the live-PG RLS proof). Self-attestation must be evidence-backed,
not a bare claim.

**Trade-off accepted (made visible per user direction).** Self-attestation carries the
compliance judgment internally — real residual liability, heaviest under GDPR (EU fines up to
4% of global revenue, strongest enforcement). This is a deliberate MVP-launch posture chosen
for speed/cost; it is NOT a claim that external review is unnecessary.

**Review trigger (when to escalate to external counsel).** Before materially scaling the EU
user base, before processing special-category data at volume, or when budget allows — engage
privacy counsel for a one-off review of the erasure/retention/consent decisions, and re-open
this decision.

### Status
- accepted (MVP posture; revisit per the review trigger)

## D89 — P16 execution decisions: validate-and-fill-gaps; erasure → hard-delete (2026-06-07)

**Context.** Pre-Phase-1 review found P16's compliance machinery is largely ALREADY
SCAFFOLDED: all four DSR rights exist (`app/api/privacy.py` — access / rectification /
erasure / portability), `retention.py` declares TTLs (scans 90d, audit ~6y), `billing.py`
has plan tiers + per-plan scan credits + a `NullBillingHook`, and consent eligibility is
LIVE-DERIVED from `ConsentRecord` (`consent_propagation.py`) so revoke is honored instantly.
P16 is therefore VALIDATE + FILL-GAPS, not build-from-scratch. Five execution decisions:

**1 — Erasure: HARD-DELETE + PII-free audit event (AMENDS D4).** The existing erasure
SOFT-DELETES (anonymizes PII in place, keeps rows for the audit trail per D4). That
contradicts D82's "delete everything." Decision (the "shred + log" model): change the
own-data path to HARD-DELETE the user's rows (profile / transactions / items / images
genuinely removed) and keep ONLY the PII-free `dsr_erasure` audit EVENT (satisfies D4's
"audit event required to prove DSR processing" — the event carries no personal content).
Group-shared copies are handled by D82 rev 3 (account-delete revokes group visibility +
voids the affected group-period stats). This AMENDS D4's anonymize-in-place IMPLEMENTATION
choice; D4's audit-event requirement is preserved.

**2 — Retention TTLs: keep + validate (no overhaul).** `retention.py`'s windows (scans 90d,
audit ~6y) stand; validate each against the four regimes in the Phase-5 checklist. Update
`retention.py`'s "transactions never deleted — anonymized via DSR" note: per (1),
transactions are now HARD-DELETED on erasure (only the audit event is retained).

**3 — Monetization: enforce the existing plumbing + harden P36; keep NullBillingHook.**
Enforce `billing.py`'s per-plan scan credits in the live scan flow + fix the
concurrency-naive primitives (P36 — idempotency/locking). No real payment provider yet;
`NullBillingHook` stays. "Plumbing live + safe," not a billing UI; a real provider is a
separate later phase.

**4 — LLM throttle simulation: mock-provider forced-throttle flag.** The mock Gemini
provider (D76) gets a test flag returning quota-exceeded / 429 on demand, directly exercising
the queued + no-5xx degradation path. No real-provider quota needed.

**5 — Phase structure: keep all 5, re-scoped to "validate + gap."** The gating granularity is
worth it for a launch gate; each phase shifts from build-from-scratch to
validate-the-scaffolding + close the specific gap. Phase 1's real NEW work = the (1)
hard-delete change + the D82 group void/tombstone.

### Status
- accepted

## D90 — Compliance-phase review rigor: observable-state gates + adversarial pre-promote review (2026-06-10)

**Context.** P16 Phase 1 (DSR) shipped its T6 staging proof GREEN while TWO CRITICAL
erasure-correctness bugs were live in the code: (1) account-delete de-membership was a
silent no-op on Postgres (the membership DELETE flushed under the wrong RLS GUC and
matched 0 rows), and (2) erasure was not total (it left statements, card_aliases,
scans, notifications, mappings, and credit_balances behind). Both were INVISIBLE to the
gate because the gate asserted the response payload's COUNTERS (`group_memberships_removed
== 1`) + the aggregate void, never the real database state. A 64-agent adversarial
review (run before promote) caught both; the fix added a `member_count 2→1` roster
assertion that exercises the real Postgres RLS path. The lesson generalizes to every
remaining P16 "validate-and-harden" phase — the dangerous bugs hide precisely in the
phases that feel like "just validation" (retention deletion in P2, billing concurrency
in P4 are the same trap class).

**Decision (binding for all P16 compliance/data-safety phases, Phases 2–5).**

1. **Observable-state gates.** A runtime/staging gate for a compliance or data-safety
   path MUST assert OBSERVABLE system state — actual row counts, rosters, RLS-path
   behaviour, queue states, ledger balances — NOT just the endpoint's response payload.
   A response counter is the code reporting on itself; it cannot catch a bug where the
   code's own bookkeeping diverges from the database (the exact Phase-1 failure). Where
   the personal-/group-scope RLS path is load-bearing, the gate must run against real
   Postgres (the deployed staging-e2e or the live-PG harness), since SQLite has no RLS
   and silently passes GUC-mismatched writes.

2. **Adversarial pre-promote review.** Each compliance phase gets a multi-agent
   adversarial review (find → adversarially verify → completeness critic) BEFORE the
   production promote, not single-pass review. Phase 1 proved single-pass review + a
   passing staging gate both missed the CRITICALs that the adversarial panel caught.
   The Phase 5 go/no-go sign-off explicitly requires this review to have run on the
   cumulative launch surface.

**Why this shape.** Cheap insurance on the one gate that stakes a four-jurisdiction
launch. The cost (an extra review pass + richer gate assertions) is trivially small next
to shipping an irreversible-erasure or money bug to production. It also makes the Phase 5
self-attestation (D88) honest: "proven by observable-state evidence + adversarial review"
is a defensible claim; "the endpoint returned the right number" is not.

### Status
- accepted (binding for P16 Phases 2–5; extends D88's evidence-backed-self-attestation posture)
