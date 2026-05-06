# Worker Pipeline Runbook

Referenced by A.17 §7. Receipt extraction two-stage pipeline and prompt-injection defense.

## Two-Stage Architecture

```
Receipt Image → [Stage 1: Vision] → Structured Extraction → [Stage 2: Text-Only] → Categorized Items
```

| Stage | Model Type | Input | Output | Context |
|-------|-----------|-------|--------|---------|
| Stage 1 | Vision (multimodal) | Receipt image | Structured raw extraction (items, prices, merchant, date) | Isolated — no taxonomy knowledge |
| Stage 2 | Text-only | Structured extraction (JSON) | Categorized items mapped to taxonomy | Isolated — no image access |

**Invariant:** The two stages MUST be distinct model calls with no shared context. A single-prompt extractor that combines vision + categorization is architecturally forbidden.

## Defense Rationale

Image-embedded prompt injection (research §2.1) can manipulate LLM behavior when vision and reasoning share a single context. The split ensures:
- Stage 1 extracts raw data from the image (attack surface: manipulated text on receipt)
- Stage 2 categorizes from structured data only (no image access → no vision-layer injection)
- A compromised Stage 1 output is caught by Stage 2's taxonomy validation (items must match known categories)

## Enforcement

**pytest gate:** `backend/tests/security/test_two_stage_distinct.py`
- Asserts stage-1 and stage-2 are two distinct model API calls
- Asserts no shared context (conversation/thread ID) between calls
- Fails build if pipeline is collapsed into a single call

**CVE-watch:** Monitor the vision LLM provider for prompt-injection vulnerabilities. Feed into SCA pipeline.

## Statement Pipeline

Statement PDF parsing follows the same two-stage pattern:
1. Stage 1: PDF → structured line items (sandboxed worker)
2. Stage 2: Line items → categorized transactions (text-only)

## Implementation Status

- [ ] Stage 1 vision extraction worker
- [ ] Stage 2 text-only categorization worker
- [ ] Pipeline orchestrator (scan job → stage 1 → stage 2 → reconciliation)
- [ ] pytest two-stage assertion test
- [ ] Statement PDF sandboxed parsing
