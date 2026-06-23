import { useState } from "react";
import { AppHeader } from "@design-system/organisms/Nav";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { ArrowLeftIcon } from "@design-system/assets/icons";
import { CategoryChip } from "@design-system/molecules/CategoryChip";
import { StatementSteps } from "../components/StatementSteps";
import { ReconcileGroup } from "../components/ReconcileGroup";
import { GroupedCategoryPicker } from "@design-system/molecules/GroupedCategoryPicker";
import { CancelStatementDialog } from "../components/CancelStatementDialog";
import {
  SAMPLE_RECONCILE,
  clpMinor,
  type ReconcileItem,
  type ReceiptTxn,
} from "@lib/statementFixtures";

/**
 * ScanStatementReconcileScreen (DM-43) — statement-scan screen 3 (Conciliar).
 * Three working groups, each a single-open accordion card:
 *
 *   1. Solo en el estado (violet) — statement lines with no app match. Each row
 *      resolves to Crear (new txn) or Descartar. Header "Crear (N)" creates all
 *      remaining; once all are resolved it flips to "Reiniciar" (revert all).
 *   2. Por revisar (amber) — ambiguous lines (pick one of several app
 *      candidates) + failed/illegible lines (raw extraction shown). Each row
 *      resolves to Conciliar (when a candidate is picked) / Crear aparte (none
 *      picked) / Descartar.
 *   3. Conciliadas (green) — auto-matched lines, PRE-resolved as conciliated.
 *      Each row can be undone, which reopens it as an editable Por-revisar-style
 *      row (line + the app transaction as a selected candidate + category).
 *
 * Every row shares ONE interaction model: a primary action that morphs between
 * Conciliar (a candidate is selected) and Crear/Crear aparte (none), with
 * Descartar on the left; resolving grays the row and swaps the footer for a
 * "Deshacer" revert. A section's count badge turns green when every row in it is
 * resolved. Opening one group minimizes the other two (the steps band is
 * independent). Nothing commits here — choices are staged for step 4 (Confirmar).
 */
export interface ScanStatementReconcileScreenProps {
  items?: ReconcileItem[];
  onBack?: () => void;
  /** advance to step 4 (Confirmar) — NOT a commit. */
  onContinue?: () => void;
  /** abandon the whole scan (confirmed via the X → cancel dialog). */
  onCancel?: () => void;
}

type Resolution = "created" | "conciliated" | "discarded";
type GroupKey = "statement_only" | "review" | "matched";

const RESOLUTION_LABEL: Record<Resolution, string> = {
  created: "Se creará",
  conciliated: "Se conciliará",
  discarded: "Se descartará",
};
const RESOLUTION_ICON: Record<Resolution, string> = {
  created: "action-add",
  conciliated: "scan-success",
  discarded: "action-delete",
};

const idOf = (it: ReconcileItem) => it.line?.id ?? it.receipt?.id ?? "?";

function candidatesFor(it: ReconcileItem): ReceiptTxn[] {
  if (it.verdict === "ambiguous") return it.candidates ?? [];
  if (it.verdict === "matched") return it.receipt ? [it.receipt] : [];
  return []; // statement_only, failed → nothing to match against
}

/** bare, clickable category pill — opens the grouped picker. No container, no edit icon. */
function CategoryField({ category, onPress }: { category: string; onPress: () => void }) {
  return (
    <button type="button" onClick={onPress} aria-label="Cambiar categoría" className="inline-flex max-w-full self-start transition hover:-translate-y-0.5">
      <CategoryChip category={category} size="sm" />
    </button>
  );
}

/** the parsed statement line (icon · description · date · cuota … amount). */
function LineHead({ item, failed }: { item: ReconcileItem; failed?: boolean }) {
  const l = item.line!;
  return (
    <div className="flex items-center gap-gt-8">
      <PixelIcon name={failed ? "scan-error" : (l.storeIcon ?? "store-other")} size={28} className="shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-gt-display text-gt-sm font-extrabold text-gt-ink">{l.description}</span>
        <span className="flex items-center gap-gt-4 text-gt-xs font-medium text-gt-ink-3">
          <PixelIcon name="chart-calendar" size={12} />{l.date}
          {l.installment ? <><span className="text-gt-line-strong">·</span>{l.installment} cuota</> : null}
        </span>
      </span>
      <span className="shrink-0 font-gt-display text-gt-sm font-extrabold text-gt-ink">{clpMinor(l.amountMinor)}</span>
    </div>
  );
}

/** a selectable app-transaction candidate (toggle to (de)select). */
function CandidateRow({ txn, selected, onToggle }: { txn: ReceiptTxn; selected: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      className={`flex w-full items-center gap-gt-8 rounded-gt-lg border-2 px-gt-8 py-gt-6 text-left transition ${
        selected ? "border-gt-line-strong bg-gt-bg-3 shadow-gt-xs" : "border-gt-line bg-gt-surface hover:border-gt-line-strong"
      }`}
    >
      <span aria-hidden="true" className={`grid h-4 w-4 shrink-0 place-items-center rounded-gt-pill border-2 ${selected ? "border-gt-line-strong" : "border-gt-line"}`}>
        {selected ? <span className="h-1.5 w-1.5 rounded-gt-pill" style={{ backgroundColor: "var(--positive-primary)" }} /> : null}
      </span>
      <PixelIcon name={txn.storeIcon} size={20} className="shrink-0" />
      <span className="min-w-0 flex-1 truncate font-gt-display text-gt-xs font-extrabold text-gt-ink">{txn.merchant}</span>
      <span className="shrink-0 text-gt-xs font-medium text-gt-ink-3">{txn.date}</span>
      <span className="shrink-0 font-gt-display text-gt-xs font-extrabold text-gt-ink">{clpMinor(txn.totalMinor)}</span>
    </button>
  );
}

/** the unified reconciliation row, shared by all three sections. */
interface ResolveRowProps {
  item: ReconcileItem;
  candidates: ReceiptTxn[];
  /** label for the create action when no candidate is selected. */
  createLabel: string;
  showError?: boolean;
  resolution: Resolution | undefined;
  selectedCandidate: string | undefined;
  category: string;
  onResolve: (r: Resolution) => void;
  onRevert: () => void;
  onToggleCandidate: (id: string) => void;
  onPickCategory: () => void;
}

function ResolveRow({ item, candidates, createLabel, showError, resolution, selectedCandidate, category, onResolve, onRevert, onToggleCandidate, onPickCategory }: ResolveRowProps) {
  const l = item.line!;
  const resolved = resolution != null;
  const hasSelection = selectedCandidate != null;
  const selCandidate = candidates.find((c) => c.id === selectedCandidate);
  const selMerchant = selCandidate?.merchant;
  // every row shows a category. a conciliated row shows the matched txn's
  // category; otherwise the row's own (picker-assigned) category.
  const categoryToShow = resolution === "conciliated" && selCandidate ? selCandidate.category : category;

  return (
    <div className="flex flex-col gap-gt-8 px-gt-12 py-gt-10">
      {/* statement line — grayed when resolved */}
      <div className={resolved ? "opacity-55 grayscale" : ""}>
        <LineHead item={item} failed={showError} />
      </div>

      {/* candidate list + raw error — only while still deciding (unresolved) */}
      {!resolved && candidates.length > 0 ? (
        <div className="flex flex-col gap-gt-4">
          <span className="text-gt-xs font-extrabold text-gt-ink-3">{candidates.length > 1 ? "Posibles coincidencias" : "Transacción en la app"}</span>
          {candidates.map((c) => (
            <CandidateRow key={c.id} txn={c} selected={selectedCandidate === c.id} onToggle={() => onToggleCandidate(c.id)} />
          ))}
        </div>
      ) : null}

      {!resolved && showError ? (
        <div className="flex flex-col gap-gt-4 rounded-gt-lg border-2 border-gt-line bg-gt-bg-3 px-gt-8 py-gt-6">
          <span className="flex items-center gap-gt-4 text-gt-xs font-extrabold text-gt-negative">
            <PixelIcon name="status-warning" size={14} />No se pudo leer la línea
          </span>
          {l.warnings?.length ? (
            <div className="flex flex-wrap gap-gt-4">
              {l.warnings.map((w) => (
                <span key={w} className="rounded-gt-pill border-2 border-gt-line bg-gt-surface px-gt-6 py-gt-0 text-[10px] font-extrabold text-gt-ink-2">{w}</span>
              ))}
            </div>
          ) : null}
          {l.rawText ? <code className="block truncate rounded-gt-md bg-gt-surface px-gt-6 py-gt-2 font-mono text-[11px] text-gt-ink-3">{l.rawText}</code> : null}
        </div>
      ) : null}

      {/* TransactionCategory — ALWAYS visible. Clickable while deciding; grayed +
          static once the row is settled (matches the grayed line/icon). */}
      {resolved ? (
        <span className="inline-flex max-w-full self-start opacity-55 grayscale"><CategoryChip category={categoryToShow} size="sm" /></span>
      ) : (
        <CategoryField category={categoryToShow} onPress={onPickCategory} />
      )}

      {/* footer: resolved → grayed outcome + a full-contrast Deshacer revert;
          else → [Descartar] [primary] */}
      {resolved ? (
        <div className="flex items-center justify-between gap-gt-8">
          <span className="flex min-w-0 items-center gap-gt-4 font-gt-display text-gt-xs font-extrabold text-gt-ink-3 opacity-55 grayscale">
            <PixelIcon name={RESOLUTION_ICON[resolution!]} size={16} />
            <span className="truncate">
              {resolution === "conciliated" && selMerchant ? `Se conciliará · ${selMerchant}` : RESOLUTION_LABEL[resolution!]}
            </span>
          </span>
          <button type="button" onClick={onRevert} className="flex shrink-0 items-center gap-gt-4 rounded-gt-lg border-2 border-gt-line-strong bg-gt-surface px-gt-10 py-gt-6 font-gt-display text-gt-xs font-extrabold text-gt-ink-2 shadow-gt-xs transition hover:-translate-y-0.5">
            <ArrowLeftIcon className="h-3.5 w-3.5" />Deshacer
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-gt-6">
          <button type="button" onClick={() => onResolve("discarded")} className="flex items-center justify-center gap-gt-6 rounded-gt-lg border-2 border-gt-line-strong bg-gt-surface px-gt-10 py-gt-6 font-gt-display text-gt-base font-extrabold text-gt-negative shadow-gt-xs transition hover:-translate-y-0.5">
            <PixelIcon name="action-delete" size={20} />Descartar
          </button>
          {hasSelection ? (
            <button type="button" onClick={() => onResolve("conciliated")} className="flex items-center justify-center gap-gt-6 rounded-gt-lg border-2 border-gt-line-strong px-gt-10 py-gt-6 font-gt-display text-gt-base font-extrabold text-white shadow-gt-xs transition hover:-translate-y-0.5" style={{ backgroundColor: "var(--positive-primary)" }}>
              <PixelIcon name="scan-success" size={20} />Conciliar
            </button>
          ) : (
            <button type="button" onClick={() => onResolve("created")} className="flex items-center justify-center gap-gt-6 rounded-gt-lg border-2 border-gt-line-strong px-gt-10 py-gt-6 font-gt-display text-gt-base font-extrabold text-white shadow-gt-xs transition hover:-translate-y-0.5" style={{ backgroundColor: "var(--primary)" }}>
              <PixelIcon name="action-add" size={20} />{createLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function ScanStatementReconcileScreen({ items = SAMPLE_RECONCILE, onBack, onContinue, onCancel }: ScanStatementReconcileScreenProps) {
  const [cancelOpen, setCancelOpen] = useState(false);
  const statementOnly = items.filter((it) => it.verdict === "statement_only");
  const review = items.filter((it) => it.verdict === "ambiguous" || it.verdict === "failed");
  const matched = items.filter((it) => it.verdict === "matched");

  const [infoOpen, setInfoOpen] = useState(true);
  const [openGroup, setOpenGroup] = useState<GroupKey | null>("statement_only");
  // matched rows start PRE-resolved as conciliated, with their receipt selected
  const [resolutions, setResolutions] = useState<Record<string, Resolution>>(() =>
    Object.fromEntries(matched.map((it) => [idOf(it), "conciliated" as Resolution])),
  );
  const [selected, setSelected] = useState<Record<string, string>>(() =>
    Object.fromEntries(matched.filter((it) => it.receipt).map((it) => [idOf(it), it.receipt!.id])),
  );
  const [categories, setCategories] = useState<Record<string, string>>({});
  const [picking, setPicking] = useState<string | null>(null);

  const catOf = (it: ReconcileItem) => categories[idOf(it)] ?? it.category ?? "otros";
  const resolve = (id: string, r: Resolution) => setResolutions((m) => ({ ...m, [id]: r }));
  const revert = (id: string) => setResolutions((m) => { const n = { ...m }; delete n[id]; return n; });
  const toggleCandidate = (id: string, candId: string) =>
    setSelected((m) => { if (m[id] === candId) { const n = { ...m }; delete n[id]; return n; } return { ...m, [id]: candId }; });
  const setCategory = (id: string, cat: string) => setCategories((c) => ({ ...c, [id]: cat }));

  const groupDone = (list: ReconcileItem[]) => list.length > 0 && list.every((it) => resolutions[idOf(it)] != null);
  const toggleGroup = (g: GroupKey) => setOpenGroup((p) => (p === g ? null : g));

  // purple header square: green "create-all" plus while any remain unresolved,
  // else the back-arrow that reverts the whole section to its initial state.
  const purpleRemaining = statementOnly.filter((it) => resolutions[idOf(it)] == null);
  const purpleAction = statementOnly.length === 0
    ? undefined
    : purpleRemaining.length > 0
      ? { ariaLabel: "Crear todas las transacciones", onClick: () => setResolutions((m) => { const n = { ...m }; purpleRemaining.forEach((it) => { n[idOf(it)] = "created"; }); return n; }) }
      : { revert: true, ariaLabel: "Reiniciar la sección", onClick: () => setResolutions((m) => { const n = { ...m }; statementOnly.forEach((it) => delete n[idOf(it)]); return n; }) };

  const renderRow = (it: ReconcileItem, createLabel: string) => (
    <ResolveRow
      key={idOf(it)}
      item={it}
      candidates={candidatesFor(it)}
      createLabel={createLabel}
      showError={it.verdict === "failed"}
      resolution={resolutions[idOf(it)]}
      selectedCandidate={selected[idOf(it)]}
      category={catOf(it)}
      onResolve={(r) => resolve(idOf(it), r)}
      onRevert={() => revert(idOf(it))}
      onToggleCandidate={(cid) => toggleCandidate(idOf(it), cid)}
      onPickCategory={() => setPicking(idOf(it))}
    />
  );

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-gt-bg">
      <AppHeader variant="detail" title="Conciliar estado" onBack={onBack ?? (() => {})} onClose={() => setCancelOpen(true)} />

      <div className="min-h-0 flex-1 overflow-y-auto px-gt-16 pb-gt-16">
        <div className="flex flex-col gap-gt-12 pt-gt-12">
          {/* steps band — independent collapse (NOT part of the group accordion) */}
          <div className="rounded-gt-xl border-2 border-gt-line bg-gt-bg-3">
            <button type="button" onClick={() => setInfoOpen((p) => !p)} aria-expanded={infoOpen} className="flex w-full items-center gap-gt-8 px-gt-12 pt-gt-12 pb-gt-8 text-left">
              <span className="min-w-0 flex-1"><StatementSteps current={2} /></span>
              <span aria-hidden="true" className={`mt-gt-2 h-2 w-2 shrink-0 self-start border-b-2 border-r-2 border-gt-ink-3 transition-transform duration-150 ease-gt-bounce ${infoOpen ? "translate-y-px rotate-225" : "-translate-y-px rotate-45"}`} />
            </button>
            {infoOpen ? (
              <p className="px-gt-12 pb-gt-12 text-center text-gt-sm font-medium text-gt-ink-2">
                <span className="font-extrabold text-gt-ink">Revisa las coincidencias.</span> Crea o concilia lo que falte; nada se guarda hasta confirmar.
              </p>
            ) : null}
          </div>

          {/* group 1 — Solo en el estado */}
          <ReconcileGroup
            label="Solo en el estado"
            count={statementOnly.length}
            icon="scan-statement"
            accent="var(--primary)"
            tint="rgba(139,92,246,0.08)"
            open={openGroup === "statement_only"}
            onToggle={() => toggleGroup("statement_only")}
            done={groupDone(statementOnly)}
            action={purpleAction}
          >
            {statementOnly.map((it) => renderRow(it, "Crear"))}
          </ReconcileGroup>

          {/* group 2 — Por revisar (ambiguous + failed) */}
          <ReconcileGroup
            label="Por revisar"
            count={review.length}
            icon="status-warning"
            accent="var(--warning)"
            tint="rgba(251,191,36,0.10)"
            open={openGroup === "review"}
            onToggle={() => toggleGroup("review")}
            done={groupDone(review)}
          >
            {review.map((it) => renderRow(it, "Crear aparte"))}
          </ReconcileGroup>

          {/* group 3 — Conciliadas (pre-resolved, undoable) */}
          <ReconcileGroup
            label="Conciliadas"
            count={matched.length}
            icon="scan-success"
            accent="var(--positive-primary)"
            tint="rgba(16,185,129,0.08)"
            open={openGroup === "matched"}
            onToggle={() => toggleGroup("matched")}
            done={groupDone(matched)}
          >
            {matched.map((it) => renderRow(it, "Crear aparte"))}
          </ReconcileGroup>
        </div>
      </div>

      {/* footer — advance to Confirmar (step 4). NOT a commit. */}
      <div className="shrink-0 border-t-2 border-gt-line-strong bg-gt-surface px-gt-16 pb-gt-32 pt-gt-12">
        <button type="button" onClick={onContinue} className="flex h-12 w-full items-center justify-center gap-gt-8 rounded-gt-xl border-2 border-gt-line-strong font-gt-display text-gt-md font-extrabold text-white shadow-gt-sm transition hover:-translate-y-0.5" style={{ backgroundColor: "var(--primary)" }}>
          Revisar y confirmar
          <span aria-hidden="true" className="h-2.5 w-2.5 -rotate-45 border-b-2 border-r-2 border-white" />
        </button>
      </div>

      {/* category picker (grouped by L1) — shared across every editable row */}
      <GroupedCategoryPicker
        open={picking != null}
        onClose={() => setPicking(null)}
        mode="establishment"
        selectedId={picking ? (categories[picking] ?? items.find((it) => idOf(it) === picking)?.category ?? "otros") : "otros"}
        onSelect={(catId) => { if (picking) setCategory(picking, catId); }}
      />

      {/* cancel-the-scan confirmation (triggered by the header X) */}
      <CancelStatementDialog open={cancelOpen} onDismiss={() => setCancelOpen(false)} onConfirm={() => { setCancelOpen(false); onCancel?.(); }} />
    </div>
  );
}
