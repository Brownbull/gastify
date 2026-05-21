# Scan Pipeline — "Receipt translator — photo in, line-items out, hallucinations caught at gate."

> Vision LLM (Gemini) → guardrails → two-stage extraction → V4 categorizer → math-reconciliation gate → streaming. Core differentiator.

**Paths:** `backend/app/agents/**`, `backend/app/services/scan*`, `backend/app/services/coalesce.py`, `backend/app/services/math_gate.py`, `backend/app/prompt_lab/**`, `backend/tests/test_scan*`, `backend/tests/test_prompt_lab.py`

<!-- Standards: see ~/.claude/skills/gabe-docs/SKILL.md (CommonMark + Mermaid + analogy-first) -->

---

## Purpose

G4 owns the receipt scan path: image extraction, deterministic cleanup,
categorization, math reconciliation, prompt-lab evidence, and runtime review
signals. The well exists to keep AI uncertainty contained behind typed
contracts instead of letting prompt behavior leak directly into the ledger or
UI.

## Key Decisions

### 2026-05-20 — Review warnings stay in G4 unless they become contracts

Runtime scan warnings are computed in one helper inside the scan pipeline from
raw extraction, processed extraction, and the math verdict. The helper does not
depend on prompt-lab baselines because live scans have no expected receipt.

The only cross-well touches are real contracts: G2 Data Model stores
`scan_review_level` and `scan_review_signals` on transactions, and G1 API Core
exposes those fields through `scan_complete` plus transaction list/detail
responses.

### 2026-05-20 — Receipt order remains the canonical correction view

`TransactionItem.sort_order` remains the load-bearing item order for comparing
the extracted list against the receipt image. Category grouping is a secondary
view over the same rows, not a replacement for receipt order.

## Key Diagrams

```mermaid
flowchart TD
  upload(("Receipt image")) --> worker["Scan worker<br/>status + stream"]
  worker --> extract["Gemini extraction<br/>raw + processed"]
  extract --> coalesce["Coalescing<br/>canonical fields"]
  coalesce --> categorize["Categorization<br/>L4 item keys"]
  categorize --> math{"Math gate<br/>reconciles?"}
  math --> signals["Review signals<br/>runtime evidence only"]
  signals --> persist[(Transactions<br/>items + scan_review_*)]
  signals --> complete(("scan_complete<br/>review_* fields"))
  signals -. schema .-> g2[["G2 Data Model"]]
  complete -. contract .-> g1[["G1 API Core"]]

  classDef input fill:#fff4cc,stroke:#9a6b00,color:#2b2300;
  classDef process fill:#e8f1ff,stroke:#1f5fbf,color:#10233f;
  classDef decision fill:#fde2e2,stroke:#b42318,color:#3b0b08;
  classDef store fill:#e7f6ec,stroke:#1f7a3f,color:#0b2f18;
  classDef contract fill:#eef2f7,stroke:#475467,color:#101828;
  class upload,complete input;
  class worker,extract,coalesce,categorize,signals process;
  class math decision;
  class persist store;
  class g1,g2 contract;
```

## Gravity Boundaries

| Boundary | Rule |
| --- | --- |
| G4 default | Keep orchestration, coalescing, math, prompt-lab evidence, and review-signal computation here. |
| G2 crossing | Only for persisted schema/transaction columns. |
| G1 crossing | Only for API and stream payload contracts. |
| Split rule | Add helpers only when they reduce real complexity. The current review-signal pass adds one helper and does not split `coalesce.py`. |

## Topics (auto-appended)

<!-- /gabe-teach topics appends verified topic summaries here on first run. -->
<!-- Do not edit the structure below this line; edit individual entries freely. -->
