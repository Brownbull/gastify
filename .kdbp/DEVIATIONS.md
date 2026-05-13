# Deviations Log

| Date | Phase | Task | Type | Note |
|------|-------|------|------|------|
| 2026-05-14 | 1 | T1 | implementation-variance | Vite template shipped React 19.2.6 instead of PLAN's "React 18". React 19 is stable and all deps (TanStack Router, TanStack Query, Zustand) support it. Kept React 19. |
| 2026-05-13 | 2 | T1 | contract-variance | PLAN declares "file type (JPEG/PNG/HEIC/PDF)" but FileUpload accepts JPEG/PNG/WebP/HEIC/HEIF — no PDF. Backend also rejects PDF. WebP added (backend accepts it). PDF cut because neither client nor backend image pipeline supports it; re-evaluate when statement import lands. |
