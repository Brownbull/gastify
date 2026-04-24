# gastify Mockups

Multi-theme runtime design surface. 3 platform targets (Desktop Web / Mobile Web PWA / Native Mobile React-Native). Dual-track structure: frozen BoletApp legacy snapshot as baseline + editable working copies for gastify-rebuild iteration.

## Structure

| Path | Status | Purpose |
|------|--------|---------|
| `screens/` | **Active, editable** | 29 HTMLs + nav reference — working surface, iterate freely here |
| `flows/` | **Active, editable** | 13 end-to-end walkthroughs (F1–F13) — working surface |
| `index.html` | **Active, editable** | Design-system hub gallery — iterate to reflect current state + surface gaps |
| `legacy-reference/` | **Frozen baseline** | Immutable BoletApp snapshot 2026-04-23. Do NOT edit — use as diff source to track how rebuild evolves vs legacy |
| `styles/*.prompt` | Author-ready | Design briefs per theme (normal, professional, mono, organic, playful-geometric, sketch) — available for future Claude Design retry or manual theme authoring |
| `styles/_PROMPT-TEMPLATE.md` | — | Required sections + token list every prompt must cover |
| `STRESS-TEST-SPEC.md` | — | 4-screen × 3-platform × 2-mode matrix + state variants + interaction-note template |
| `assets/fonts/` | — | Outfit + Baloo 2 self-hosted woff2 + `gastify-fonts.css` |
| `assets/icons/` | — | 200+ pixel-art PNG icons (nav, actions, scan, categories, mascots) |
| `assets/tokens/` | — | V4 taxonomy + category-color maps (12 L1 + 44 L2 + 9 L3 + 42 L4) × 3 themes × 2 modes |
| `explorations/output/` | Empty | Reserved for new exploration-theme renders (organic / playful-geo / sketch) |
| `tokens.json` | Phase 1 exit | Locked multi-theme token JSON — written at T10 |
| `design-system.html` | Phase 1 exit | Switcher demo across stress screens × platforms — written at T10 |

## Dual-track semantic

- **Edit `screens/` / `flows/` / `index.html`** for rebuild work. These start as legacy copies but diverge as gastify rebuild fills gaps (desktop responsive, new themes, new consent surfaces, etc.).
- **NEVER edit `legacy-reference/`** — it's the frozen 2026-04-23 baseline. Use `diff -r legacy-reference/screens/ screens/` to see exactly what changed since the fork.
- **When a screen is complete** for gastify intent, mark it in `index.html` (active). Legacy-reference keeps the baseline for comparison until P13 handoff.

## Phase 1 — Active (ent tier, escalated from mvp — see DECISIONS D7)

6 theme candidates documented as style prompts. Legacy ships 3 themes (Normal / Professional / Mono) × 2 modes runtime-switchable. Exploration candidates (Organic / Playful-Geometric / Sketch) are design-brief-only until promoted.

### Workflow (revised post Claude-Design pivot)

| # | Task | Status |
|---|------|--------|
| T1–T4 | Scaffolding + style prompts + stress-test spec | ✅ |
| Side-tasks | Fonts + icons + wordmark pin + taxonomy + legacy-reference | ✅ |
| T5 | Dual-track setup — frozen `legacy-reference/` + active editable copies at top level | 🔄 |
| T6 | Audit consistency (visual language) + continuity (cross-screen flow) + coverage (vs SCOPE + PLAN) | ⬜ |
| T7 | Gap matrix — active mockup inventory vs SCOPE 27 REQs + PLAN P5–P12 screens | ⬜ |
| T8 | Rewrite `index.html` to reflect current state + surface gaps | ⬜ |
| T9 | Iterate `screens/` + `flows/` to close priority gaps (desktop responsive, missing screens) | ⬜ |
| T10 | Lock `tokens.json` + `design-system.html` as Phase 1 exit | ⬜ |

### Platform targets (all 3 required for final rebuild screens)

- **Desktop Web (1440 responsive)** — sidebar nav, top-bar scan with ⌘K, hover + focus states
- **Mobile Web (PWA 390×844)** — bottom nav + FAB, limited platform APIs
- **Native Mobile (React-Native + Expo, 390×844 shared iOS+Android)** — full camera + haptics + biometrics + push

## Known gaps vs PLAN intent

Legacy covers ~70% of gastify P5–P12 scope. Missing (new surface for rebuild):
- Jurisdiction consent screens (CL/LATAM/EU/US/CA — 4-way) — **P5**
- PWA install prompt + Push permission prompt — **P5**
- Register, Forgot PW, Email Verify — **P5** (only Login exists in legacy)
- Desktop responsive variants — ALL screens (legacy mobile-only)
- Native Mobile platform divergence notes — ALL screens
- Missing group subviews: Leave Confirm, Delete Confirm, Read-Only Detail — **P10**

Full gap matrix landed at T7.
