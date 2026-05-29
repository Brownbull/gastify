# Active Plan — P8 Structured-Boleta QR/CAF Shortcut

<!-- status: active -->
<!-- project_type: code -->
<!-- created: 2026-05-29 -->
<!-- last_updated: 2026-05-29 -->

## Goal

Implement P8 (REQ-26): for Chilean electronic boletas (SII Resolution 52/2026) carrying a QR/PDF417 timbre electrónico (TED), detect the code, parse the structured payload, and produce a transaction WITHOUT calling the vision LLM (0 extraction-LLM tokens). The vision pipeline stays the default for paper/photo receipts.

## Context

- Roadmap phase: P8 Structured-Boleta Shortcut. Post-MVP nice-to-have. Depends on P2 (worker) + P7 (ship).
- SII TED format (confirmed via research): the timbre is a PDF417 (legacy) / QR (per Res. 52/2026) barcode whose payload is a `<TED>` XML with `<DD>` (datos del documento): `<RE>` RUT emisor, `<TD>` tipo DTE (39 = boleta afecta, 41 = boleta exenta), `<F>` folio, `<FE>` fecha emisión (YYYY-MM-DD), `<RR>`/`<RSR>` receptor, `<MNT>` monto total (integer CLP, no decimals), `<IT1>` primer item, plus `<CAF>` + `<FRMT>` (signature).
- Standing drive decision: code-complete + local gates; the barcode IMAGE-DECODE (PDF417/QR from pixels needs a native lib) is runtime-deferred behind a seam. The PARSER + pipeline SHORTCUT are the testable core.
- Latest migration head: 025. P8 likely needs no migration (reuses scan/transaction tables).

## Environment Gate Standard

Code + local gates close Exec/Review/Commit. Deferred to the launch staging session: the real barcode image-decode (native dep), and the <3s / 0-token live proof on a deployed boleta scan.

## Phases

| # | Phase | Types | Description | Tier | Complexity | Exec | Review | Commit | Push |
|---|-------|-------|-------------|------|------------|------|--------|--------|------|
| 1 | TED payload parser | `parser, data-contract, test` | Parse a TED XML payload (`<DD>` fields) into a structured boleta result (merchant, RUT, folio, date, total, optional first item); validate tipo DTE is a boleta; reject malformed/non-boleta payloads. | ent | high | ✅ | ✅ | ✅ | ⬜ |
| 2 | Boleta scan shortcut (bypass vision LLM) | `worker, integration, resilience, test` | Detect a boleta payload on a scan and, when present, produce the transaction directly from the parsed TED (0 extraction-LLM tokens, math-gated on MNT), bypassing stage-1/2 LLM; emit the normal scan events; paper path unchanged. Image-decode behind a runtime-deferred seam. | ent | high | ✅ | ✅ | ✅ | ⬜ |
| 3 | P8 exit-gate evidence packet | `docs, test` | Map the REQ-26 exit signal (parse → bypass → 0 tokens, paper unchanged) to local evidence; document the deferred runtime (native barcode decode + <3s live proof). | ent | medium | ✅ | ✅ | ✅ | ⬜ |

## Phase Details

### Phase 1 — TED payload parser
```yaml
phase: 1
types: [parser, data-contract, test]
phase_tier: ent
requirements: [REQ-26]
```
A pure parser `parse_ted_payload(xml: str) -> BoletaExtraction | None`: extracts `<DD>` fields (RE, TD, F, FE, RR, RSR, MNT, IT1) into a structured result; validates `TD ∈ {39, 41}` (boleta); returns None / raises a typed error for malformed or non-boleta documents. No signature verification (CAF validation is a separate runtime concern). Tests over TED XML fixtures (valid boleta, exenta, non-boleta TD, malformed, missing MNT).

### Phase 2 — Boleta scan shortcut (bypass vision LLM)
```yaml
phase: 2
types: [worker, integration, resilience, test]
phase_tier: ent
requirements: [REQ-26]
```
A `decode_boleta_barcode(image_bytes) -> str | None` seam (native PDF417/QR decode is runtime-deferred; default returns None → vision path). When a payload decodes + parses to a boleta, produce the transaction directly from the TED (merchant, total=MNT, date=FE, currency CLP, optional item), math-gated, with 0 extraction-LLM tokens, emitting the normal scan event sequence; otherwise fall through to the unchanged vision pipeline. Tests: shortcut path (parsed payload → transaction, 0 tokens, events) + fall-through (no payload → vision path unchanged).

### Phase 3 — P8 exit-gate evidence packet
```yaml
phase: 3
types: [docs, test]
phase_tier: ent
requirements: [REQ-26]
```
`docs/runbooks/P8-BOLETA-EXIT-GATE.md` mapping the REQ-26 exit signal to local evidence; document deferred runtime (native barcode decode dependency + the <3s / 0-token live proof on deployed staging).

## Current Phase

P8 plan is **local-complete** — all 3 phases Exec ✅ Review ✅ Commit ✅. Push ⬜ pending the user's staging push + deferred runtime (native barcode decode + <3s/0-token live proof per `docs/runbooks/P8-BOLETA-EXIT-GATE.md`). The roadmap drive continues to the final phase P9 (Cohort Benchmarking, DP-engineered) via a new plan.

## Dependencies
- Phase 2 depends on Phase 1's parser.
- Phase 3 consolidates 1–2.

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| TED format variance across emisores | medium | Parse defensively (tolerate optional fields); validate MNT + TD; reject on missing required fields rather than guess. |
| Bypassing the vision LLM skips its safety/extraction guards | high | Keep the math gate (MNT vs item sum where items present); restrict to TD∈{39,41}; on any parse doubt, fall through to the vision pipeline (fail-safe to the proven path). |
| Native barcode decode is environment-heavy | expected | Decode behind a seam; runtime-deferred per the drive policy; parser fully tested independent of decode. |
| Producing a transaction without categorization | medium | Boleta items get a deterministic/default category path; keep parity with the vision-produced transaction shape. |

## Notes
- No new migration expected (reuses scans/transactions).
- The CAF signature verification (authenticity) is a separate runtime/security concern, not required to parse the structured payload; noted as future hardening.
