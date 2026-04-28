# Validate-mode recipe — gastify

> Emitted by `/gabe-mockup validate` on 2026-04-28T14:25:00Z. Augmented on every subsequent run (run-history table at the bottom).

This file documents how `gastify` validates its mockup screens for layout sanity. Read it before invoking `/gabe-mockup validate`, and use it to record run history + project-specific calibrations.

## Architecture

- **Mode:** `dynamic`
- **Reason:** hybrid: tweaks.js for shared mobile-shape files + per-device *-desktop.html for divergent desktop layouts

If detection is wrong (e.g., projects mid-migration between architectures), override via `.kdbp/BEHAVIOR.md`:

```yaml
mockup_architecture: dynamic | per-device
```

The runner checks BEHAVIOR.md before falling back to the heuristic.

## Viewports

| Class | Width | Frame contract |
|---|---|---|
| Phone | 360px | Single 390×844 (or 360×640) frame; `overflow-y: auto` allowed for content > frame height |
| Tablet | 768px | Content max-width 720px, 16px edge padding, max screen frame 768×1024 |
| Desktop | 1440px | Edge-to-edge inside page, 60px top bar, native scroll |

## Files

| Path | Purpose |
|---|---|
| `tests/mockups/validate/runner.mjs` | Orchestrator: detects architecture, walks screens, builds manifest, invokes Playwright, aggregates findings into MOCKUP-VALIDATION.md |
| `tests/mockups/validate/screen-validator.spec.ts` | Playwright spec — data-driven from manifest, runs 4 categories of checks per (screen × viewport) |
| `tests/mockups/validate/rules.json` | Rule catalog + viewport widths + min-column threshold + skip patterns + KDBP rules cache |
| `.kdbp/MOCKUP-VALIDATION.md` | Live findings document (stable-IDs, Status column, resumable triage) |

## Quick reference

```bash
# Full sweep (all screens × all viewports × all categories)
node tests/mockups/validate/runner.mjs

# Subsets
node tests/mockups/validate/runner.mjs --screens=login,settings
node tests/mockups/validate/runner.mjs --viewports=phone
node tests/mockups/validate/runner.mjs --severity=block

# Disable KDBP rule binding (faster)
node tests/mockups/validate/runner.mjs --skip-kdbp
```

After the runner completes, open `.kdbp/MOCKUP-VALIDATION.md` and triage findings inline. Triage action keys (f / d / x / s / e / q) are documented in `~/.claude/templates/gabe/mockup/validate/validate-checklist.md`.

## Run history

| Date | Architecture | Targets | Findings (block/warn/info) | Notes |
|---|---|---|---|---|
| 2026-04-28T14:25:00Z | dynamic (hybrid) | 87 (28 base × 3 viewports + 3 desktop-only) | 0/0/0 | First run; gastify mockups clean per C1/C2/C3. C4 inert (no `applies-to: mockup-screens` rules in `.kdbp/RULES.md` yet) |

## Project-specific calibrations

(Document any rule tuning, skip-screen overrides, or KDBP rule additions here. Example entries:)

- _none yet_

## Should this become `gabe-mockup` M14?

Open question — re-evaluate after 2–3 projects have run validate at least once. Mechanical parts (architecture detection, viewport switching, MOCKUP-VALIDATION.md write, Playwright dispatch) are clearly codify-able. Judgment-based parts (which rules to bundle vs. emit informational, threshold tuning per project class) need lived experience to know what auto-detection rules would look like. Track the answer here.
