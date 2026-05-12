# Architecture
<!-- Standards: see ~/.claude/skills/gabe-docs/SKILL.md (CommonMark + Mermaid + analogy-first) -->

## Data Model

## API Contracts

## API Endpoints

### Scans

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/scans` | Yes | Submit receipt image for scanning. Compresses, stores, triggers extraction via BackgroundTasks. Returns `ScanSubmission`. |
| `POST` | `/api/v1/scans/{scan_id}/process` | Yes | Manually trigger/retry extraction. Resets FAILED→SUBMITTED, then queues `process_scan`. Returns `ScanResult` (202). |

## Integrations
