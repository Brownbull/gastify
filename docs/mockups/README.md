# gastify Mockups

Multi-theme runtime design surface. 3 platform targets (Desktop Web / Mobile Web PWA / Native Mobile React-Native). 6 theme candidates in P1, runtime-switchable subset ships in app.

## Structure

| Path | Purpose |
|------|---------|
| `styles/*.prompt` | Claude-input design spec per theme — consumed by frontend-design skill / external Claude design pass |
| `styles/_PROMPT-TEMPLATE.md` | Required sections + token list every prompt must cover |
| `STRESS-TEST-SPEC.md` | Canonical 4-screen × 3-platform × 2-mode matrix + state variants + interaction-note template |
| `assets/fonts/` | Self-hosted Outfit + Baloo 2 woff2 + `gastify-fonts.css` — drag into Claude Design "fonts" field |
| `assets/icons/` | 200+ pixel-art PNG icons (nav, actions, scan, categories, mascots) ported from BoletApp PixelLab generator |
| `explorations/output/` | External render outputs — `{style}-{screen}-{platform}.html` |
| `screens/` | P5–P12 screen mockups (added after P3) |
| `components/` | P2–P3 component library HTML (added in P3) |
| `flows/` | P4 flow walkthrough skeletons |
| `tokens.json` | Locked multi-theme token JSON (P1 exit) |
| `design-system.html` | Switcher demo across 4 stress screens × 3 platforms (P1 exit) |
| `index.html` | Browseable gallery (P13 handoff) |

## Phase 1 — Active (ent tier, escalated from mvp 2026-04-23 — see DECISIONS D7)

6 theme candidates, each defined as a self-contained prompt file:

### Legacy (port from bmad/boletapp/docs/mockups/screens/gastify-dashboard.html tokens)
1. **Normal** — warm forest (`#4a7c59` primary, cream `#f5f0e8` bg, amber accent)
2. **Professional** — cool steel-blue (`#2563eb` primary, ice `#f8fafc` bg, tabular-nums)
3. **Mono** — grayscale (`#18181b` primary, paper `#fafafa` bg, hairline borders)

### Exploration (port from bmad/boletapp/docs/mockups/styles/ + gastify-adaptation header)
4. **Organic** — botanical/earth-tones/soft curves
5. **Playful Geometric** — Memphis-inspired shapes + hard shadows + pop colors
6. **Sketch** — handcrafted/draft-feel/pencil annotations

All 6 must render in BOTH light + dark mode with full token parity.

## Phase 1 Workflow

| # | Task | Owner |
|---|------|-------|
| T1–T4 | Scaffold + port prompts + stress-test spec | agent (done) |
| T5 | External render pass — Claude design / frontend-design skill on 6 prompts × 4 screens × 3 platforms × 2 modes | **user** |
| T6 | Pick runtime multi-theme set (subset of 6 themes × 2 modes to ship in-app) | **user** |
| T7 | Lock `tokens.json` + `design-system.html` with switcher demo | agent |

Expected P1 exit: 3+ themes × 2 modes runtime-switchable, token JSON + design system HTML checked in, referenced by P2/P3/P5–P12.

## Platform targets (all 3 required per theme)

- **Desktop Web (1440 responsive)** — sidebar nav, top-bar scan with ⌘K, hover + focus states, no FAB
- **Mobile Web (PWA 390×844)** — bottom nav + FAB, `<input capture=environment>` camera, limited platform APIs
- **Native Mobile (React-Native + Expo, 390×844 shared iOS+Android)** — full camera viewfinder, haptics, biometrics, push, platform divergence notes

## References

- Legacy production gastify dashboard (3 themes × 2 modes, 2026 lines): `/home/khujta/projects/bmad/boletapp/docs/mockups/screens/gastify-dashboard.html`
- Legacy style exploration prompts (6 files, 8–24KB): `/home/khujta/projects/bmad/boletapp/docs/mockups/styles/*.prompt`
- Sister project methodology (gustify cooking app, same prompt pattern): `/home/khujta/projects/apps/gustify/docs/mockups/MOCKUP-PLAN.md`
