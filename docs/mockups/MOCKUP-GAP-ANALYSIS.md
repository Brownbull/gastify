# Mockup ↔ Application Gap Analysis

_2026-06-24. Compares the `design-lab/` mockups against the real application
(backend `backend/app/api/*`, mobile `mobile/`, web `web/`) and the canonical
spec `docs/rebuild/ux/UI-FEATURE-INVENTORY.md`. `frontend/` is retired legacy._

Legend: ✅ mocked · 🟡 partial · ❌ missing in mockups.

## Coverage by area

| Area | App has | Mockup status |
|---|---|---|
| Auth | Google sign-in, JIT provisioning, sign-out wipes data | 🟡 we have Landing + email/password + Google/Apple (app is **Google-only**; landing is new) |
| Home / Dashboard | month picker, total card, **category donut**, **time-series chart**, **gravity/concentration alerts**, scope banner | 🟡 Inicio has month total + 1 insight + treemap + recents (no donut/time-series/gravity list on home) |
| Transactions | list+filters(source/matched), **manual entry form**, **batch select/delete/reassign**, detail edit, **line-item flag**, **share-to-group**, **matched/shared locked states**, edited-at | 🟡 list+filter+pagination + editable detail (items/cadence/delete). Missing: manual entry, batch ops, item flags, share-to-group, locked states |
| Items / Products | cross-txn list + filters | ✅ ItemsBrowse |
| Scan (single) | upload, SSE/WS progress, review, warnings, retry, **insufficient-credit**, scan-disabled-in-group notice | ✅ chooser/capture/processing/review/save (minor: credit-error + group-notice states) |
| Scan (batch) | multi-receipt queue + per-item retry/discard + summary | ❌ **archived in mockups**, real in app (mobile BatchCapture/Review, web /scan-batch) |
| Statements | upload (password PDF), **list**, reconcile panel, delete, completion notif | 🟡 upload→processing→reconcile→confirm→success flow (no statements **list** screen; no password prompt) |
| Spending analytics | donut, treemap, **bar/line trends**, sparklines, report detail, gravity centers | ✅ donut/treemap/sankey + category drill-down + Reportes. (sankey is mockup-extra; verify bar/line trend) |
| History | (just the transactions tab) | ✅ richer hub (Transacciones/Productos/Reportes) |
| Groups | create, cards, **member roster + admin actions**, invite gen, **invite JOIN (/invite/:token)**, **visibility+consent toggles**, group txns, **leave (keep-vs-delete)**, **delete group**, scope switch | 🟡 hub/detail/create/invite-link + scope switcher. Missing: join flow, member admin actions, consent toggles, leave/delete, share-txn picker |
| Notifications | list, mark-read/all, delete, load-more, bell+badge | ✅ inbox (pagination/mark/delete/empty + animations) |
| Settings / Profile | profile, currency, date-format, theme, **learned mappings**, export, account deletion, **consent mgmt** | ✅ Perfil/Preferencias/Escaneo/Mi-memoria/Datos/Ayuda (🟡 consent toggles thin) |
| Subscription / Billing | quota endpoint, credits, upgrade prompt (purchase deferred) | ✅ Suscripción + usage bar + Pro upgrade popup |
| Cards / card-aliases | name cards, pick on statement upload, CRUD | ❌ **whole feature unmocked** |
| Privacy / consent | per-purpose consent, audit log, data access/rectify/erase/export | 🟡 Datos has export/reset; no per-purpose consent toggles / audit / access summary |
| Insights | monthly summary, **gravity-center detection**, item-flag exclusion | 🟡 1 home insight card + Reportes (no gravity-center ranked list) |
| Nav / chrome | bottom nav, side nav, scan FAB, header variants, avatar, scope switcher | ✅ all (incl. scope switcher — app really has it) |

## Gaps — app features NOT in the mockups (build candidates, ~priority order)

> **Update 2026-06-24:** the top 4 gaps (#1–6 below) were built — see `.kdbp/LEDGER.md` [MOCKUPS] entries (commits d36ef2b, 870deff, 3bb26c6, d4d8ef0, cc50162). Remaining open: #7 onward.

1. ✅ **Manual transaction entry** — `/transactions/new`. Built: NewTransactionScreen (reached from the scan chooser's "Ingreso manual").
2. ✅ **Batch scan** — multi-receipt queue + per-item retry/discard + summary. Built: ScanBatchCaptureScreen (revived) + ScanBatchReviewScreen + chooser "Escaneo en lote".
3. ✅ **Card aliases** — Built: CardsSubview ("Mis tarjetas"). (The statement upload already had the card *picker*.)
4. ✅ **Share a transaction into a group** — Built: ShareTransactionSheet wired into "Compartir gasto".
5. ✅ **Group join flow** — `/invite/:token`. Built: InviteJoinScreen (preview / join / expired).
6. ✅ **Group management actions** — Built: member promote/demote/remove, leave (keep-vs-delete), delete group, visibility + consent toggles.
7. **Locked-transaction states** — a statement-**matched** txn (badge, 409 on edit) and a **shared** txn (banner, read-only) collapse the editable detail to read-only. Our detail is always editable.
8. **Batch operations on the transaction list** — select-all + per-row checkboxes → batch delete + batch category reassign.
9. **Line-item flagging** — flag/unflag a line item (allergy/dietary/insight); excluded from all aggregates.
10. **Insights / gravity-center alerts** — the ranked concentration list (categories >1.5× or <0.5× of trailing baseline), richer than the single home insight card.
11. **Privacy / consent management** — per-processing-purpose consent toggles + data-access summary + audit log (a real privacy settings surface).
12. **Home dashboard parity** — the real home leads with a category **donut** + **time-series** chart + gravity alerts; our Inicio is lighter (treemap + 1 insight + recents).
13. **Statements list** screen + password-protected-PDF prompt.
14. Minor states: insufficient-credit error, scan-disabled-in-group-scope notice.

## Mockup-only / not backed by the app (flag — decide keep-aspirational vs needs-backend)

- **Límites de gasto** (Settings) — user-set spending budgets/limits. The app has gravity-center *alerts* but **no budgets** → aspirational or needs a backend.
- **Sankey (Flujo) diagram** — not in the app analytics spec (donut/treemap/bar-line only) → mockup-extra.
- **Marketing landing page** — app goes straight to sign-in.
- **Email/password + Apple sign-in** — app is **Google-only**.
- **Notification kinds `budget_alert` / `group_shared`** — backend `kind` check-constraint only allows `scan_complete | scan_needs_review | statement_reconciled` → our extra kinds need a backend change.
- **Item view toggle (Original / Por grupo)** in the txn detail — a presentational nicety beyond the app's flat item list.
