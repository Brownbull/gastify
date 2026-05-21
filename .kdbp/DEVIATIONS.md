# Deviations Log

| Date | Phase | Task | Type | Note |
|------|-------|------|------|------|
| 2026-05-14 | 1 | T1 | implementation-variance | Vite template shipped React 19.2.6 instead of PLAN's "React 18". React 19 is stable and all deps (TanStack Router, TanStack Query, Zustand) support it. Kept React 19. |
| 2026-05-13 | 2 | T1 | contract-variance | PLAN declares "file type (JPEG/PNG/HEIC/PDF)" but FileUpload accepts JPEG/PNG/WebP/HEIC/HEIF — no PDF. Backend also rejects PDF. WebP added (backend accepts it). PDF cut because neither client nor backend image pipeline supports it; re-evaluate when statement import lands. |
| 2026-05-13 | 5 | T1 | test-strategy | Phase row named Playwright, but root Playwright remains the legacy mockup harness. Shipped Vitest route/hook integration coverage for the web journey instead of adding production-only auth/backend test seams. |
| 2026-05-20 | 3 | T1 | scope-adaptation | Added a narrow backend `card_alias` list filter and regenerated API clients because Phase 3 requires mobile card filtering but the existing transaction list API exposed only date/category/merchant/currency filters. |
