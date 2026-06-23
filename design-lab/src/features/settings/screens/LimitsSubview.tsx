import { useState } from "react";
import { Button } from "@design-system/atoms/Button";
import { Switch } from "@design-system/atoms/Switch";
import { Input } from "@design-system/atoms/Input";
import { Select } from "@design-system/atoms/Select";
import { Modal } from "@design-system/atoms/Modal";
import { IconTile } from "@design-system/atoms/IconTile";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { FAMILIAS, getCategoryToken } from "@lib/categoryTokens";
import { SettingsSubviewShell, SettingsGroupHeading } from "../components/SettingsSubviewShell";
import { SettingsUsageBar, clp } from "../components/SettingsUsageBar";

/**
 * Límites de gasto subview — a master monthly-limits Switch, an editable total
 * budget, then a per-FAMILIA (L3) spend list rendered like the transaction
 * cards: a category-bordered card whose header has a tinted icon tile, the
 * familia title, a full-width fill bar, and the % + amount on the right; the
 * L4 categorías that make up the spend are listed nested below ("coming out of"
 * the L3). The LIMIT is set per familia (L3) only — tapping a card edits it;
 * the L4 rows are a read-only spend breakdown. "Agregar" reuses the editor in
 * add mode (pick an untracked familia + assign a limit). Spent is actual data
 * (sum of the L4 breakdown); only limits are editable. Live local-state mockup.
 */

interface L4Spend {
  /** L4 categoría id — see @lib/categoryTokens CATEGORIAS. */
  id: string;
  spent: number;
}

interface FamiliaLimit {
  /** familia (L3) id — see @lib/categoryTokens FAMILIAS. */
  id: string;
  /** user-assigned monthly limit (editable). */
  limit: number;
  /** L4 breakdown of this month's actual spend (read-only). */
  breakdown: L4Spend[];
}

const INITIAL_TOTAL_LIMIT = 800000;

const INITIAL_LIMITS: FamiliaLimit[] = [
  {
    id: "food-fresh",
    limit: 200000,
    breakdown: [
      { id: "Produce", spent: 78000 },
      { id: "MeatSeafood", spent: 64000 },
      { id: "DairyEggs", spent: 28000 },
      { id: "BreadPastry", spent: 12000 },
    ],
  },
  {
    id: "food-packaged",
    limit: 120000,
    breakdown: [
      { id: "Pantry", spent: 41000 },
      { id: "Beverages", spent: 30000 },
      { id: "Snacks", spent: 17000 },
      { id: "FrozenFoods", spent: 8000 },
    ],
  },
  {
    id: "food-prepared",
    limit: 80000,
    breakdown: [{ id: "PreparedFood", spent: 61000 }],
  },
  {
    id: "vicios",
    limit: 40000,
    breakdown: [
      { id: "Alcohol", spent: 32000 },
      { id: "Tobacco", spent: 15000 },
      { id: "GamesOfChance", spent: 7000 },
    ],
  },
  {
    id: "hogar",
    limit: 60000,
    breakdown: [
      { id: "CleaningSupplies", spent: 12000 },
      { id: "HomeEssentials", spent: 9000 },
      { id: "PetFood", spent: 6000 },
    ],
  },
];

const spentOf = (row: FamiliaLimit) => row.breakdown.reduce((sum, b) => sum + b.spent, 0);

/** Editor target: the total budget, an existing familia limit, or a new one. */
interface EditorState {
  mode: "total" | "edit" | "add";
  /** familia id ("" for total). */
  categoryId: string;
  /** raw digits of the limit being entered. */
  value: string;
}

/** A "$"-prefixed numeric field for a CLP limit (mirrors the phone-prefix idiom). */
function LimitAmountField({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  return (
    <div className="flex items-end gap-gt-8">
      <span className="grid shrink-0 self-stretch place-items-center rounded-gt-lg border-2 border-gt-line-strong bg-gt-surface px-gt-12 font-gt-display text-gt-md font-bold leading-none text-gt-ink-2">
        $
      </span>
      <Input
        className="flex-1"
        aria-label="Monto del límite mensual"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 9))}
        placeholder="0"
      />
    </div>
  );
}

/**
 * A nested L4 categoría row inside a familia card. Mirrors the L3 header — a
 * tinted icon tile, the categoría name with a (narrower) fill bar, and the
 * % + amount on the right — but the % / bar are measured against the FAMILIA's
 * L3 limit, so the L4 shares decompose the L3 percentage. `limit` is the parent
 * familia's limit.
 */
function L4SpendRow({ row, limit }: { row: L4Spend; limit: number }) {
  const token = getCategoryToken(row.id);
  const pct = limit > 0 ? Math.round((row.spent / limit) * 100) : 0;
  return (
    <li className="flex items-center gap-gt-10 px-gt-12 py-gt-8">
      <IconTile size="sm" tint={token.tint} icon={token.icon} />
      <span className="flex min-w-0 flex-1 flex-col gap-gt-4">
        <span className="truncate text-gt-sm font-bold text-gt-ink-2">{token.label}</span>
        {/* deliberately narrower than the full-width L3 title bar */}
        <span className="block w-24">
          <SettingsUsageBar value={row.spent} max={limit} />
        </span>
      </span>
      <span className="flex w-32 shrink-0 flex-col items-end gap-gt-4">
        <span className="text-gt-sm font-extrabold leading-none text-gt-ink-2">{pct}%</span>
        <span className="text-gt-sm font-extrabold leading-none text-gt-ink">{clp(row.spent)}</span>
      </span>
    </li>
  );
}

/**
 * A familia (L3) limit card — transaction-card grammar: category-color border,
 * a tinted icon tile, the title with a full-width fill bar, the % + amount on
 * the right, and the L4 spend breakdown nested below. The header taps to edit.
 */
function FamiliaLimitCard({ row, onEdit }: { row: FamiliaLimit; onEdit: (id: string, limit: number) => void }) {
  const fam = getCategoryToken(row.id);
  const spent = spentOf(row);
  const over = spent > row.limit;
  const pct = row.limit > 0 ? Math.round((spent / row.limit) * 100) : 0;
  return (
    <section className="overflow-hidden rounded-gt-2xl border-2 bg-gt-surface shadow-gt-sm" style={{ borderColor: fam.color }}>
      <button
        type="button"
        onClick={() => onEdit(row.id, row.limit)}
        aria-label={`Editar límite de ${fam.label}`}
        className="flex w-full items-center gap-gt-12 px-gt-12 py-gt-12 text-left transition duration-150 ease-gt-bounce hover:bg-gt-bg-3 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-gt-primary/20"
      >
        <IconTile size="md" tint={fam.tint} icon={fam.icon} />
        <span className="flex min-w-0 flex-1 flex-col gap-gt-6">
          <span className="truncate font-gt-display text-gt-md font-extrabold text-gt-ink">{fam.label}</span>
          <SettingsUsageBar value={spent} max={row.limit} />
        </span>
        <span className="flex w-32 shrink-0 flex-col items-end gap-gt-6">
          <span className={`font-gt-display text-gt-md font-extrabold leading-none ${over ? "text-gt-negative" : "text-gt-ink"}`}>{pct}%</span>
          <span className="whitespace-nowrap text-gt-sm font-bold leading-none text-gt-ink-2">
            {clp(spent)} / {clp(row.limit)}
          </span>
        </span>
      </button>
      {row.breakdown.length > 0 ? (
        <ul className="divide-y divide-gt-line border-t-2 border-gt-line bg-gt-bg-3">
          {row.breakdown.map((b) => (
            <L4SpendRow key={b.id} row={b} limit={row.limit} />
          ))}
        </ul>
      ) : null}
    </section>
  );
}

/** The shared add/edit editor (Modal). Same surface for total, edit, and add. */
function LimitEditor({
  editor,
  available,
  onChange,
  onSave,
  onRemove,
  onClose,
}: {
  editor: EditorState;
  available: (typeof FAMILIAS)[number][];
  onChange: (next: EditorState) => void;
  onSave: () => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const fam = editor.categoryId ? getCategoryToken(editor.categoryId) : null;
  const title =
    editor.mode === "total" ? "Editar límite total" : editor.mode === "add" ? "Nuevo límite de categoría" : "Editar límite";
  const canSave = editor.value !== "" && Number.parseInt(editor.value, 10) > 0 && (editor.mode !== "add" || editor.categoryId !== "");

  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      footer={
        <div className="flex items-center justify-end gap-gt-8">
          {editor.mode === "edit" ? (
            <Button variant="ghost" size="sm" className="mr-auto text-gt-negative" onClick={onRemove}>Quitar</Button>
          ) : null}
          <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" size="sm" onClick={onSave} disabled={!canSave}>Guardar</Button>
        </div>
      }
    >
      <div className="flex flex-col gap-gt-12">
        {editor.mode === "add" ? (
          <div className="flex flex-col gap-gt-6">
            <span className="px-gt-2 font-gt-display text-gt-sm font-bold text-gt-ink-2">Familia</span>
            {available.length > 0 ? (
              <Select
                value={editor.categoryId}
                onChange={(id) => onChange({ ...editor, categoryId: id })}
                options={available.map((f) => ({ value: f.id, label: f.label }))}
              />
            ) : (
              <p className="text-gt-sm font-medium text-gt-ink-3">Ya asignaste un límite a todas las familias.</p>
            )}
          </div>
        ) : fam ? (
          <div className="flex items-center gap-gt-10 rounded-gt-lg border-2 border-gt-line-strong bg-gt-surface px-gt-12 py-gt-10">
            <IconTile size="sm" tint={fam.tint} icon={fam.icon} />
            <span className="font-gt-display text-gt-md font-extrabold text-gt-ink">{fam.label}</span>
          </div>
        ) : null}

        <div className="flex flex-col gap-gt-6">
          <span className="px-gt-2 font-gt-display text-gt-sm font-bold text-gt-ink-2">Límite mensual</span>
          <LimitAmountField value={editor.value} onChange={(v) => onChange({ ...editor, value: v })} />
        </div>
      </div>
    </Modal>
  );
}

export function LimitsSubview({ onBack }: { onBack?: () => void }) {
  const [enabled, setEnabled] = useState(true);
  const [totalLimit, setTotalLimit] = useState(INITIAL_TOTAL_LIMIT);
  const [limits, setLimits] = useState<FamiliaLimit[]>(INITIAL_LIMITS);
  const [editor, setEditor] = useState<EditorState | null>(null);

  const available = FAMILIAS.filter((f) => !limits.some((l) => l.id === f.id));
  // Total spent is derived from the familia breakdowns (same source as the cards)
  // so the total meter stays consistent as familias are added / edited / removed.
  const totalSpent = limits.reduce((sum, l) => sum + spentOf(l), 0);

  const openTotal = () => setEditor({ mode: "total", categoryId: "", value: String(totalLimit) });
  const openEdit = (id: string, limit: number) => setEditor({ mode: "edit", categoryId: id, value: String(limit) });
  const openAdd = () => setEditor({ mode: "add", categoryId: available[0]?.id ?? "", value: "" });
  const closeEditor = () => setEditor(null);

  const saveEditor = () => {
    if (!editor) return;
    const amount = Number.parseInt(editor.value, 10);
    if (!Number.isFinite(amount) || amount <= 0) return;
    if (editor.mode === "total") {
      setTotalLimit(amount);
    } else if (editor.mode === "edit") {
      setLimits((prev) => prev.map((l) => (l.id === editor.categoryId ? { ...l, limit: amount } : l)));
    } else if (editor.categoryId) {
      setLimits((prev) => [...prev, { id: editor.categoryId, limit: amount, breakdown: [] }]);
    }
    closeEditor();
  };

  const removeEditor = () => {
    if (editor?.mode === "edit") setLimits((prev) => prev.filter((l) => l.id !== editor.categoryId));
    closeEditor();
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <SettingsSubviewShell title="Límites de gasto" onBack={onBack}>
        {/* master toggle */}
        <div className="flex items-center gap-gt-12 px-gt-4 py-gt-10">
          <span className="grid h-11 w-11 shrink-0 place-items-center">
            <PixelIcon name="fin-budget" size={36} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-gt-1">
            <span className="font-gt-display text-gt-md font-extrabold text-gt-ink">Límites mensuales</span>
            <span className="text-gt-sm font-medium text-gt-ink-3">Avísame cuando me acerque a un límite</span>
          </span>
          <Switch checked={enabled} onChange={setEnabled} label="Límites mensuales" />
        </div>

        {enabled ? (
          <>
            {/* total budget (tap to edit) */}
            <SettingsGroupHeading>Límite total</SettingsGroupHeading>
            <button
              type="button"
              onClick={openTotal}
              aria-label="Editar límite total"
              className="flex flex-col gap-gt-8 rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface px-gt-16 py-gt-12 text-left shadow-gt-sm transition duration-150 ease-gt-bounce hover:-translate-y-0.5 hover:shadow-gt-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gt-primary/20"
            >
              <div className="flex items-end justify-between gap-gt-8">
                <span className="font-gt-display text-gt-lg font-extrabold text-gt-ink">{clp(totalSpent)}</span>
                <span className="shrink-0 text-gt-sm font-bold text-gt-ink-2">de {clp(totalLimit)}</span>
              </div>
              <SettingsUsageBar value={totalSpent} max={totalLimit} />
            </button>

            {/* per familia (L3) with nested L4 breakdown */}
            <div className="flex flex-col gap-gt-1">
              <SettingsGroupHeading>Por familia</SettingsGroupHeading>
              <p className="px-gt-4 text-gt-xs font-medium text-gt-ink-3">El límite se fija por familia (L3); abajo se detalla el gasto por categoría (L4).</p>
            </div>
            <div className="flex flex-col gap-gt-12">
              {limits.map((row) => (
                <FamiliaLimitCard key={row.id} row={row} onEdit={openEdit} />
              ))}
            </div>
            <Button variant="secondary" fullWidth onClick={openAdd} disabled={available.length === 0}>
              Agregar límite de categoría
            </Button>
          </>
        ) : null}
      </SettingsSubviewShell>

      {editor ? (
        <LimitEditor
          editor={editor}
          available={available}
          onChange={setEditor}
          onSave={saveEditor}
          onRemove={removeEditor}
          onClose={closeEditor}
        />
      ) : null}
    </div>
  );
}
