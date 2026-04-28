# Gastify Mockup Rework — Cross-Session Handoff Brief

> **Audience:** a fresh Claude / Codex / Cursor / other-tool session that we hand this file (or its contents) to.
> **Source of truth:** `/home/khujta/projects/apps/gastify`. All paths relative to that root.
> **Last updated:** 2026-04-28.

---

## 1. Mission

Ship a working mockup surface for **gastify** (personal expense tracker — receipt photo + statement PDF in, item-level transactions + reconciliation + concentration analytics out). One screen at a time, with screenshot evidence per ship. No volume before correctness.

A previous attempt in this repo produced 48 HTML screens / 13 flows / 18 molecules / 12 atoms but shipped 5 broken molecule triples (class names invented, not extracted from canonical CSS) and skipped review across multiple phases. Volume amplified cosmetic-but-broken outputs. We are restarting in **new folders, with this session's tool of choice**.

---

## 2. What gastify is (1 minute)

Personal expense tracker that answers **"where did my money go?"** at item + category level — not store-level — by scanning **receipts** (item detail) and **credit-card statements** (coverage) with a vision LLM (Large Language Model), reconciling the two so nothing hides, surfacing concentration patterns and subscription surprises. Three platforms (Desktop Web 1440 / Mobile Web PWA 390×844 / Native Mobile RN+Expo). Day-1 markets: Chile, LATAM, EU, US, Canada. Multi-currency with USD-shadow. Rebuild of the BoletApp prototype.

The product is **expense ingestion → item-level understanding → behavior insight**. That phrase is the whole product. Anything that doesn't map to it is out of scope (see §5).

---

## 3. The first deliverable (do this before anything else)

**Dashboard, Mobile (390×844), Normal theme, Light mode, with real data shape.**

- Reference HTML: `docs/mockups/screens/gastify-dashboard.html` (legacy attempt, 59KB) and `docs/mockups-legacy/screens/gastify-dashboard.html` (frozen baseline)
- Existing React stub: `frontend/src/views/DashboardView/`
- Data shape: transactions list (Transaction entity from `.kdbp/ENTITIES.md`), category roll-up (V4 86-cat taxonomy), monthly total + USD shadow, recent-scan affordance, FAB for new scan
- Renders: bottom-nav, top-bar with wordmark, stat cards, transaction list with category chips, FAB

**Definition of done for this one screen:**
1. Renders correctly at 390×844 (no overflow, no defaulted browser styling, all class names map to a real stylesheet)
2. Screenshot pasted in chat
3. Diff vs. `docs/mockups-legacy/screens/gastify-dashboard.html` — what changed and why, in 3 bullets
4. Real data shape bound (not lorem ipsum) — the Transaction shape from `.kdbp/ENTITIES.md`

When that screen lands, expand in this order: same screen × Dark mode → same × Professional/Mono themes → Desktop variant → next screen (Single-scan states, then Quicksave card, then Transaction editor, then Login + Consent variants).

**Do not produce 48 screens before delivering #1.** That was the previous attempt's failure mode.

---

## 4. Recommended posture: frontend-first in React

Work directly inside `frontend/src/`. The React + Vite + TypeScript app already has:
- `entities/` mirroring `.kdbp/ENTITIES.md` (Transaction, Receipt, Statement, Item, Category, Group, Consent)
- `repositories/` (TanStack Query wrappers)
- `services/` (API + scan + statement + reconciliation clients)
- `hooks/`, `contexts/` (auth, theme, currency)
- View stubs in `views/` and `features/` ready to be filled in

The React app **is** the product. HTML mockups are reference material, not the deliverable. Skip the parallel-HTML-universe trap.

**Alternative posture** — only if your tool is better at HTML/Figma than React: salvage-and-rebuild from `docs/mockups-legacy/screens/`. Fork the legacy file, fix what's broken, restage in a new folder. **Do not go greenfield** — fonts, icons, taxonomy, color tokens, and 13/18 molecules already exist and work.

---

## 5. Out of scope — do NOT invent

The previous handoff was permissive enough that a session invented a "plugin marketplace" requirement. **Don't.** Gastify is *expense ingestion → item-level understanding → behavior insight*. That's it.

**Not in scope. If you find yourself designing for one of these, stop and re-read `.kdbp/SCOPE.md` §6 (non-users) and §8 (non-goals):**

- Plugins, extensions, integrations, marketplace, third-party app store
- Tax features, deductions, IVA reporting, SII / DTE, Schedule-C, QuickBooks
- Income tracking, paychecks, dividends, investments, portfolio, net worth, financial planning
- Business features: expense reports, approvals, multi-budget, employee reimbursement, cost-of-goods
- Kitchen / pantry inventory (sibling app "Gustify" handles this)
- Prescriptive advice ("you should switch to X", "cancel this subscription", "buy generic")
- Card numbers, CVVs, PAN, expiry dates — aliases ONLY (C4 below)
- SMS / call-center / paper alternatives — smartphone or PC only

If a screen design implies any of the above, you're off-product. Re-anchor on §3 above.

---

## 6. Hard constraints (do not violate)

| # | Constraint | Source |
|---|------------|--------|
| C1 | **3 platforms:** Desktop Web (1440 responsive, sidebar nav, ⌘K scan), Mobile Web PWA (390×844, bottom nav + FAB), Native Mobile (RN+Expo, 390×844, full camera/haptics/biometrics/push) | SCOPE §3 |
| C2 | **3 themes × 2 modes:** Normal / Professional / Mono × Light / Dark, runtime-switchable. Token vocabulary `--bg --surface --primary --text --secondary --border --cat-*` | DECISIONS D7 |
| C3 | **86-category V4 taxonomy** (12 L1 + 44 L2 + 9 L3 + 42 L4) preserved exactly. `display[locale]` for i18n | LESSONS R8 |
| C4 | **Card aliases only** — UI shows "Santander Visa", never card numbers. PCI data does not enter the system | SCOPE §3 |
| C5 | **Manual edits authoritative** — user corrections override LLM scan output. UX must make manual entry trustworthy | LESSONS R1 |
| C6 | **Two capture modes, one ledger** — receipt photo + statement PDF feed the same transaction store. Reconciliation produces 3 buckets: Matched / Statement-only / Receipt-only | SCOPE §3 Q3 |
| C7 | **Multi-currency + USD-shadow** on every monetary surface | SCOPE §1, REQ-18, REQ-19 |
| C8 | **Jurisdiction-aware consent** — CL / LATAM / EU / US-CA variants at first-open | REQ-20, REQ-27 |
| C9 | **Cohort benchmarking is consent-gated and late-phase.** k ≥ 20 floor, sensitive-category suppression. Must not expose individual data | SCOPE §3 Q4, REQ-27 |

---

## 7. What exists already (skim — don't deep-read)

| Path | What's there | Use it for |
|------|--------------|------------|
| `.kdbp/SCOPE.md` | 27 REQs, primary user (PFA), JTBDs, non-goals | §1, §3, §4 are the read-priority sections |
| `.kdbp/ENTITIES.md` | Transaction, Receipt, Statement, Item, Category, Group, Consent | Data shape for every screen |
| `.kdbp/PENDING.md` P6–P10 | UX failures from hands-on scan-picker verification — distinct error UX, currency conversion, low-confidence handling, i18n keys, first-scan affordance | These are rebuild requirements, not bugs |
| `docs/mockups/INDEX.md` | Living catalog: flows × screens × atoms × molecules × REQ coverage | The map of the previous attempt |
| `docs/mockups/screens/` | 48 HTML screens (mobile + desktop variants) | Reference for visual language; fork if posture B |
| `docs/mockups-legacy/` | Frozen 2026-04-23 BoletApp baseline (29 screens, mobile-only) | Diff source: `diff -r legacy/screens/ mockups/screens/` |
| `docs/mockups/assets/fonts/` | Self-hosted Outfit + Baloo 2 woff2 | Reuse — licensed, woff2-optimized |
| `docs/mockups/assets/icons/` | 200+ pixel-art PNG icons (nav, actions, scan, categories, mascots) | Reuse — irreplaceable, brand-defining |
| `docs/mockups/assets/tokens/` | V4 taxonomy + category-color maps × 3 themes × 2 modes | Reuse — taxonomy is mandatory (C3) |
| `frontend/src/` | React + Vite + TS app with entities, repositories, services, hooks wired | The actual product surface — extend view layer here |

**Reuse, no exceptions:** fonts, icons, taxonomy, color tokens, frontend data layer.
**Fork carefully:** atoms (12), molecules (13/18 work, 5 are broken — see §9).
**Rebuild:** screens × theme × platform variants, missing P5/P10/P11 surfaces.

---

## 8. Verification bar (the U1 floor)

Per user value U1 (Prove It Works) — every artifact ships with evidence:

- **React component** → dev server up (`npm run dev` in `frontend/`), navigate to the view, screenshot at 390×844 light + dark, paste in chat. Type-check passes.
- **HTML mockup** → open in browser at 390×844 (and 1440 for desktop variants), screenshot light + dark, validation runner at `tests/mockups/validate/` clean (or note + accept findings).
- **Figma / image render** → export PNG at viewable size, name `<screen>-<platform>-<theme>-<mode>.png`, side-by-side with `docs/mockups-legacy/screens/<same-screen>.html`.

"It compiles" ≠ evidence. "I made a thing that looks like a dashboard" ≠ evidence. Evidence is: *here is screen X, viewport Y, theme Z, mode M, data shape D — screenshot, diff vs. legacy, what changed and why.*

---

## 9. Why we're trying again — short retrospective

Three things broke. Not for blame; for the new session to avoid.

1. **Re-emit instead of extract.** The `/gabe-mockup` D18 cascade generated per-device molecule triples by re-emitting class names from memory rather than extracting from the canonical CSS. 5 of 18 molecule triples (state-tabs, card-transaction, card-stat, card-empty, card-celebration) shipped with class names that don't exist in `assets/css/molecules.css` — they render as raw browser defaults. (PENDING P12, DECISIONS D23, `~/.claude/plans/why-did-you-do-twinkling-lecun.md`.)
2. **Volume before correctness.** The pipeline produced 48 screens × variants before proving one screen rendered correctly with real data shape. Fixing the source-of-truth-extraction gate was deferred while more cascades shipped on top.
3. **Review skipped at every commit.** Phases P3 / P4 / L0 shipped Exec ✅ without ever running `/gabe-review` (PENDING P11). Compounding debt across phases.

**Implications for the new attempt:** render first, scale later (§3); extract from a real source-of-truth, never recall (§7 reuse list); verify per-artifact, not at the end (§8).

---

## Appendix — Paste-prompt for tools without repo access

> You are picking up a personal-expense-tracker product called **gastify** — item-level receipt + statement reconciliation, 86-category V4 taxonomy preserved exactly, 3 platforms (Desktop Web 1440 / Mobile Web PWA 390×844 / Native Mobile RN+Expo), 3 themes (Normal / Professional / Mono) × 2 modes (Light / Dark), day-1 markets Chile + LATAM + EU + US + Canada, multi-currency with USD-shadow. Rebuild of the BoletApp prototype.
>
> **Your first deliverable: the Dashboard screen, mobile 390×844, Normal theme, Light mode, bound to real data shape (Transaction entity).** Render it correctly, screenshot it, and stop. Do not produce more screens until the first one is verified.
>
> **Hard constraints:** card aliases never card numbers, manual edits authoritative over LLM scans, jurisdiction-aware consent, 86-category taxonomy preserved, two capture modes (receipt photo + statement PDF) feed one ledger with reconciliation buckets Matched/Statement-only/Receipt-only.
>
> **Not in scope — do not design for these:** plugins, extensions, marketplaces, integrations, tax features, deductions, income / paycheck tracking, investments, portfolio, business expense reports, multi-budget, kitchen / pantry inventory, prescriptive advice. If a screen implies one of these, you're off-product — re-anchor on *expense ingestion → item-level understanding → behavior insight*.
>
> **Posture:** if you have repo access, work in `frontend/src/` (React + Vite — entities, services, repos, hooks already wired). If you don't, fork `docs/mockups-legacy/screens/gastify-dashboard.html` as your starting point. Reuse fonts (Outfit + Baloo 2), icons (200+ pixel-art PNGs), color tokens, and the 86-category taxonomy.
>
> **Verification:** screenshot at 390×844 light + dark, side-by-side diff vs. legacy reference, three-bullet summary of what changed and why. That's done. Then expand: same screen Dark → other themes → Desktop → next screen.
