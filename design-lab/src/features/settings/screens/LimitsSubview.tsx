import { useState } from "react";
import { Button } from "@design-system/atoms/Button";
import { Switch } from "@design-system/atoms/Switch";
import { Input } from "@design-system/atoms/Input";
import { Select } from "@design-system/atoms/Select";
import { Modal } from "@design-system/atoms/Modal";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { FAMILIAS } from "@lib/categoryTokens";
import { SettingsSubviewShell, SettingsGroupHeading } from "../components/SettingsSubviewShell";
import { SettingsUsageBar, clp } from "../components/SettingsUsageBar";

/**
 * Límites de gasto subview — a master monthly-limits Switch, an editable total
 * budget, then a per-FAMILIA (L3) spend list. Tracking is ALWAYS at the familia
 * level (item-category groups) — there is no level selector. The total card and
 * each familia row are tappable to edit their assigned limit, and "Agregar
 * límite de categoría" opens the SAME editor in add mode (pick an untracked
 * familia + assign a limit). Spent values are actual data; only limits are
 * editable. Presentational mockup with live local state.
 */

const FAMILIA_BY_ID: Record<string, (typeof FAMILIAS)[number]> = Object.fromEntries(
  FAMILIAS.map((f) => [f.id, f]),
);

interface FamiliaLimit {
  /** familia (L3) id — see @lib/categoryTokens FAMILIAS. */
  id: string;
  /** actual spend this month (read-only). */
  spent: number;
  /** user-assigned monthly limit (editable). */
  limit: number;
}

const TOTAL_SPENT = 520000;
const INITIAL_TOTAL_LIMIT = 800000;

const INITIAL_LIMITS: FamiliaLimit[] = [
  { id: "food-fresh", spent: 182000, limit: 200000 },
  { id: "food-packaged", spent: 96000, limit: 120000 },
  { id: "food-prepared", spent: 61000, limit: 80000 },
  { id: "vicios", spent: 54000, limit: 40000 },
  { id: "hogar", spent: 27000, limit: 60000 },
];

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
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
        placeholder="0"
      />
    </div>
  );
}

/** One tappable familia row: icon · label · spent/limit · edit glyph · usage bar. */
function FamiliaLimitRow({ row, onEdit }: { row: FamiliaLimit; onEdit: (id: string, limit: number) => void }) {
  const fam = FAMILIA_BY_ID[row.id];
  const over = row.spent > row.limit;
  return (
    <button
      type="button"
      onClick={() => onEdit(row.id, row.limit)}
      aria-label={`Editar límite de ${fam.label}`}
      className="flex w-full items-center gap-gt-12 rounded-gt-lg px-gt-4 py-gt-10 text-left transition duration-150 ease-gt-bounce hover:bg-gt-bg-3 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-gt-primary/20"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center">
        <PixelIcon name={fam.icon} size={36} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-gt-6">
        <span className="truncate font-gt-display text-gt-md font-extrabold text-gt-ink">{fam.label}</span>
        <span className={`text-gt-sm font-bold ${over ? "text-gt-negative" : "text-gt-ink-3"}`}>
          {clp(row.spent)} / {clp(row.limit)}
        </span>
        <SettingsUsageBar value={row.spent} max={row.limit} />
      </span>
      <span aria-hidden="true" className="grid h-7 w-7 shrink-0 place-items-center">
        <PixelIcon name="action-edit" size={20} />
      </span>
    </button>
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
  const fam = editor.categoryId ? FAMILIA_BY_ID[editor.categoryId] : null;
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
            <PixelIcon name={fam.icon} size={32} />
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
      setLimits((prev) => [...prev, { id: editor.categoryId, spent: 0, limit: amount }]);
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
                <span className="font-gt-display text-gt-lg font-extrabold text-gt-ink">{clp(TOTAL_SPENT)}</span>
                <span className="flex shrink-0 items-center gap-gt-6">
                  <span className="text-gt-sm font-bold text-gt-ink-3">de {clp(totalLimit)}</span>
                  <PixelIcon name="action-edit" size={18} />
                </span>
              </div>
              <SettingsUsageBar value={TOTAL_SPENT} max={totalLimit} />
            </button>

            {/* per familia (L3) */}
            <div className="flex flex-col gap-gt-1">
              <SettingsGroupHeading>Por familia</SettingsGroupHeading>
              <p className="px-gt-4 text-gt-xs font-medium text-gt-ink-3">El seguimiento de gasto se hace por familia de productos.</p>
            </div>
            <div className="flex flex-col">
              {limits.map((row) => (
                <FamiliaLimitRow key={row.id} row={row} onEdit={openEdit} />
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
