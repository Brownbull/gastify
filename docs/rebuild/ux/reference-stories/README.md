# Reference stories — frozen exemplars

These are read-only copies of the 5 working stories that defined the canonical platform×state pattern after the Storybook pivot (DECISIONS.md D27, commits da3ceb4 / b6b6ea5 / 3c4bbf2 era).

## Why frozen

Per the rebuild feasibility plan at `~/.claude/plans/i-would-like-to-elegant-tarjan.md` (Phase A.7), these stories are the **regression oracle** for the rebuild:

- They are the canonical shape RALPH must match when generating new screen stories.
- They survive here even if the live `frontend/src/features/*/views/*.stories.tsx` files are deleted, rewritten, or moved during the rebuild.
- RALPH's prompt template MUST treat these as read-only exemplars — never overwrite, never edit in-place. Read for reference only.

## What's archived

| File | Live source path | What it exemplifies |
|------|------------------|---------------------|
| `DashboardView.stories.tsx` | `frontend/src/features/dashboard/views/DashboardView/DashboardView.stories.tsx` | Mobile · Default, Mobile · Empty, Desktop · Default — platform × state args |
| `TrendsView.stories.tsx` | `frontend/src/features/analytics/views/TrendsView/TrendsView.stories.tsx` | Canonical reference (post-revert 2026-04-29) |
| `HistoryView.stories.tsx` | `frontend/src/features/history/views/HistoryView.stories.tsx` | Self-contained list view |
| `ItemsView.stories.tsx` | `frontend/src/features/items/views/ItemsView/ItemsView.stories.tsx` | 4th self-contained-screen example (commit b6b6ea5) |
| `ReportsView.stories.tsx` | `frontend/src/features/reports/views/ReportsView.stories.tsx` | Stub-`t` strategy + ProfileDropdown/ReportDetailOverlay forwarding |

## Conventions to learn from these

Read `frontend/STORIES.md` first — it documents the rules these stories follow:
- Stub-`t` strategy for empty translation strings.
- Platform variants via `args.platform` (mobile/tablet/desktop).
- State variants via domain-specific args (default/empty/loading/error).
- Provider stack mirrored from `frontend/.storybook/preview.tsx`.
- One mountable story = no required props at the screen boundary.
- Verification gate: Playwright iframe screenshot + i18n leak regex (`\b[a-z]+[A-Z][a-zA-Z]+\b`) + visual spot-check.

## Refresh policy

If the live versions are intentionally improved post-rebuild, snapshot the new versions here as `*.v2.stories.tsx` (additive — do not delete the originals). The originals stay as the rebuild's pre-state oracle.
