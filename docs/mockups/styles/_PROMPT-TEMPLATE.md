# Style Prompt Template (gastify)

Each `styles/{name}.prompt` is a self-contained Claude-input design spec. Consumed by the `frontend-design` skill or external Claude design pass to produce stress-test renders.

## Required sections

1. **`<role>`** — frontend engineer + visual designer framing (shared across all prompts)
2. **`<design-system>`** — philosophy, vibe, visual signatures
3. **Token system** — colors (light + dark), type, spacing, radii, shadows, motion — CSS custom property shape
4. **Component patterns** — snippets for: FAB, bottom nav (mobile) / sidebar (desktop), transaction card, stat card, category chip, toast, modal
5. **Platform adaptation**
   - **Desktop Web** (1440px responsive, sidebar nav, multi-column, hover states, keyboard focus rings)
   - **Mobile Web** (390×844 PWA, bottom nav, single column, touch targets ≥44px, no haptics, camera via `<input type="file" capture>`)
   - **Native Mobile** (390×844 React Native, bottom nav, safe-area insets, haptics on primary actions, biometric unlock hook, full camera + push notification hooks)
6. **Stress-test screen targets** — 4 canonical surfaces for this style:
   - Dashboard (home, data-dense: balance + stats + recent tx)
   - Single-Scan Idle (capture surface: camera viewfinder + CTA)
   - History List (long list + filters + selection mode)
   - Insights (3-tab switcher + chart + anomaly cards)
7. **Copy voice** — Spanish-CL first, register (friendly / sober / literary / playful), Chilean idioms where natural
8. **Dark mode parity** — every token group has light + dark variant
9. **Accessibility floor** — WCAG AA contrast min, focus-ring visible on all interactive elements, touch targets ≥44×44
10. **Output format** — `docs/mockups/explorations/output/{style}-{screen}-{platform}.html` (12 renders per style: 4 screens × 3 platforms, light mode hero + dark mode section below)

## Naming

- `normal.prompt` — warm forest, port from legacy gastify
- `professional.prompt` — cool blue, port from legacy gastify
- `mono.prompt` — grayscale, port from legacy gastify
- `organic.prompt` — botanical, port from legacy boletapp style
- `playful-geometric.prompt` — port from legacy boletapp style
- `sketch.prompt` — port from legacy boletapp style

First 3 = current in-app themes (ship as runtime-switchable). Last 3 = exploration candidates (user picks which to promote to runtime-switchable list).

## Prompt author convention

- Keep tokens in hex + rgba. Document each custom property.
- Include **2 light-mode + 2 dark-mode swatches** inline for quick eyeball.
- Describe motion in seconds + easing curve names (`cubic-bezier(.2,.8,.2,1)` → "snappy exit").
- Component snippets in plain HTML+CSS, no framework lock-in (rendered layer chooses React-DOM vs React-Native equivalent).
- Reference the legacy gastify-dashboard.html CSS for token completeness (every category color, skeleton state, progress track, etc.)
