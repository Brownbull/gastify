# UI Feature Inventory — handoff to the visual-overhaul (design-lab) session

> **Purpose.** This is the complete catalog of everything the product DOES today —
> every screen, control, badge, dialog, and behavior contract the new UI must include.
> The parallel design-lab/mockup session decides **how to present** these; this document
> fixes **what must exist**. If a mockup screen is missing a control listed here, the
> mockup is incomplete, not the requirement.
>
> **Sources of truth.** The functional web UI (`web/src/`) is the canonical reference
> implementation; mobile (`mobile/src/screens/`) mirrors it with the parity notes in §14.
> Behavior is pinned by the e2e suites (`tests/web-e2e/*.spec.ts`, Playwright, vs the
> deployed staging-e2e backend) and the S23 Maestro flows (`tests/mobile/maestro/`).
> When in doubt, the spec asserting a behavior IS the contract.
>
> **Testid rule.** The `data-testid` attributes listed here are load-bearing — the e2e
> suites select on them. The new UI must keep them on the equivalent controls (web) and
> the `testID` props on mobile. Renames require updating the suites in the same change.

---

## 1. Global / cross-cutting

| Feature | Contract | Key testids |
|---|---|---|
| Auth | Firebase sign-in (Google); e2e test-auth buttons exist only in staging builds | `sign-in-google-button`, `sign-in-test-auth-button`, `-b` |
| i18n | ALL copy in es / en / pt via `web/src/lib/i18n.ts` keys; es is the primary market (Chile) | — |
| Scope switcher | Header control on EVERY screen: Personal ↔ each group. Switching re-scopes dashboard/trends/reports/transactions app-wide | `group-switcher` (opens a listbox of options) |
| Scope banner | When a group scope is active, dashboards show a banner naming the group + a back-to-personal affordance | `dashboard-scope-banner` |
| Personal-only scan (D70) | In group scope, /scan and /scan-batch render a notice instead of the scanner | `personal-only-notice` |
| Notification bell | Header bell with unread badge; links to /notifications | `notifications-bell`, `notifications-badge` |
| Matched lock | A transaction matched against a card statement refuses content edits + deletes (409). UI shows a badge; edit attempts roll back with the server's message ("…Delete the statement to unlock it.") | `txn-matched-badge` |
| Share lock (D74) | A transaction shared into a group is content-locked: editors collapse to read-only, banner + badge shown | `shared-lock-banner`, `shared-lock-badge` |
| Multi-currency | Per-transaction currency; analytics totals are USD-normalized (FX shadow). Cents currencies use whole+cents input pairs; CLP-style exponent-0 use a single field | — |
| Date format (user setting) | `dd/MM/yyyy` vs `MM/dd/yyyy` user preference drives date display AND input placeholders | `settings-date-format`, `manual-date` |
| Name sanitization | Merchant/item names accept letters (incl. accents), digits, spaces, dots ONLY; server rejects the rest — forms surface the validation error | — |
| Scan credits | Scan submission deducts credits atomically; insufficient credits surfaces a distinct error on the scan/batch screens | — |
| PWA | The web app is installable; navigation is the 11-item sidebar (§2) | — |

## 2. Navigation surface (web sidebar)

`/` Dashboard · `/scan` · `/scan-batch` · `/statements` · `/transactions` · `/items` ·
`/trends` · `/reports` · `/notifications` (Alerts) · `/groups` · `/settings`
— plus `/sign-in`, `/invite/:token`, `/transactions/new`, `/transactions/:id` reached by links.

## 3. Sign-in

- Google sign-in button; app logo/branding; redirect to `/` on success.
- Footer shows the signed-in account email + Sign out (in layout).

## 4. Dashboard (`/`)

- **Month picker** (input labelled `Month`, `YYYY-MM`) — every figure re-scopes to it.
- **Total spend** for the month (`total-spend`) — USD-normalized aggregate.
- **Category donut** with drill: L1 industries → L2 store types → L3 families → L4 items,
  dimension toggle (by store category / by item), breadcrumb to drill back up
  (`category-donut`, `donut-legend`, `donut-legend-item`, `donut-total`, `drill-breadcrumb`,
  `donut-empty`, `donut-error`).
- **Spend time series** chart (`spend-timeseries`).
- **Empty state** when the month has no data (`dashboard-empty`).
- **Group scope**: banner (`dashboard-scope-banner`) + only the group's shared data.

## 5. Scan (`/scan`)

- Receipt image upload (file picker / camera on mobile).
- Live progress over SSE (queued → processing → done) — progress states are visible.
- **Result view**: merchant, date, total, line items with categories; editable before/after save.
- **Review warning** when the scan has accepted minor risks (math failure, item-count or
  discount mismatch, meaningful confidence dips) — the user is told to double-check.
- **Failure view** with retry; insufficient-credit error is distinct.
- Group scope → `personal-only-notice` (D70).

## 6. Batch scan (`/scan-batch`)

- **Queue**: add multiple images, per-item remove, submit all
  (`batch-queue`, `batch-queue-item`, `batch-add-images`, `batch-file-input`,
  `batch-queue-remove`, `batch-scan-submit`, `batch-scan-page`).
- **Review**: per-item status as each completes, retry / discard / view actions per item,
  summary line, "scan more" to return to the queue
  (`batch-review`, `batch-items`, `batch-item`, `batch-item-status`, `batch-item-retry`,
  `batch-item-discard`, `batch-item-view`, `batch-summary`, `batch-scan-more`).

## 7. Statements (`/statements`)

- Card-statement PDF upload; SSE progress; list of uploaded statements.
- **Reconciliation panel** per statement: coverage figure + buckets (matched / probable /
  unmatched statement lines vs ledger transactions).
- **Delete statement = the unlock path**: deleting removes its reconciliation verdicts and
  unlocks the transactions it had matched. (Asserted by `statement-reconcile.spec.ts`.)
- Completion fires a notification (bell + row in /notifications).

## 8. Transactions list (`/transactions`)

- Rows newest-first: merchant, date, amount, currency; row links to the detail.
- **"New transaction" link** to `/transactions/new` (`add-transaction-link`).
- **Filters**: source (scan / manual / statement / import) + matched-only
  (`filter-source`, `filter-matched`).
- **Matched badge** on matched rows (`txn-matched-badge`).
- **Batch operations**: select-all + per-row checkboxes → action bar with batch delete and
  batch category reassign (`select-all-checkbox`, `batch-action-bar`, `batch-delete-button`,
  `batch-reassign-button`).

## 9. Transaction detail (`/transactions/:id`)

- **Editable fields**: merchant, date, time, total, store category, country, city — each
  saves independently; a failed save ROLLS BACK with a dismissable "Edit was rolled back"
  toast carrying the server detail.
- **Line items**: per-item name, amount, item category, flag/unflag, save; flag chips.
- **Share to group**: combobox of the user's groups + share button; turns "Shared"
  (`share-to-group`, `share-error`).
- **Locks**: matched badge (+ 409 rollback on edit attempts); shared → banner/badge and
  editors collapse to read-only (`txn-matched-badge`, `shared-lock-banner`, `shared-lock-badge`).
- Merchant renames TEACH a learned mapping (visible in Settings → learned mappings).
- Edited-at indicator on edited fields.

## 10. Manual entry (`/transactions/new`)

- Fields: merchant (`manual-merchant`), date text input with the user's date-format
  placeholder (`manual-date`), optional time (`manual-time`), total (`manual-total` — single
  field for exponent-0 currencies, whole+cents pair otherwise), store category picker
  (`manual-store-category`), country/city (`manual-country`, `manual-city`).
- **Items added one by one** (`manual-add-item`): name, integer quantity ≥ 0, price; the
  running item sum is shown against the total.
- Save (`manual-save`) → server-side validation errors surface inline (name whitelist,
  integer qty, non-negative prices, typed dates).

## 11. Items (`/items`)

- Flat searchable list of line items across transactions
  (`items-screen`, `items-row`, `items-search-input`).
- Filters: item category + merchant; active-filter chips + clear-all
  (`items-filter-category`, `items-filter-merchant`, `items-active-filters`, `items-clear-all`).
- Pagination via load-more (`items-load-more`).

## 12. Trends (`/trends`) and Reports (`/reports`)

**Trends**
- Hierarchy level bar: L1 → L4 (`level-bar`).
- Temporal granularity bar: Week / Month / Quarter / Year (`temporal-bar`).
- Period stepper: prev / next + current label (`period-stepper`, `period-prev`,
  `period-next`, `period-label`).
- Distribution + series charts; empty state (`trends-no-series`).

**Reports**
- Monthly report cards with per-category breakdown
  (`reports-screen`, `reports-monthly-section`, `reports-card`, `reports-breakdown`,
  `reports-empty`).
- **Report detail overlay** (D77): granularity Week/Month/Quarter/Year, highlight stats
  (`report-detail-highlight-*`), grouped category cards with **within-period sparklines**
  (up=red / down=green), narrative insight, view-transactions link, close
  (`report-detail-overlay`, `report-detail-group`, `report-detail-sparkline`,
  `report-detail-insight`, `report-detail-view-transactions`, `report-detail-close`).

## 13. Notifications (`/notifications`)

- Row list with unread styling; mark-read per row, mark-all, delete per row, load-more,
  empty state (`notifications-screen`, `notifications-row`, `notifications-mark-read`,
  `notifications-mark-all`, `notifications-delete`, `notifications-load-more`,
  `notifications-empty`).
- Sources today: statement-reconciliation completion; (mobile additionally registers/
  unregisters push tokens on sign-in/sign-out).

## 14. Groups (`/groups`, `/invite/:token`)

- **Create group** form (`create-group-form`, `create-group-error`).
- **Group cards** (expandable): name, avatar (`group-avatar`, editable via
  `group-avatar-section` + `group-avatar-save`), member count, role.
- **Members roster**: per-member role chips; admin actions make/remove admin, remove member
  (confirm before destructive remove).
- **Invites**: generate invite → shareable link (`generate-invite-button`, `invite-link`);
  `/invite/:token` shows a preview (group name) + join button (`invite-join`,
  `invite-error`, `invite-join-error`).
- **Visibility & consent (D73/5e)**: admin toggle "show individual transactions"
  (`group-visibility-toggle`) + per-member consent toggle (`group-consent-toggle`);
  group transactions list attributes rows to "You" vs member names, consent-gated
  (`group-transactions-toggle`, `group-transactions`, `group-txn-row`,
  `group-transactions-empty`).
- **Leave (P68/D82)**: leave opens a keep-vs-delete dialog — "keep my shared data" vs
  "remove my data (the group's stats for those months shut down)" vs cancel
  (`group-leave-button`, `group-leave-dialog`, `group-leave-keep-button`,
  `group-leave-delete-button`, `group-leave-cancel-button`). The sole admin gets a 409
  ("promote another admin first") — surface it (`group-action-error`).
- **Delete group** (owner only, confirm) (`group-delete-button`).
- **View group dashboard** switches the app scope to the group.

## 15. Settings (`/settings`)

| Section | Contract |
|---|---|
| Profile | Display name / account info |
| Currency | Default currency select (`settings-currency-select`) |
| Date format | dd/MM/yyyy vs MM/dd/yyyy select (`settings-date-format`) — drives display + placeholders |
| Learned mappings | List of merchant + item mappings the user's edits taught; per-row delete (unlearn); empty state (`learned-mappings-section`, `learned-mappings-empty`) |
| Appearance | Theme selection |
| Data export | One-click JSON export download (GDPR portability) |
| Account deletion | Type-the-word confirm → TOTAL erasure (D82/D89 hard-delete) |

## 16. Mobile parity notes

Mobile mirrors the above via `HomeScreen` (scan entry + nav), `DashboardScreen`,
`BatchCaptureScreen`/`BatchReviewScreen`, `StatementsScreen`, `TransactionsScreen`/
`TransactionDetailScreen`, `ItemsScreen`, `TrendsScreen`, `ReportsScreen`/
`ReportDetailScreen`, `NotificationsScreen`, `GroupsScreen`/`GroupDetailScreen`,
`SettingsScreen`, `SignInScreen` (~214 `testID`s; S23 Maestro flows are the proofs).

Known gaps the overhaul should CLOSE (currently web-only):
- Header scope switcher (mobile switches scope via GroupsScreen "View dashboard") — P60(b).
- Invite-link generate/preview/join UI + role management UI — P60(c).
- Leave-group keep-vs-delete prompt (mobile leave currently always keeps) — P68 note.
- Mobile camera capture + photo-picker scan paths must remain (device-only features).

## 17. Out of scope here (decided elsewhere)

- Visual design itself (tokens/components live in the design-lab session's workspace;
  tokens bridge via `shared/design-tokens.ts`).
- Launch/landing page, cohort benchmarking (P18), credit purchase UX (blocked on the
  payment-provider decision) — backlog items, not part of the current surface.
