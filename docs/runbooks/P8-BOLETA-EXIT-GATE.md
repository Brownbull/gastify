# P8 Structured-Boleta Shortcut — Exit Gate Evidence Packet

> Roadmap phase **P8** (REQ-26): Chilean electronic boletas (SII Res. 52/2026)
> carrying a QR/PDF417 timbre bypass the vision LLM. Post-MVP. Compiled 2026-05-29.

## Status

| Track | State |
|-------|-------|
| TED payload parser (Ph1) | ✅ code-complete, tested |
| Boleta scan shortcut — bypass vision LLM, 0 tokens (Ph2) | ✅ code-complete, tested |
| Native barcode image-decode (PDF417/QR from pixels) | ⏸ **deferred** — heavy/native dep; seam returns None |
| `< 3s` / live 0-token proof on a deployed boleta scan | ⏸ deferred (operational) |

## Exit-signal element → evidence

ROADMAP §Phase 8 exit signal: *"A Chilean user uploading a post-May-2026
electronic boleta with a valid QR code sees a transaction produced in < 3
seconds with 0 extraction-LLM tokens consumed. Paper-receipt path unchanged."*

| Element | Local evidence | Runtime closure |
|---------|----------------|-----------------|
| Valid boleta QR → transaction | `parse_ted_payload` (`boleta.py`) + `_run_boleta_pipeline` (`scan_worker.py`); `test_scan_worker.py::TestBoletaShortcut::test_boleta_shortcut_bypasses_llm` | live decode + scan on staging (deferred) |
| 0 extraction-LLM tokens (+ 0 categorization tokens) | the shortcut calls `_run_stage2` with a prebuilt extraction + empty categorization; the test asserts `extract_receipt` and `categorize_items` are both never awaited | — (proven by await-count) |
| Paper-receipt path unchanged | the shortcut only runs on the real-provider branch and only when `decode_boleta_barcode` returns a payload that parses to a boleta; any miss returns None → unchanged vision pipeline; `test_unparseable_timbre_falls_through_to_vision` | — |
| Fail-safe on forged/unparseable timbre | `BoletaParseError` / non-boleta TD / oversized / malformed → fall through to vision (never raises); `test_boleta.py` (9 cases) | — |
| `< 3s` production latency | — (no LLM call in the path; structured parse is sub-ms) | measure on deployed staging (deferred) |

## Local gate sweep (2026-05-29)
- Backend `uv run pytest`: **704 passed, 2 skipped**. mypy clean. ruff clean.
- Parser hardened with `defusedxml` + 8KB cap (untrusted barcode input).

## Deferred (operational — launch staging session)
- Add a native PDF417/QR decoder and wire it into `decode_boleta_barcode` (the seam).
- Live proof: upload a real post-May-2026 boleta → transaction in < 3s, 0 LLM tokens (verify on `/metrics`: `scans_boleta_shortcut` increments, no `llm_tokens_*`).
- CAF / `<FRMT>` signature verification (authenticity) — security hardening, separate from parsing the structured payload.
