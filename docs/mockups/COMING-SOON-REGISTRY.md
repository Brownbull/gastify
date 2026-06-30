# Coming-Soon Registry

> Per **D101**: every design-lab mockup is implemented in the live app. Elements/features
> not yet backed by real data render as a **"coming soon" / "próximamente"** placeholder
> (visually present per the design, flagged + non-functional) and are registered HERE so we
> build them later. Nothing from the Storybook is discarded.

| ID | Screen / subview | Element / feature | Why not backed yet | Placeholder shipped | Build-later notes |
|----|------------------|-------------------|--------------------|---------------------|-------------------|
| CS-1 | Settings · Preferencias | Modo (dark / auto theme) | Theme/dark system cut by D-B (single light theme) | ✅ disabled SegmentedToggle, "Claro" fixed, Próximamente badge | Needs a theme/color-scheme system + persisted pref; reverses D-B — product decision |
| CS-2 | Settings · Preferencias | Paleta de color (Normal/Profesional/Monocromo) | 3-palette system cut by D-B | ✅ disabled Select | Re-introduces the multi-palette token sets cut in W1 |
| CS-3 | Settings · Preferencias | Color de fuente (Colorido/Simple) | No font-color setting | ✅ disabled SegmentedToggle | Needs an ink-vs-accent text mode + persisted pref |
| CS-6 | Settings · Perfil | Cambiar foto (avatar upload) | No avatar/photo storage or upload path | ✅ disabled ghost button | Needs photo upload + storage + user.photoURL write |
| CS-7 | Settings · Perfil | Editar nombre + Guardar cambios | No profile-write endpoint (name/email read-only from Firebase) | ✅ disabled Nombre input + disabled "Guardar cambios" | Needs a profile-update endpoint (or Firebase updateProfile wiring) |
| CS-8 | Settings · Escaneo | Ubicación predeterminada | No `default_location` field on the user model / rectification API | ✅ disabled Select (Santiago…) | Needs a default-location field on the profile + write endpoint + use it in scan fallback |
| CS-9 | Settings · Escaneo | Indicador de país extranjero (Código/Bandera) | No setting; transactions don't render a foreign-country indicator yet | ✅ disabled SegmentedToggle | Needs a persisted display pref + wiring into the transactions/list rendering |

## Intentionally dropped from mockups (NOT coming-soon)

These mockup elements are deliberately **not built and not placeholdered** — a product decision, recorded so they are not silently re-added when porting the design.

| Screen / subview | Element | Decision + rationale | Date |
|------------------|---------|----------------------|------|
| Settings · Perfil | Teléfono (+56 …) | **Dropped — do not collect.** Data minimization / privacy: we choose not to store users' phone numbers, so the field is removed entirely rather than shown as coming-soon. | 2026-06-29 (user direction) |

## Graduated to functional (no longer coming-soon)

Mockup elements that started as coming-soon placeholders and are now fully built + wired.

| Was | Screen / subview | Element | Built as | Date |
|-----|------------------|---------|----------|------|
| CS-4 | Settings · Preferencias | Tipografía (Outfit/Space Grotesk) | Persisted font-family pref (uiStore → lib/appearance → `<html data-font>`; global.css re-points `--font-family`/`--font-display`) | 2026-06-29 (user direction) |
| CS-5 | Settings · Preferencias | Tamaño de fuente (Pequeño/Normal/Grande) | Persisted font-size pref — 3 steps (~0.88x / 1x / 1.15x); `<html data-fontsize="small"\|"large">` overrides the inlined text-gt-* utilities in global.css. (Mockup had 2; extended to 3 per user direction.) | 2026-06-29 (user direction) |
