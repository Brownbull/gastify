# Active Plan

<!-- status: active -->
<!-- project_type: code -->

## Goal

Manual-entry hardening per user spec: backend input validation/sanitization (name whitelist; integer quantities >= 0; non-negative prices), a configurable date-format user preference (settings + placeholders), cents-aware price entry for exponent>0 currencies, and user-assignable categories on the manual form — tests + e2e.

## Context

- **Maturity:** mvp; Phase 1 validation is ent-ish (input boundary).
- **Created:** 2026-06-11
- **Last Updated:** 2026-06-11 (the POST /transactions endpoint exists; the gap is the RULES. Names: letters incl. accents + digits + spaces + dots ONLY, 422 otherwise. Date: backend-typed already; FE placeholder shows the user's configured format (dd/MM/yyyy vs MM/dd/yyyy) - a NEW user preference. Quantities: INTEGERS >= 0 (user self-corrected from float; flagged for confirmation). Prices: minor-unit integers >= 0; cent-currencies get whole+cents fields composed client-side. Categories: pickers over existing reference endpoints; create API already accepts them.)

## Phases

| # | Phase | Description | Tier | Complexity | Exec | Review | Commit | Push |
|---|-------|-------------|------|------------|------|--------|--------|------|
| 1 | Backend validation | TransactionCreate + item schema validators: name whitelist (letters/digits/spaces/dots), qty int>=0, prices>=0; applies to the API create path only (scan/statement paths construct internally). Contract tests incl. rejection messages. | ent | med | ⬜ | ⬜ | ⬜ | ⬜ |
| 2 | Date-format preference | users.date_format (dd/MM/yyyy | MM/dd/yyyy) + profile read + rectification write + settings select; types regen. | mvp | low-med | ⬜ | ⬜ | ⬜ | ⬜ |
| 3 | Form upgrades | Manual form: date text-field with the configured-format placeholder + client validation; cents field pair when currency exponent>0; store + item category pickers; qty fields. e2e: invalid name 422 surfaced, date format honored, category lands on the created txn. | mvp | med | ⬜ | ⬜ | ⬜ | ⬜ |

## Current Phase

Phase 1: Backend validation

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| The whitelist rejects legit merchants (e.g. "M&M", hyphens) | med | the rule is the USER'S spec (letters/digits/spaces/dots only); revisit on real-world friction |
| Validation breaking scan/statement internal creates | high | validators live on the API schemas only; internal paths construct models directly - regression-run the scan/statement suites |
