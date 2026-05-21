---
name: gastify
domain: Smart personal expense tracker — AI receipt scanning (item-level, 86-category taxonomy), multi-currency analytics with USD-shadow, concentration/anomaly detection. Responsive web portal + native Android + native iOS, shared FastAPI backend. Markets from day 1 Chile + LATAM + EU + US + Canada. Rebuild of BoletApp.
maturity: mvp
project_type: mockup
tech: python, fastapi, postgresql, sqlalchemy, alembic, firebase-auth, gemini, react, typescript, vite, zustand, tanstack-query, uv, playwright, pytest, vitest, ladle, openapi-typescript, react-native, expo, eas, detox, jest
created: 2026-04-22
---


# Project Behavior Rules

## B1 — Inventory before proposing (architecture / exploratory questions)

**Trigger phrases:** "can we work on", "should we", "I'm wondering", "explore the possibility", "what do you think about", "how can we approach", "is it possible to". Treat as diagnose-prompts, not build-prompts.

**Mandatory inventory before any proposal:**
1. Read existing project state: `.kdbp/PLAN.md`, `.kdbp/SCOPE.md`, `.kdbp/STRUCTURE.md`, `.kdbp/ROADMAP.md`, `.kdbp/AUDIT.md` (if present)
2. Read suite command(s) being extended: `~/.claude/commands/gabe-*.md`
3. Read relevant catalog: `~/.claude/templates/gabe/tier-sections/*.md`
4. If proposing external dep: clone repo, verify license + actual surface (not just README)
5. List what already exists for this question before proposing what's missing

**Proactive suggestions on detection:**
- Suggest user run `/plan` (your `feedback_plan_overrides_auto` rule then enforces wait-for-confirm)
- Offer `/gabe-roast [perspective]` or `/gabe-assess` for adversarial first-pass before plan-text
- If auto-mode active, override it for exploratory Qs — surface inventory + recommendation, wait for user direction

**Self-check before delivery:** "Did I read existing state? Did the user already do this analysis? Am I proposing what already exists under a new name? Did I challenge my first framing?"

**Caveman/terse modes compress output prose only. Reasoning depth is invariant.**

**Why this rule exists:** Past incident (2026-04-24, gastify mockup workflow Q) where shallow first-pass restated work the user had already done in `.kdbp/PLAN.md` + `AUDIT.md` + `STRESS-TEST-SPEC.md`. User flagged as workflow-sustainability concern.

## B2 — Runtime staging proof before review

**Trigger phase types:** `auth`, `session`, `DB`, `upload`, `realtime`, `streaming`, `native-mobile`, `notifications`, `file-media`, `web`, `user-facing`, or any deployed API/client contract change.

**Mandatory gate:** For these phases, `/gabe-execute` is not complete until it produces branch-backed Railway staging proof. The candidate code must be committed, pushed to `origin/staging` or explicitly deployed to the Railway staging services, and verified against the deployed staging URL before `/gabe-review` runs.

**Accepted evidence:** `.kdbp/LEDGER.md` must record the branch/commit, GitHub CI result or explicit Railway fallback deploy command, Railway service/API URL, readiness output with current Alembic head, target device/browser, mobile build id when applicable, provider mode, and artifact paths.

**Rejected as closure evidence:** local-only runs, unit/type/lint evidence, and mobile manifests whose API URL is `127.0.0.1`, `localhost`, SQLite, or mock-only. These can support implementation but cannot close Exec/Review for runtime-gated phases.

**Current policy decision:** Phase 4 was reset on 2026-05-21 so the push-registration S23 proof must run against deployed `staging-e2e` before the review can close.
