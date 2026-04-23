---
name: gastify
version: 1
created_at: 2026-04-22
last_changed_at: 2026-04-22
status: finalized
authoring_command: /gabe-scope v1.0
maturity: mvp
---

# SCOPE — Gastify

> **This is the premise.** High-inertia backbone. Only `/gabe-scope-change` edits this file post-finalize.
> Status: **finalized v1** (2026-04-22).

## §0 Reference Frame {#reference-frame}

This scope was authored with the following references active. See `.kdbp/scope-references.yaml` for full audit trail + overrides.

| ID | Path | Weight | Role |
|---|---|---|---|
| ref-01 | `docs/rebuild/PLAN.md` | authoritative | Graph-structured rebuild plan (B0–B13 + U0–U7 + I1–I4 + C1–C4) |
| ref-02 | `docs/rebuild/LESSONS.md` | authoritative | 13 rebuild rules R1–R13 + PR review checklist |
| ref-03 | `docs/rebuild/ADR-2026-04-20-REBUILD-STACK.md` | authoritative | 18 locked stack decisions |
| ref-04 | `docs/rebuild/UX-PLAN.md` | suggestive | 7-phase UX workstream |
| ref-05 | `docs/rebuild/REFERENCE-SNAPSHOT.md` | contextual | Source repo pin + critical-files list |
| ref-06 | `docs/architecture-patterns.md` | suggestive | Local patterns ledger |
| ref-07 | `~/.claude/rules/common/coding-style.md` | suggestive | File-size, immutability, error handling |
| ref-08 | `~/.claude/rules/common/testing.md` | suggestive | 80% coverage, TDD |
| ref-09 | `~/.claude/rules/common/security.md` | suggestive | Secrets, input validation, rate limiting |

**Overrides recorded this session:**

- `override-01` — Cohort benchmarking added as tail-phase capability (affects ref-01, ref-03).
- `override-02` — Geography expanded Chile-only → global from day 1 (Chile + LATAM + EU + US + Canada). Affects ref-01, ref-03, ref-05.
- `override-03` — PWA rejected. Deliverables = responsive web portal + native Android + native iOS, single shared backend API. Affects ref-01, ref-03, ref-04. Requires new ADR decision D19 (mobile stack direction locked to cross-platform — currently React Native + Expo).

Downstream artifacts (PLAN.md, ADR, UX-PLAN, BEHAVIOR.md) must be updated to reflect these overrides. Flagged for post-finalize action.


## §1 One-liner {#one-liner}

**Gastify is a personal expense tracker that answers "where did my money go?" at item + category level — not just "which store" — by scanning both receipts (item detail) and credit card statements (coverage) with a vision LLM, reconciling the two sides so nothing hides, and surfacing concentration patterns, subscription surprises, and spending habits.** It runs as a responsive web portal plus native Android and iOS apps on a single shared backend API, from day 1 across Chile, LATAM, EU, US, and Canada.

> **Design-first execution order.** A full UX mockup plan (13 phases — design tokens → atomic components → molecular components → flows → screens → handoff) runs **before** `ROADMAP.md` P1 (Foundation backend) begins. Mockups are not enumerated in `ROADMAP.md` — they are a pre-roadmap design phase tracked in `.kdbp/PLAN.md` while active. On mockup handoff completion, the queued plan at `.kdbp/archive/queued_backend-p1.md` activates and ROADMAP P1 starts. ROADMAP phases + REQ-coverage are unchanged by this ordering — only the execution cadence shifts.

## §2 Problem {#problem}

**People don't know where their money goes — not because the data isn't there, but because the tools to see it are too slow, too shallow, or too skilled-up to use.**

Today, someone trying to get accountability over their personal spending has three choices, and all three fail the "ordinary person" test:

1. **Existing expense apps** ingest bank statements and aggregate charges by merchant. That tells the user *which store* they spent money at — not *what they bought*. A CLP $ 47,000 charge at Jumbo is opaque: was it groceries, cleaning supplies, a bottle of wine, or a bicycle helmet? The single most common personal-finance question — "what kinds of things am I actually buying?" — is unanswerable at the store-level. Apps like Fintonic aggregate banks across LATAM but cap transaction splitting at 3 lines, which is useless for a 40-item grocery run. Kuanto (Chile, August 2025, CLP $ 6,990/month, 2,000 users in month one) proves there is appetite to pay in this category, but it is still store-level — the item-level wedge is open.

2. **Spreadsheets** give unlimited detail, but the skill barrier is real. Writing a pivot table on a 12-month expense ledger is not a "common folk" activity. The population of adults who *can* do this and *will* do this consistently is small, which is why Excel-based personal finance never crossed into mass adoption.

3. **The prototype (BoletApp)** proved the item-level scan mechanism works on Chilean boletas using a vision LLM, but its original serverless stack is not production-grade (see `docs/rebuild/LESSONS.md` R1–R13). It also scopes itself to Chile only, to a web-installable PWA only, and to single-user accounts only — three limits that block the product it needs to become.

A fourth failure mode cuts across all three options — **the coverage gap between receipts and statements.** Receipt-based tools (like the prototype) capture rich item detail but only cover the subset of spending the user remembered to photograph. Statement-based tools (bank aggregators, Kuanto, Fintonic) have near-complete coverage of what was *charged* but no item detail whatsoever. Neither side alone can answer the question "do I know what I'm actually spending money on, and am I sure there isn't a subscription or unknown charge quietly eating me alive?" The answer requires *both* sides — and the reconciliation between them. No personal expense tracker in the market today reconciles item-level receipt capture against credit card / bank statement coverage.

The deeper pattern underneath all four failure modes is attention: modern users have short attention spans **and** strong appetite for information about their own behavior. They will not fill out a form for every receipt. They will not learn Excel. But they will scan a receipt with a phone camera — or drop a statement PDF from their bank — if the result is instant, item-level, and visually legible. Friction at capture is the one barrier no expense tracker can afford.

Gastify's problem statement, then, is the gap those four options leave unaddressed:

> **There is no personal expense tracker that is (a) low-friction at capture for both receipts and statements, (b) item-level at depth, (c) reconciles statement-side coverage against receipt-side detail so nothing hides, (d) honest about concentration patterns in the user's own behavior, (e) available on real native mobile apps and the web, and (f) ships to non-Chilean markets from day 1.**

## §3 Vision / North Star {#vision}

**In six months, a Gastify user who has been scanning receipts and statements for even a few weeks can answer four questions about their own spending that no existing tool lets them answer quickly:**

1. **"What *kinds* of things am I actually buying — not which stores am I going to?"**
   A user opens the app and sees their top spending categories at the item level. Not "supermarkets = $ 340k this quarter" but "processed snacks = $ 42k, beer = $ 38k, baby formula = $ 61k". The 86-category V4 taxonomy (preserved exactly from the prototype per `docs/rebuild/LESSONS.md` R8) turns a wall of charges into a story the user can read in 20 seconds.

2. **"Where is my spending concentrating, and is that surprising me?"**
   The app surfaces **gravity centers** — periods, items, or categories where spending clusters more than the user's own baseline. Anomaly clusters: a week where meat spend doubled, a month where the pharmacy bill tripled, a category that has been growing monotonically for four quarters. The user's reaction is not "the app is telling me what to do" — it is "I didn't realize I was doing that." This distinction matters: Gastify surfaces, it does not prescribe.

3. **"Do I actually know what's on my credit card — or is something hiding in there that I don't remember?"**
   The user drops a credit card or bank statement (PDF) into the app. The statement-scan worker extracts every line-item charge, then **reconciles** each statement line against transactions already captured from receipts. Every charge ends up in one of three buckets:
   - **Matched** — receipt-sourced transaction + statement-sourced charge agree (store, date, amount within tolerance). Now a *complete* transaction: item-level detail from the receipt + settlement confirmation from the statement.
   - **Statement-only** — a charge appears on the statement but no receipt was ever captured. A minimal transaction is created from the statement data alone. Candidates here include forgotten subscriptions, auto-renewals, online charges the user never thought to photograph, and unauthorized activity.
   - **Receipt-only** — a receipt exists but no statement charge matched it. Surfaces capture errors (wrong date, wrong amount) or cash purchases.

   A simple **coverage metric** — *percent of statement spend with matched receipts* — turns the reconciliation into a running quality signal. Over time, surprise recurring charges and unknown subscriptions stop being discoverable only by accident.

4. **"Is the way I spend normal for households like mine — or am I an outlier?"** *(late-phase capability — override-01)*
   Post-rebuild, once a user base has accumulated, consenting users can contrast their own habits against anonymized cohort baselines (age-adjusted, household-size-adjusted, location-adjusted). This ships with hard k ≥ 20 anonymization floors, differential-privacy guarantees, sensitive-category suppression (pharmacy, donations, political), and revocation-aware recomputation. It is a phase, not a feature — and it is optional for the user.

Alongside those four, three affordances define the daily shape of using Gastify:

- **Two capture modes, one flow.** Take a photo of a receipt. Drop a PDF of a credit card statement. Either works, both feed the same ledger. Manual correction exists and is trusted (per `docs/rebuild/LESSONS.md` R1 — user edits are authoritative), but the default path requires zero form-filling. Under the hood, receipts are parsed in a two-stage pipeline — vision extraction, then separated categorization — with a deterministic math-reconciliation gate (`sum(items) + tax − discount == total` within the currency's minimum unit). Statements go through a parallel worker pipeline that emits a transaction array and runs the matching step against existing records. Anything that fails reconciliation surfaces for review, not silently.

- **Credit card aliases, never card numbers.** Users identify their cards by **alias only** (e.g., "Santander Visa", "Amex Blue"). Gastify stores no card numbers, no CVVs, no PAN fragments, no expiry dates. Card identity exists solely so the user can tag which card a statement came from and which transactions settled on it — not as payment infrastructure. This is a hard privacy posture: PCI-regulated data never enters the system.

- **Every item can be flagged.** Users can mark individual items as *urgency* or *special-case* for their own context — a medication bought during illness, an unplanned appliance repair, a gift. This is explicitly **not** a tax or reporting field: it is personal narrative. The flag shows up in the user's own views and nowhere else.

**What the product is *not* trying to do** (this is load-bearing, not decoration — non-goals protect the vision): it is not trying to be a tax tool, an income tracker, an investment dashboard, a business accounting system, or a kitchen/pantry inventory. Those are either other apps (a separate sibling app "Gustify" handles kitchen inventory), other companies, or deliberate non-goals. Gastify stays narrowly on: *expense ingestion → item-level understanding → behavior insight*.

The north-star test is a user conversation with two prompts:

> *"Can you tell me, in one minute, the top three things you're spending money on this month — not top three stores, top three **things**?"*
>
> *"Of everything that hit your credit card last month, what percentage do you have a receipt for — and what's the largest charge you can't explain?"*

If the user can answer both without opening a spreadsheet, Gastify has won.



## §4 Primary User {#primary-user}

**Role:** Personally-accountable adult managing their own household's expense visibility — "PFA" in the rest of this doc (Personal Finance Accountable).

**Description:** An adult, on a smartphone, with at least one credit or debit card and a steady-enough spending surface that store-level summaries are no longer informative. They want to understand their own behavior, not their tax exposure, business margin, or investment returns. They are not professionally trained in finance or spreadsheets. They live in one of Gastify's day-1 markets (Chile, LATAM, EU, US, or Canada) and transact primarily in one of the supported currencies (CLP, USD, EUR, GBP, CAD, MXN, BRL, ARS, PEN, COP — final list pending Step 6). They read one or more of: Spanish, English, Portuguese (day-1 locales; French/Italian/German post-launch).

They use their primary card(s) daily. They get receipts some of the time (supermarket, pharmacy, dining) and not other times (online purchases, auto-renewed subscriptions, in-app purchases). They open their monthly credit card statement, glance at the total, scan the first few lines, and close it without understanding 60–80% of what they just paid for.

They are single-user-per-account at MVP. The data model supports a future where a partner or household member joins the same ledger (`ownership_scope` pattern — see §10), but this is not shipped in v1.

**Jobs to be done (JTBD):**

- **JTBD-01** — *When I get home after a shopping trip, I want to capture what I bought without filling a form, so I can see my category-level spending without spending more time tracking than shopping.*
- **JTBD-02** — *When my monthly credit card statement arrives, I want to drop the PDF into the app and see which charges I can explain vs. which I can't, so I find forgotten subscriptions, auto-renewals, and possibly-fraudulent charges without reading line-by-line.*
- **JTBD-03** — *When I feel like my spending is off, I want to open the app and see where it's concentrating in my own data, so I can make a decision without asking someone or building a spreadsheet.*
- **JTBD-04** — *When I buy something unusual — medication during illness, a surprise gift, an appliance repair — I want to flag it as special-case in my own record, so my future reports don't treat that purchase as a normal pattern.*
- **JTBD-05** *(late-phase — override-01)* — *When I want to know whether my grocery spend is high for a household like mine, I want to compare against anonymized cohort data with consent, so I get a reference point without exposing my own identity.*

## §5 Secondary Users {#secondary-users}

Secondary users are audiences the MVP **does not serve** but the data model **does not preclude**. Listing them here is a scope declaration, not a promise: each has a ref back to the architectural hook that allows them to arrive later without a rewrite.

- **Household co-owner (H-gated, post-MVP).** A partner, spouse, or roommate invited to an existing user's `ownership_scope`. Sees the same ledger; attribution at transaction level (who entered it); shared analytics. Unblocked by the `ownership_scope` + `ownership_scope_members` data model shipped from phase 0 — see §10. Not accessible in v1; no invite flow, no sharing UI.
- **Multi-language user on same device.** A user whose OS locale differs from their receipt locale (e.g., US-English user traveling in Chile, or vice versa). The `display[locale]` taxonomy pattern (ADR D-categories) + i18n from phase 0 supports this natively. Called out as secondary because i18n edge cases (mixed-locale statements, non-Latin-script merchant names) are a phase-2 concern, not MVP.
- **Consenting cohort participant.** A user who opts in to contribute anonymized stats to the benchmarking cohort (§3 Q4 / override-01). Same person as primary in practice — it is a *mode* of use, not a different user — but their data flows through the tail-phase aggregation pipeline. Listed here so the consent + opt-out surface is not forgotten at MVP data-model time.

## §6 Non-Users {#non-users}

Gastify is **not** built for the following audiences. If a feature request originates from one of these, the answer is "not in this product" — not "someday." These drive §8 Non-Goals directly.

- **Businesses of any size.** Sole proprietors, small businesses, corporations, accounting teams. Business use introduces: multi-budget allocation, purpose-tagged purchases (cost-of-goods vs. overhead), tax-deduction tracking, expense-report workflows, approval hierarchies, employee reimbursements. All out of scope. *Referenced in intake: Q2, Q5.*
- **Tax preparers and users wanting tax features.** No deductions, no tax calculation, no IVA reporting, no DTE aggregation for SII, no Schedule-C export, no QuickBooks integration. Items can be flagged as urgency/special-case (§3 affordances) *only* for personal context — never for tax reporting. *Referenced in intake: Q5; ADR D17.*
- **Income / investment trackers.** No paycheck capture, no dividend tracking, no portfolio analytics, no net-worth view. Expense side only — the opposite half of the finance equation is deliberately out. *Referenced in intake: Q5.*
- **Kitchen / pantry inventory trackers.** A sibling app called "Gustify" addresses post-purchase kitchen inventory. Gastify stops at "what you bought" and does not track "what you still have" or "what expires when." *Referenced in intake: Q5.*
- **Users seeking prescriptive advice.** Gastify surfaces patterns (§3); it does not recommend cheaper brands, alternative subscriptions, or budgeting targets. A user expecting "you should switch to X" will be disappointed. Contract Revision / Alternatives Review is explicitly scoped as a *separate future app*. *Referenced in intake: Q4.*
- **Users without a smartphone or PC.** Infrastructure floor. Gastify requires a camera-equipped device (native mobile) or a computer with file upload (web portal). No SMS, no paper, no call-center alternative path.
- **Users who refuse LLM-based scanning.** Manual transaction entry exists (per `docs/rebuild/LESSONS.md` R1 — user edits are authoritative), so these users are technically served, but the *designed* experience depends on vision-LLM scanning. A user refusing Gemini-based parsing will have a degraded experience and is not the target of product polish.
- **Users with PCI / card-data expectations.** Anyone expecting the app to store, manage, tokenize, or transact on card numbers is in the wrong product. Gastify stores card **aliases only** (§3 affordances) — "Santander Visa", not `4532 **** **** 1234`. Card numbers never enter the system.
- **Benchmark opt-outs who want benchmarks.** A user who refuses to contribute cohort data cannot receive cohort-based insights (k-anonymity requires participation). The late-phase benchmarking feature (override-01) is consent-gated — non-participants get the four core capabilities (§3 Q1–Q3) but not Q5's cohort view.



## §7 Success Criteria {#success-criteria}

Observable user truths with bounds. Each SC covers one or more user JTBDs (§4) and maps to exactly one phase in ROADMAP.md (coverage matrix rendered at finalize). Order reflects logical build order, not priority.

### SC-01 — Item-level capture from a receipt photo {#sc-01}

**A user can photograph a receipt with their device (native or web upload) and, within 30 seconds of submission, see the resulting transaction in their ledger with merchant, date, total, and line-items each assigned to an L1/L2/L3/L4 category from the 86-category V4 taxonomy.**

- *Bound:* 30 seconds submission-to-visible at P95 for receipts ≤ 40 items under normal extraction-LLM latency. Degraded to "scan queued" UI under quota throttle (per research §2.7), never 5xx.
- *Why:* JTBD-01. The item-level wedge is §2's primary differentiator. Store-level-only is the market gap Gastify closes.
- *Covers:* JTBD-01.

### SC-02 — Item-level monthly view in seconds {#sc-02}

**A user can open their monthly spending view and, within 20 seconds of opening the app, read their top-5 spending categories at the item level (L2 granularity) for the selected month — no filters, no configuration, no spreadsheet.**

- *Bound:* 20 seconds app-open to top-5 visible at P95. L2 category granularity (middle layer of V4 taxonomy).
- *Why:* JTBD-03. North-star test §3 ("top 3 things in 1 minute") — this SC tightens to 20 seconds for top 5. Without this, the item-level differentiator never lands in the user's eyes.
- *Covers:* JTBD-03.

### SC-03 — Concentration / gravity-center awareness {#sc-03}

**A user can, on their monthly dashboard, see a ranked list of L2 categories where their spending has materially deviated from their own trailing baseline — highlighting both growth (>1.5× trailing 3-month average) and shrinkage (<0.5×) — without needing to configure anything.**

- *Bound:* 1.5× upper + 0.5× lower thresholds against trailing-3-month rolling baseline. L2 granularity.
- *Why:* JTBD-03, Vision Q2. Gravity-center detection is one of the three core differentiators (§3). Must be deterministic + explainable, not a black-box "anomaly score."
- *Covers:* JTBD-03.

### SC-04 — Statement reconciliation and coverage metric {#sc-04}

**A user can upload a credit card or bank statement PDF and, within 2 minutes of submission, see every line-item on the statement reconciled into three buckets — matched (statement line + existing receipt agree), statement-only (charge present but no receipt captured), receipt-only (receipt exists but no statement match) — plus a single coverage percentage for the period ("X% of statement spend has a matched receipt").**

- *Bound:* 2 minutes submission-to-visible at P95 for statements ≤ 200 lines. Match tolerance: exact merchant (or fuzzy-match configurable) + date within ±3 days + amount within 1% or currency-minimum-unit.
- *Why:* JTBD-02, Vision Q3. Closes the receipt/statement coverage gap (§2 fourth failure mode). Coverage metric is the single number the user watches to know if they're in control.
- *Covers:* JTBD-02.

### SC-05 — Item flagged as urgency / special-case, personal-only scope {#sc-05}

**A user can flag any individual item within a scanned transaction as "urgency" or "special-case", and that flag is visible in the user's own views only — never exposed in analytics exports, cohort aggregates, or shared-household views (when household becomes available).**

- *Bound:* Flag scope = user-private. Exclusion applies to all current and future aggregation surfaces.
- *Why:* JTBD-04. User explicitly requested this (intake Q5) as personal-context marking — explicitly NOT a tax or reporting field.
- *Covers:* JTBD-04.

### SC-06 — Data-integrity gate on AI-parsed scans {#sc-06}

**A user can trust that every AI-parsed transaction entering their ledger has passed a math-reconciliation gate (`sum(line-items) + tax − discount == total`, within the transaction's currency minimum unit) — and that any receipt failing the gate surfaces for manual review instead of landing silently.**

- *Bound:* Tolerance = 1 minor unit of the transaction's currency (1 CLP / 1 cent / 1 pence).
- *Why:* Research §2.1 (image-embedded prompt injection). Schema-validated structured output validates shape, not intent. The reconciliation gate is the deterministic floor that catches hallucinated items and malicious receipts.
- *Covers:* JTBD-01, JTBD-02 (both ingestion surfaces).

### SC-07 — User edits are authoritative {#sc-07}

**A user can manually correct any AI-parsed field of any transaction (merchant, date, amount, line-item text, category assignments, flags) and the system treats their edit as authoritative — subsequent automated processes (re-categorization jobs, reconciliation runs, cohort aggregation) must not override a user-edited field.**

- *Bound:* `user_edited_at` timestamp protects the field; any overriding automation must explicitly check this and skip.
- *Why:* `docs/rebuild/LESSONS.md` R1 (user edits are authoritative). Prevents "AI kept changing my correction" failure mode from the prototype era.
- *Covers:* All JTBDs (cross-cutting integrity).

### SC-08 — Sign-out leaves no authenticated data on the device {#sc-08}

**A user who signs out on any client (responsive web portal, Android app, iOS app) leaves no authenticated data reachable on that device — no cached API responses tied to their account, no locally-stored transactions, no auth tokens in keystore, no images in offline storage.**

- *Bound:* Tested via a dedicated E2E regression test per client platform (web + Android + iOS). Test frameworks per §9.1; patterns locked, tools suggested.
- *Why:* Research §2.6 (PWA sign-out cache leak — restated for native + web). Multi-user-per-device scenarios (family laptop, shared phone) leak account data across sessions if not explicitly evicted.
- *Covers:* All JTBDs (privacy-across-sessions).

### SC-09 — Multi-currency with stable historical USD-equivalent {#sc-09}

**A user can record transactions in any supported day-1 currency (CLP, USD, EUR, GBP, CAD, MXN, BRL, ARS, PEN, COP — final list per §9) and every transaction's USD-equivalent is captured at creation time using an FX rate that is write-once per (date, currency-pair) — a report generated today for January 2026 returns the same USD figures a month from now.**

- *Bound:* FX snapshot table is write-once per `(date, from, to)`. Historical reports do not drift.
- *Why:* Override-02 (global day-1). ADR D6 alignment. Research §2.5 (money representation integer minor units). Without this, cross-period analytics are meaningless.
- *Covers:* All JTBDs (cross-market foundation).

### SC-10 — Card alias identification without PCI data {#sc-10}

**A user can register any number of card aliases (e.g., "Santander Visa", "Amex Blue", "BBVA Debit") and attach each to uploaded statements and/or statement-reconciled transactions — and the system stores only the alias string: no card numbers, no CVVs, no expiry dates, no PAN fragments, no BIN ranges.**

- *Bound:* Schema contains `card_aliases.name` and nothing else card-identifying. Validated at API layer + enforced at DB layer.
- *Why:* §3 affordance + PCI-avoidance posture. Card-number storage would pull the product under PCI-DSS scope — explicitly not the product Gastify is.
- *Covers:* JTBD-02.

### SC-11 — Cohort benchmarking with privacy floor (late-phase) {#sc-11}

**A consenting user can, post-MVP, compare their own spending in any category to an anonymized cohort baseline — only when the cohort contains at least 20 similar households (k ≥ 20), sensitive categories (pharmacy, donations, political, health) are suppressed, differential-privacy noise (ε ≤ 1) is applied, and the user can revoke participation at any time with a cache-aware recomputation.**

- *Bound:* k ≥ 20 hard floor; ε ≤ 1 DP noise; sensitive-category suppression list maintained in config; revocation = immediate recompute, no cached cohorts survive.
- *Why:* Override-01 (user's explicit scope expansion). Research §2.3 (re-identification cliff at small N). This SC maps to the tail phase of ROADMAP and carries its own sub-architecture.
- *Covers:* JTBD-05. **Late-phase** — not blocking MVP launch.

### Coverage matrix (JTBD × SC)

| JTBD | Covered by |
|---|---|
| JTBD-01 (capture receipt, no form) | SC-01, SC-06 |
| JTBD-02 (statement → explained/unexplained) | SC-04, SC-06, SC-10 |
| JTBD-03 (concentration in own data) | SC-02, SC-03 |
| JTBD-04 (flag urgency/special) | SC-05 |
| JTBD-05 (cohort, late-phase) | SC-11 |
| *Cross-cutting* | SC-07, SC-08, SC-09 |

All 5 JTBDs covered. 11 SCs total (within the 3–10 range target; the extra is justified by the two ingestion modes + the multi-client delivery posture that make this project larger than a single-surface MVP).

## §8 Non-Goals {#non-goals}

Each non-goal is a direction the product explicitly does **not** pursue — feature requests in this space get "not in this product," not "someday."

### NG-01 — Income and investment tracking {#ng-01}

**We will not track income, salary, paychecks, dividends, interest, investment returns, capital gains, portfolio holdings, or any non-expense financial flow.**

- *Rationale:* Explicit user exclusion (intake Q5). Gastify occupies the expense half of the personal-finance ledger only. The full financial-loop product is a different category of app (Personal Capital, YNAB, Mint-successors) with different data model and different privacy profile.

### NG-02 — Tax features {#ng-02}

**We will not provide tax calculation, tax filing preparation, deduction tracking, DTE/IVA aggregation for Chilean SII, Schedule-C / 1099 exports for US users, VAT return assistance for EU users, or integrations with tax-preparation software.**

- *Rationale:* Explicit user exclusion (intake Q5). ADR D17 already draws this line for the Chilean context; this NG extends it globally. The urgency/special-case flag (SC-05) explicitly serves personal narrative, never tax categorization.

### NG-03 — Business and corporate use cases {#ng-03}

**We will not support multi-budget allocation, purpose-tagged purchases (cost-of-goods vs. overhead), expense-report workflows, approval hierarchies, employee reimbursements, company card programs, or any B2B or SMB accounting feature.**

- *Rationale:* Explicit user exclusion (intake Q2, Q5). Business features cascade into tax, approval, accounting, and audit concerns that fundamentally reshape the data model and privacy posture. Gastify is for persons.

### NG-04 — Prescriptive advice and alternatives recommendations {#ng-04}

**We will not recommend cheaper brands, alternative subscriptions, budget targets, financial products, lifestyle changes, or any prescriptive guidance based on a user's spending.**

- *Rationale:* Explicit user exclusion (intake Q4). Gastify surfaces patterns; users draw their own conclusions. "Contract Revision / Alternatives Review" was explicitly scoped as a separate future app. This NG also protects against the legal and ethical complexity of financial advice.

### NG-05 — Kitchen / pantry / post-purchase inventory {#ng-05}

**We will not track what a user has in their kitchen, pantry, fridge, or freezer after purchase, nor expiry dates, nor consumption rates, nor recipe suggestions.**

- *Rationale:* Explicit user exclusion (intake Q5). A sibling app called "Gustify" addresses post-purchase kitchen inventory. Gastify stops at "what was bought."

### NG-06 — PCI-regulated card data {#ng-06}

**We will not store, process, tokenize, transmit, or display card numbers, CVVs, expiry dates, PAN fragments, BIN ranges, or any other PCI-DSS-regulated payment instrument data.**

- *Rationale:* User-requested (intake Q5-followup). Storing card data would pull Gastify under PCI-DSS compliance scope — a full order of magnitude of additional infrastructure, audit, and ongoing attestation cost for zero product benefit. Card aliases (SC-10) serve all statement-attribution use cases without this burden.

### NG-07 — Direct bank aggregator integration {#ng-07}

**We will not integrate directly with bank aggregators (Plaid, Yodlee, Tink, Belvo, TrueLayer, MX) or connect to user bank accounts via API, OAuth, or screen-scraping.**

- *Rationale:* Inferred from user's explicit statement-scan mechanism (intake Q4 + Checkpoint 3 follow-up). Aggregator-based models carry per-user connection fees that killed Mint (research SUMMARY §1). Statement-scan via user-uploaded PDF is the ingestion path that matches Gastify's cost structure and privacy posture. Users in control of what flows in.

### NG-08 — Inflation-indexed currency units (UF, UTM, etc.) {#ng-08}

**We will not support Chilean Unidad de Fomento (UF), Unidad Tributaria Mensual (UTM), or any other inflation-indexed or regulatory currency unit — transactions are always denominated in nominal supported currencies (CLP, USD, EUR, GBP, CAD, MXN, BRL, ARS, PEN, COP).**

- *Rationale:* ADR D17 alignment. UF/UTM denomination appears on certain Chilean receipts (rent, loans, insurance premiums) but introduces daily-index lookup + historical conversion schemas that massively expand scope for a narrow slice of documents. These receipts can still be manually entered in nominal CLP at the user's discretion.



## §9 Constraints {#constraints}

Hard constraints — the premise shape that every phase plan and implementation choice must respect.

### 9.0 Wording convention — categories vs suggestions {#wording-convention}

This document is the project's backbone. Premises change slowly; tools change often. To keep SCOPE from rotting every time a library or vendor is swapped, §9 and §10 use two levels:

- **Category constraints** — the *kind* of tool or pattern the project requires (e.g., "async-capable typed backend language with OpenAPI story", "relational DB with JSONB + native scheduling"). These are **hard constraints**. Changing them is a `/gabe-scope-change` event.
- **Currently suggested (as of 2026-04-22)** — the specific tool, framework, library, or vendor that satisfies the category constraint at the time of authoring. These are **suggestions**, owned by ADRs, and may change over time **without** amending SCOPE — provided the replacement satisfies the category constraint.

The phrasing of every row in §9.1–§9.6 follows this split. A reader asking "is this decision frozen?" should read only the category. A reader asking "what does the codebase use today?" reads the suggested column.

### 9.1 Tech stack {#tech-stack}

| Layer | Category constraint (hard) | Currently suggested (2026-04-22) |
|---|---|---|
| Backend language | Modern typed backend language with first-class async support and a mature web-framework ecosystem | **Python 3.12+** (ref-03 ADR) |
| Backend framework | Async HTTP framework with automatic OpenAPI spec generation | FastAPI |
| Backend dep tool | Fast deterministic Python dependency manager with lockfile | uv |
| Database | ACID relational database with JSONB + native scheduling + row-level-security support | PostgreSQL 16+ |
| ORM | Python ORM with first-class typed model declarations | SQLAlchemy 2.x |
| Schema migrations | Version-controlled, ORM-compatible migration runner | Alembic |
| Identity provider | Managed auth service with cross-surface SDKs (web + native mobile) and OAuth federation | Firebase Auth (Google primary) |
| Vision / extraction LLM | Multimodal LLM supporting structured output via schema-validated response types | Gemini |
| Scan pipeline shape | Async worker process decoupled from API, emits progress events for streaming consumption (honors U5) | (pattern locked; current impl uses a queue table + dedicated worker container) |
| Job scheduler | Scheduled-job mechanism compatible with the chosen database; must have an in-process fallback for local dev | pg_cron primary, APScheduler + advisory lock fallback |
| Web framework | Modern typed SPA framework with strict types, fast iteration, and a mature ecosystem | React 18 + Vite + TypeScript strict |
| Web client state | Lightweight client state store + async query/cache library for SPAs | Zustand + TanStack Query v5 |
| Web API client typing | Type-safe API client generated from the backend OpenAPI spec | openapi-typescript + openapi-fetch |
| Component showcase | Component isolation + showcase tool for visual regression and docs | Ladle |
| Mobile framework | Cross-platform mobile framework producing Android + iOS artifacts from a single codebase, with managed build + OTA pipeline support | **React Native + Expo** (user direction, override-03) |
| Mobile code-share with web | Conceptual-level share only (mental model + types + OpenAPI client + category data via `shared/`); **not** shared UI components | (pattern locked) |
| Web E2E framework | Browser automation with headless + cross-browser support | Playwright |
| Mobile E2E framework | Grey-box E2E for the chosen cross-platform mobile stack | Detox (Expo-compatible) |
| Web unit tests | Fast JS/TS unit-test runner with watch + coverage | Vitest |
| Mobile unit tests | JS/TS unit-test runner compatible with the mobile framework | Jest |
| Backend unit tests | Python test framework with fixture + parametrize ergonomics | Pytest |
| Streaming — web | One-way progress transport over HTTP, recoverable, firewall-tolerant | Server-Sent Events (SSE) |
| Streaming — mobile | Bidirectional long-lived transport resilient to mobile network state (reconnect, backpressure) | WebSocket |
| Streaming contract | Both transports emit the identical `scan_event` contract; one event schema, two wire formats | (pattern locked) |

### 9.2 Budget

| Item | Category constraint (hard) | Currently suggested (2026-04-22) |
|---|---|---|
| Extraction-LLM quota | Enforced per-minute safety limit day 1 (override-protectable env var) to bound cost exposure | `GEMINI_SAFETY_LIMIT=12/min` |
| Extraction-LLM pricing tier | Pre-commit to a paid tier before launch (free-tier runway clock is incompatible with scan-dependent UX) | Gemini paid Tier-3 (research §2.7) |
| Hosting topology | Single-provider PaaS hosting API + worker + primary DB + object storage; must support private-network between services + managed Postgres | Railway |
| Mobile distribution | Paid developer-program enrollment on both major mobile platforms | Apple Developer Program (~$99 USD/yr) + Google Play Console (~$25 USD one-time) |
| Object storage | Server-side persistent blob storage on the same PaaS as the API (not a third-party object store) for receipt images + statement PDFs + thumbnails | Railway volumes |
| FX rate data source | External FX-rate API (free or low-cost tier) with daily granularity | (provider selection deferred to ADR — candidates include Frankfurter, open.er-api, similar) |
| Monetization posture | **Paid from launch.** Free-ad model is not financially viable under per-scan LLM cost; precedent (Kuanto) shows Chilean users pay in this category (research §1). Pricing mechanism deferred to a separate ADR. | (pattern locked) |

### 9.3 Timeline

*No externally-declared launch date.* ROADMAP (Step 7) will propose a phase sequence; gabe-plan + gabe-execute track delivery dates once phases run. Flagged here as **null** rather than hidden — the constraint is "ship the work in PLAN order," not "ship by date X."

### 9.4 Regulatory

| Jurisdiction | Framework | Hard-constraint elements from MVP |
|---|---|---|
| Chile | **Law 21.719** (new, replaces Law 19.628) | Consent table + processing register + sensitive-category handling (pharmacy, donations, political, health) + irreversible anonymization + sanctions denominated in UTM |
| EU | **GDPR** | Consent, data-subject rights (access, rectification, erasure, portability), lawful basis, DPO threshold check, breach notification |
| Canada | **PIPEDA** | Meaningful consent, purpose limitation, data retention schedule |
| US (state baseline) | **CCPA/CPRA** (California as baseline; CO/CT/VA/UT similar) | Do-not-sell signal support, right-to-know, right-to-delete, sensitive-category handling |
| PCI-DSS | N/A — **explicitly avoided** via NG-06 + SC-10 (card aliases only, never PAN) | None applies |

All four privacy frameworks require infrastructure (consent records, retention policy, deletion capability, sensitive-category awareness) in **phase 0**, not phase N+1 — bolt-on is not an option (research §2.2).

### 9.5 Team size

*Not explicitly declared.* PLAN's two-workstream split (Workstream A = UX, Workstream B = Backend) implies at least two parallel streams with potential for solo execution on each. Adding override-03's native Android + iOS workstreams to the picture: realistic execution shape is **2–4 contributors**, at least one of whom bridges backend + web; mobile may be specialist or delegated. This constraint is permissive, not binding.

### 9.6 Infrastructure

| Role | Category constraint (hard) | Currently suggested (2026-04-22) |
|---|---|---|
| PaaS host | Single provider hosting API + worker + DB + volumes + static web build with private networking between services | Railway |
| Primary datastore | Managed relational DB with JSONB, row-level-security, scheduled jobs, and backups | PostgreSQL (managed by the PaaS) |
| Blob storage | Persistent server-side volumes colocated with compute for receipt images + statement PDFs + thumbnails | Railway volumes |
| Scheduler | DB-adjacent or in-process scheduled-job runner (FX refresh, nightly reconciliation sweeps, cohort recompute) | pg_cron primary + APScheduler + advisory lock fallback |
| Identity provider | Managed auth provider with native SDKs for the web + both mobile platforms | Firebase Auth |
| Extraction LLM service | Multimodal-capable LLM with structured-output APIs and adequate paid-tier throughput | Gemini (Google AI) |
| Android push notifications | Platform-native push service for Android | FCM (Firebase Cloud Messaging) |
| iOS push notifications | Platform-native push service for iOS | APNs (Apple Push Notification service) |
| External FX provider | Daily FX rates covering the day-1 currency set; free or low-cost tier acceptable | (pending ADR selection) |
| Email (transactional) | Transactional email delivery for verification + password-reset + scan-complete alerts | (pending ADR selection) |

**Retired from prior refs:** VAPID keys + service worker (override-03 — PWA rejected; web portal is a non-installable SPA).

## §10 Architecture Posture {#architecture-posture}

Five posture dimensions — each a direction the architecture leans, not a specific implementation.

### 10.1 Synchrony

- **User-facing reads** — synchronous. Dashboard, transaction list, analytics views return in the same request/response cycle.
- **Scans (receipts + statements)** — **asynchronous** with dual streaming: **one-way HTTP stream on web**, **bidirectional long-lived on mobile** (both emit the same `scan_event` contract — `queued → picked_up → llm_start → llm_end → reconciling → completed | failed`). User submits, the API enqueues, a worker processes, and the client watches narrative events. Honors user-value **U5 — Stream the Thinking** (processing >5s must show real-time progress). The mobile transport chosen for network-state resilience (reconnect, backpressure) under mobile data volatility. Transport suggestions in §9.1 (currently: SSE web + WebSocket mobile).
- **Statement reconciliation** — async worker step after statement extraction completes. Matches against receipt-sourced transactions, writes match verdicts + coverage metric.
- **Cohort aggregation (late-phase, SC-11)** — batch via pg_cron. Cohort views are cached; revocation triggers recompute.
- **User edits** — synchronous. Protected by `user_edited_at`; no async overrides (SC-07).

### 10.2 Topology

- **Monorepo** shape: `apps/api/`, `apps/worker/`, `apps/web/`, `apps/mobile/` *(single cross-platform mobile codebase → Android + iOS artifacts — override-03; currently suggested: React Native + Expo)*, `shared/` (categories, i18n, OpenAPI types), plus the chosen migration directory (e.g. `alembic/`).
- **Shared backend** serves all three clients via a single API contract (one OpenAPI spec, one schema). No client-specific backend forks. This is the architectural *why* behind choosing an OpenAPI-native backend framework (decouple from web, serve all surfaces). The streaming layer has two transports (one-way HTTP stream for web + bidirectional long-lived for mobile) emitting the same `scan_event` contract — clients pick by platform.
- **Worker process** is a separate deployable from the API — independent scaling under LLM-provider throttle; independent restart without dropping user requests.
- **Web client** is a static SPA (build output served via the PaaS's static hosting or a CDN). **Not** a PWA — no service worker, no install prompt, no offline storage (override-03).
- **Mobile clients** (Android + iOS) are built from a **single cross-platform mobile codebase** in `apps/mobile/` producing two store artifacts (currently suggested: React Native + Expo). Shared with web only at the type + OpenAPI-client + category-data level (`shared/`), not at component level (different UI paradigm — web layout vs mobile-native gestures).
- **All three clients are online-required** for scan submission. No offline queueing in MVP. Attempted scan submission without connectivity fails with a clear error state — users retry when back online. This matches the web posture and keeps data model surface area small (no pending-sync table, no conflict resolution).

### 10.3 Data gravity

- **Money as integer minor units + ISO-4217 exponent.** All monetary columns suffixed `_minor` (e.g., `amount_minor`, `amount_usd_minor`). Currency reference table seeded with full day-1 set. **No** `NUMERIC(14,2)` for money (research §2.5).
- **USD shadow on every transaction/item.** `amount_usd_minor` + `fx_rate_to_usd` + `fx_captured_at` on every monetary row (ADR D6).
- **FX snapshot write-once.** `fx_rates` table keyed by `(date, from_currency, to_currency)`; rows never updated after insert. Historical reports do not drift.
- **Ownership scopes from day 1.** `ownership_scope_id` + `ownership_scope_members` tables as the ownership primitive, **not** `user_id` foreign keys on every table. RLS (row-level security) keys off scope, not `auth.uid`. Single-user MVP has a scope-of-one; household-later slots in without migration (research §2.4).
- **Canonical keys in English PascalCase.** All category keys, taxonomy identifiers, enum values use English PascalCase (`Supermercados` → `Supermarkets`); Spanish/English/Portuguese display labels live in the `display[locale]` map on the shared taxonomy (ADR D-categories).
- **Sensitive-category awareness from day 0.** Suppression list baked into schema + queries for: pharmacy, donations, political contributions, healthcare, adult goods. Needed for Law 21.719 + GDPR + cohort benchmarking (SC-11) all at once.
- **Consent + processing register** as first-class tables, not derived logs. Regulatory frameworks (Law 21.719, GDPR, PIPEDA, CCPA) all require auditable consent records.

### 10.4 Deployment target

- **Backend (API + worker + primary DB)** — single-PaaS hosting (currently suggested: Railway). Single region day 1 (exact region pending ADR based on latency to the day-1 user distribution).
- **Web portal** — static hosting (the PaaS's static capability or a CDN). Responsive design for desktop + mobile web; **not** installable, **not** a PWA.
- **Android app** — built from the cross-platform mobile codebase; distributed via Google Play Store. Release channels: internal → closed beta → open beta → production. Managed build + OTA-update pipeline (currently suggested: Expo EAS).
- **iOS app** — built from the same cross-platform mobile codebase; distributed via Apple App Store. Release channels: TestFlight internal → TestFlight external → production. Same managed build + OTA pipeline as Android.
- **Artifacts** — receipt images + statement PDFs + thumbnails on server-side persistent volumes. Client devices hold no persistent user data after sign-out (SC-08).

### 10.5 Integration surface

**Inbound API consumers (MVP):**
- Web portal (internal, OpenAPI-typed, streams scan progress via SSE)
- Android + iOS apps (single React Native + Expo codebase, OpenAPI-typed client, streams scan progress via WebSocket)

**Outbound integrations (MVP):**
- Managed identity provider (currently suggested: Firebase Auth) — token verify + JIT-provision
- Extraction-LLM service (currently suggested: Gemini) — vision extraction + categorization, two-stage per research §2.1
- Platform-native push services — Android (currently: FCM) + iOS (currently: APNs)
- External FX rate provider — daily rate fetch, cached in `fx_rates` table (provider pending ADR)
- Transactional email provider — verification, password-reset, alerts (provider pending ADR)

**Explicitly not integrated (MVP + posture):**
- Bank aggregators (Plaid, Yodlee, Belvo, Tink, TrueLayer, MX) — NG-07
- Tax authorities / SII / IRS / HMRC — NG-02
- Accounting systems (QuickBooks, Xero, Contabilium) — NG-03
- Third-party analytics / benchmarking services (cohort aggregation is internal) — NG-03/NG-04
- Payment processors — NG-06 (Gastify does not transact)

**Late-phase additions (post-MVP):**
- Structured-boleta-via-QR/CAF parser (Chile SII Resolution 52/2026 May 1 opportunity — nice-to-have per user, not MVP)
- Cohort benchmarking aggregation service (internal only, SC-11)


## §11 (reserved) {#reserved}

*Reserved for future top-level section. Re-number carefully via `/gabe-scope-change` if populated.*


## §12 Requirements {#requirements}

Capability units that implement the Success Criteria. Each REQ maps to exactly one phase in ROADMAP.md (see §5 Coverage Matrix). 27 REQs total; coverage verified at Step 8 finalize.

### Core ingestion + capture

#### REQ-01 — Receipt scan submission {#req-01}

API endpoint accepting a receipt image upload (JPEG/PNG/HEIC/PDF-single-page). Enqueues a scan job, returns a tracking id, debits the user's scan-credit balance. Validates file size + mime-type + per-user rate limit. *Covers:* SC-01.

#### REQ-02 — Two-stage receipt extraction worker {#req-02}

Async worker that consumes scan jobs: **stage 1** vision call to the extraction-LLM service (using schema-validated structured output) extracts raw fields (merchant, date, lines, totals, tax, discount); **stage 2** text-only call maps each extracted item to the V4 taxonomy (L1/L2/L3/L4). Splitting the two stages defends against image-embedded prompt injection (research §2.1). Tool suggestions in §9.1. *Covers:* SC-01, SC-06.

#### REQ-03 — V4 category taxonomy + display-locale map {#req-03}

`shared/categories.json` — 12 L1 + 44 L2 + 9 L3 + 42 L4 = 86 categories, canonical English PascalCase keys, `display[locale]` map for es / en / pt at day 1. Loaded by worker for categorization and by clients for rendering. Preserved exactly from prototype (`docs/rebuild/LESSONS.md` R8). *Covers:* SC-01, SC-02.

#### REQ-04 — Dual scan-progress streaming {#req-04}

Two streaming transports emitting the same `scan_event` contract (`queued → picked_up → llm_start → llm_end → reconciling → completed | failed`): one-way HTTP streaming for web clients, bidirectional long-lived connection for mobile clients. Backend produces events identically on both surfaces. Transport suggestions in §9.1 (currently: SSE + WebSocket). *Covers:* SC-01, SC-04 (honors U5 — Stream the Thinking).

#### REQ-05 — Transaction ledger API {#req-05}

CRUD + query endpoints for transactions, line-items, card attributions, flags. Paginated list with filter-by-period + filter-by-category + filter-by-card-alias. Honors `user_edited_at` precedence on all fields. *Covers:* SC-01, SC-02, SC-04, SC-07.

#### REQ-06 — Monthly analytics view {#req-06}

Top-N-by-L2-category endpoint for any period (day/week/month/quarter/custom). Response bounded to sub-500ms server-side for 12 months of a typical user's data to meet SC-02's 20s client-wall target. *Covers:* SC-02.

### Statement reconciliation + cards

#### REQ-07 — Statement upload + extraction worker {#req-07}

PDF upload endpoint → queues job → worker invokes the extraction-LLM service with a statement-variant prompt → emits an array of transaction records per statement line (merchant, date, amount, currency, card alias). *Covers:* SC-04.

#### REQ-08 — Reconciliation engine {#req-08}

Post-extraction matching step: for each statement line, attempt match against existing receipt-sourced transactions within the statement's period. Match rules: merchant (exact or configurable-fuzzy), date ± 3 days, amount ± 1 minor unit OR 1%, card alias scope. Produces three buckets + the coverage metric. Writes reconciliation verdict per line. *Covers:* SC-04.

#### REQ-09 — Card alias CRUD {#req-09}

Endpoints to create / rename / archive card aliases. Schema contains `name` + `created_at` + `archived_at` only — no PCI fields. Validated at API + enforced at DB layer. *Covers:* SC-04, SC-10.

### Insights

#### REQ-10 — Concentration / gravity-center detection {#req-10}

Computes per-L2-category trailing-3-month rolling baseline vs. current month. Flags categories where ratio > 1.5× (growth) or < 0.5× (shrinkage). Renders ranked list on monthly dashboard. Deterministic, explainable — not a black-box anomaly score. *Covers:* SC-03.

#### REQ-11 — Item urgency/special-case flag {#req-11}

Per-line-item flag field. Exposed in user's own views; **excluded** at the query layer from every aggregation surface (monthly analytics, gravity-center, cohort aggregation, shared-household views when future). Enforced by policy filters, not post-hoc. *Covers:* SC-05.

### Data integrity + user sovereignty

#### REQ-12 — Math reconciliation gate {#req-12}

Deterministic check post-stage-2 of the scan worker: `sum(line-items) + tax − discount == total`, tolerance = 1 minor unit of the transaction's currency. Failures route to a review queue (user sees "needs manual review" state) instead of silently landing in the ledger. *Covers:* SC-06.

#### REQ-13 — User-edit precedence {#req-13}

Every transaction + line-item field carries `{value, user_edited_at}`. Any overriding automation (re-categorization, reconciliation re-run, cohort aggregation) must check `user_edited_at` and skip fields the user has touched. Enforcement in the service layer + regression tests. *Covers:* SC-07.

#### REQ-14 — Sign-out isolation across 3 clients {#req-14}

Per-platform procedures + dedicated regression tests. Web: asserts cache + browser-local-storage eviction, no authenticated fetch survives. Mobile (both iOS + Android builds): asserts platform-keystore eviction + cached API response cleared. Test frameworks per §9.1 (currently suggested: Playwright web / Detox mobile). *Covers:* SC-08.

### Foundation

#### REQ-15 — Ownership scope data model {#req-15}

`ownership_scope_id` + `ownership_scope_members` tables as the ownership primitive. Every user-owned row keys off `ownership_scope_id`, never `user_id` directly. RLS policies key off scope. Single-user MVP = scope-of-one; household-later slots in without migration. *Covers:* SC-07 (indirect), SC-08 (indirect), foundation for all JTBDs.

#### REQ-16 — Managed-auth integration + JIT user provisioning {#req-16}

Token verification middleware against the chosen managed identity provider (currently suggested: Firebase Auth); JIT-provisioning on first sign-in (insert `users` row + `ownership_scope` of one + initial scan-credit balance). Platform-native client SDKs (web + both mobile platforms) plug into the same endpoint. *Covers:* foundation for all JTBDs.

#### REQ-17 — Integer-minor-units money representation {#req-17}

Schema convention: all monetary columns suffixed `_minor`; `currencies` reference table with ISO-4217 exponent (CLP=0, USD=2, EUR=2, GBP=2, CAD=2, MXN=2, BRL=2, ARS=2, PEN=2, COP=2). Application-level validators + DB constraints reject non-integer money writes. *Covers:* SC-09 (foundation).

#### REQ-18 — FX snapshot + USD shadow {#req-18}

`fx_rates` table keyed by `(date, from_currency, to_currency)`, write-once. On transaction create, worker computes `amount_usd_minor` + `fx_rate_to_usd` + `fx_captured_at` from the snapshot for that date (or fetches today's rate if absent). External FX provider fetched via a daily scheduled job (current scheduler per §9.1); historical rates never updated. *Covers:* SC-09.

#### REQ-19 — Currency + locale registry {#req-19}

Day-1 supported set — currencies: CLP, USD, EUR, GBP, CAD, MXN, BRL, ARS, PEN, COP. Locales: es, en, pt. Configured centrally; display formatting per-locale + per-currency. Users choose display currency + display locale (may differ from receipt source). *Covers:* SC-09.

#### REQ-20 — Consent + processing register (four-jurisdiction) {#req-20}

First-class `consent_records` + `processing_register` tables. Records user consent per processing purpose (scan, reconciliation, notifications, cohort opt-in). Surfaces data-subject-rights endpoints (access, rectification, erasure, portability) to satisfy Law 21.719 + GDPR + PIPEDA + CCPA/CPRA at MVP. Sensitive-category suppression list baked into category taxonomy config. *Covers:* regulatory foundation (§9.4), enables SC-11.

#### REQ-21 — Observability pipeline {#req-21}

Per-scan metrics: `llm_tokens_in`, `llm_tokens_out`, `llm_cost_usd`, `scan_duration_ms`, `llm_latency_ms`, `queue_wait_ms`, `thumbnail_gen_ms`. Structured logs + metric export. Honors user-value **U8 — Measure the Machine**. *Covers:* cross-cutting — enables budget-aware operation.

#### REQ-22 — i18n infrastructure {#req-22}

Translation string registry + locale-negotiation middleware (accept-language header + user preference override). Day 1: es + en + pt. Strings loaded from `shared/i18n/` per locale. Clients consume via type-safe keys. *Covers:* enables SC-02 on multilingual content.

### Client surfaces

#### REQ-23 — Responsive web portal {#req-23}

Typed SPA consuming the API via a type-safe generated client; one-way streaming client for scan progress. Responsive layout (desktop-first, mobile-web acceptable). **Not** a PWA — no service worker, no install prompt, no offline cache. Implements sign-out eviction per SC-08. Framework + library suggestions in §9.1. *Covers:* SC-01/02/03/04 on web, SC-07, SC-08, SC-11 (when live).

#### REQ-24 — Mobile app (cross-platform) {#req-24}

Single cross-platform mobile codebase → Android + iOS artifacts via a managed build + OTA pipeline. Bidirectional long-lived streaming client for scan progress. Platform camera access, native file picker, native keystore for auth tokens. Unit + E2E test suites per platform build. Implements sign-out eviction per SC-08 on both platforms. Framework + tooling suggestions in §9.1 (currently: React Native + Expo + Expo EAS + Jest + Detox). *Covers:* SC-01/02/03/04 on mobile, SC-07, SC-08.

#### REQ-25 — Push notifications {#req-25}

Platform-native push services on both mobile platforms (currently: FCM Android + APNs iOS). Backend notification registry tracks device tokens per user + per platform. Used initially for scan-complete + reconciliation-complete alerts. Opt-in per user. *Covers:* mobile UX affordance, late-phase hook.

### Late-phase capabilities

#### REQ-26 — Structured-boleta QR/CAF shortcut {#req-26}

Detects Chilean electronic-boleta QR codes (SII Resolution 52/2026, effective May 2026). When present, parses structured data directly — skips the vision LLM entirely for electronic receipts. Falls back to the vision pipeline for paper/photo receipts. Dramatically cuts per-scan cost for Chilean users. User-declared nice-to-have; post-MVP. *Covers:* SC-01 (optimization path).

#### REQ-27 — Cohort benchmarking aggregation (DP-engineered) {#req-27}

Late-phase pipeline: (a) consent-gated contribution, (b) cohort-definition logic (age / household-size / location buckets with k ≥ 20 hard floor), (c) differential-privacy noise (ε ≤ 1), (d) sensitive-category suppression (pharmacy, donations, political, health), (e) revocation-aware recompute (no cached cohorts). User contrasts own spend vs cohort baseline per category. *Covers:* SC-11.

### Coverage matrix (SC × REQ)

| SC | Covered by |
|---|---|
| SC-01 (receipt scan) | REQ-01, REQ-02, REQ-03, REQ-04 |
| SC-02 (monthly view 20s) | REQ-03, REQ-05, REQ-06, REQ-22 |
| SC-03 (gravity centers) | REQ-10 |
| SC-04 (reconciliation + coverage) | REQ-04, REQ-05, REQ-07, REQ-08, REQ-09 |
| SC-05 (item flag personal-only) | REQ-11 |
| SC-06 (math gate) | REQ-02, REQ-12 |
| SC-07 (user edits authoritative) | REQ-13, REQ-15 |
| SC-08 (sign-out isolation 3 clients) | REQ-14, REQ-23, REQ-24 |
| SC-09 (multi-currency FX stability) | REQ-17, REQ-18, REQ-19 |
| SC-10 (card aliases no PCI) | REQ-09 |
| SC-11 (cohort benchmarking late-phase) | REQ-20, REQ-27 |

**Every SC is covered.** Foundation REQs (REQ-15, REQ-16, REQ-20, REQ-21) and client surfaces (REQ-23, REQ-24, REQ-25) are cross-cutting — they enable multiple SCs rather than cover a single one exclusively.


## §13 Phase cross-reference {#phase-cross-reference}

Pointer to ROADMAP.md — the phase plan that implements the REQs in §12. See `.kdbp/ROADMAP.md` for:

- §2 Phase Table (at-a-glance 9 phases, granularity = fine)
- §3 Phase Detail (goal, why, covers REQs, exit signal, dependencies per phase)
- §4 Dependency Graph (mermaid)
- §5 Coverage Matrix (REQ × Phase)
- §6 Roadmap Change Log

ROADMAP.md changes as phases complete, split, or insert — without amending SCOPE.md. New REQs arriving via `/gabe-scope-change` are inserted here and mapped into a phase in ROADMAP.

## §14 Open Questions {#open-questions}

None blocking premise. Deferred items (addressed in downstream ADRs or PLAN):

- **ADR D19** — specific mobile-framework libraries (navigation, state, camera) within React Native + Expo direction
- **ADR** — FX rate provider selection (category constraint in §9.6)
- **ADR** — Transactional email provider selection (category constraint in §9.6)
- **ADR** — Railway / PaaS region selection (§10.4)
- **ADR (separate)** — Pricing mechanism + monetization tiers (posture locked in §9.2, mechanism deferred)
- **Downstream** — PLAN.md + ADR + UX-PLAN + BEHAVIOR.md reconciliation with overrides 01–03 (flagged post-finalize in §0 Reference Frame)

## §15 Change Log {#change-log}

| Date | Version | Type | Summary |
|---|---|---|---|
| 2026-04-22 | v1 | init | Initial SCOPE.md authored via `/gabe-scope` v1.0. Reference Frame: 9 refs declared (3 authoritative / 5 suggestive / 1 contextual). 11 SCs + 8 NGs + 27 REQs. Granularity = fine (9 phases). |
| 2026-04-22 | v1 | override | `override-01` — added cohort benchmarking as tail-phase capability (SC-11, REQ-27, Phase 9). Affects refs 01, 03. Downstream: PLAN.md + ADR require update. |
| 2026-04-22 | v1 | override | `override-02` — expanded geography Chile-only → global from day 1 (Chile + LATAM + EU + US + Canada). Currency set grew to 10. Compliance footprint expanded to 4 jurisdictions (21.719 + GDPR + PIPEDA + CCPA/CPRA). Affects refs 01, 03, 05. Downstream: ADR D17 re-scope, PLAN i18n expansion. |
| 2026-04-22 | v1 | override | `override-03` — PWA rejected. Deliverables changed to responsive web portal + cross-platform native Android + iOS via single shared backend API. Retired VAPID + service worker. Affects refs 01, 03, 04. Downstream: ADR D19 required (mobile direction locked to React Native + Expo suggestion); PLAN service-worker cuts; UX-PLAN PWA-gesture rework. |
