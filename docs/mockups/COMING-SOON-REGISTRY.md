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
| CS-10 | Settings · Ayuda | Instalar App (PWA install) | No PWA in web (no manifest / service worker / beforeinstallprompt) | ✅ disabled primary button + "Próximamente" caption | Needs vite-plugin-pwa + manifest + service worker + beforeinstallprompt handler |
| CS-11 | Settings · Ayuda | Términos y condiciones | No backend legal-content endpoint | ✅ link opens Modal with placeholder copy (marked "ejemplo") | Needs a legal-text source (static bundle or CMS endpoint) |
| CS-12 | Settings · Ayuda | Política de privacidad | No backend privacy-policy endpoint | ✅ link opens Modal with placeholder copy (marked "ejemplo") | Needs a privacy-policy text source |
| CS-13 | Settings · Ayuda | Contacto y soporte | No contact/support endpoint or form | ✅ link opens Modal with placeholder copy (support email) | Needs a contact form / support-inbox integration |
| CS-14 | Settings · Mi memoria | Aprender de mis correcciones (toggle) | No backend flag to disable learning — gastify always learns from corrections today | ✅ disabled Switch (on) + "Próximamente" badge | Needs a user-level learning_enabled flag + a gate in the categorization pipeline |
| CS-15 | Settings · Suscripción | Mejorar a Pro (self-serve upgrade) | No payment gateway wired (billing.set_tier is internal/admin only) | ✅ upgrade card + benefits live; "Mejorar a Pro" opens an honest "coming soon" Modal | Needs a payment-gateway integration + a self-serve checkout/webhook → set_tier |
| CS-16 | Settings · Mis tarjetas | Color + icono por tarjeta | card_aliases stores only {name, archived_at} — no color/icon fields | ✅ list/add/rename/archive wired; cards render a fixed icon | Needs color + icon columns on card_aliases + the AddCardForm picker |
| CS-17 | Settings · Mis tarjetas | Método predeterminado + Efectivo (cash) | No cash entity and no default-method flag in the backend | ✅ omitted (cards-only) | Needs a payment-method/default model (cash + default selection) beyond card_aliases |
| CS-18 | Settings · Mis tarjetas | Restaurar tarjeta archivada | Archive (DELETE) is one-way — no un-archive endpoint (PATCH 404s on archived) | ✅ archive wired; archived cards hidden (no restore) | Needs an un-archive endpoint (clear archived_at) |
| CS-19 | Settings · Límites | Límites de gasto por categoría | No spending-limit / budget endpoint exists in the backend | ✅ full preview screen (master toggle + per-category budget cards + usage bars) with illustrative values + "Próximamente"/"Vista previa" framing | Needs a budget model (per-category monthly limits) + spend aggregation + threshold alerts |

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
| CS-8 | Settings · Escaneo | Ubicación predeterminada | País + Ciudad selectors (options from `/reference/locations`; `default_country`/`default_city` persisted via rectification, migration 043). The mockup's single location Select became a country + dependent-city pair (D103). Doubles as the scan-location reconciliation fallback. | 2026-06-30 (D103) |
| CS-9 | Settings · Escaneo | Indicador de país extranjero (Código/Bandera) | Persisted display pref (`uiStore.foreignLocationFormat`, localStorage). The transaction detail shows a FOREIGN purchase (country ≠ the user's `default_country`) as its ISO code or flag emoji (`lib/locationDisplay`: `countryToFlag` via Unicode regional indicators — no dataset). | 2026-06-30 (D103) |
