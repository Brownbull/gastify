import { useState } from "react";
import { Button } from "@design-system/atoms/Button";
import { Switch } from "@design-system/atoms/Switch";
import { Modal } from "@design-system/atoms/Modal";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { XIcon } from "@design-system/assets/icons";
import { SettingsSubviewShell, SettingsGroupHeading } from "../components/SettingsSubviewShell";

/**
 * Mi memoria subview — gastify's learned categorization, split into two memories:
 *  1. Transacciones — how MERCHANTS map to a transaction category (rubro).
 *  2. Productos — how ITEM names map to an item category (L4 categoría).
 * A master "learn from my corrections" Switch sits on top; each learned rule can
 * be removed (the ✕), and "Olvidar todo" (Modal-confirmed) clears both memories.
 * Rules are local state so removals update live.
 */
interface MemoryRule {
  id: string;
  /** merchant name (transactions) or item name (productos). */
  name: string;
  icon: string;
  /** the learned category label. */
  category: string;
}

const INITIAL_TX_RULES: MemoryRule[] = [
  { id: "lider", name: "Líder", icon: "rubro-supermercados", category: "Supermercados" },
  { id: "copec", name: "Copec", icon: "rubro-transporte-vehiculo", category: "Transporte y Vehículo" },
  { id: "starbucks", name: "Starbucks", icon: "rubro-restaurantes", category: "Restaurantes" },
  { id: "falabella", name: "Falabella", icon: "rubro-tiendas-generales", category: "Tiendas Generales" },
  { id: "cruzverde", name: "Farmacia Cruz Verde", icon: "rubro-salud-bienestar", category: "Salud y Bienestar" },
];

const INITIAL_ITEM_RULES: MemoryRule[] = [
  { id: "coca", name: "Coca-Cola 1.5L", icon: "item-beverages", category: "Bebidas" },
  { id: "hallulla", name: "Pan Hallulla", icon: "item-bread-pastry", category: "Pan y Repostería" },
  { id: "yogurt", name: "Yogurt Soprole", icon: "item-dairy-eggs", category: "Lácteos y Huevos" },
  { id: "omo", name: "Detergente Omo", icon: "item-cleaning", category: "Productos de Limpieza" },
  { id: "paracetamol", name: "Paracetamol", icon: "item-medications", category: "Medicamentos" },
];

function RuleRow({ rule, onForget }: { rule: MemoryRule; onForget: (id: string) => void }) {
  return (
    <div className="flex items-center gap-gt-12 px-gt-4 py-gt-10">
      <span className="grid h-11 w-11 shrink-0 place-items-center">
        <PixelIcon name={rule.icon} size={36} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-gt-1">
        <span className="truncate font-gt-display text-gt-md font-extrabold text-gt-ink">{rule.name}</span>
        <span className="truncate text-gt-sm font-medium text-gt-ink-3">Se clasifica como {rule.category}</span>
      </span>
      <button
        type="button"
        onClick={() => onForget(rule.id)}
        aria-label={`Olvidar regla de ${rule.name}`}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-gt-pill text-gt-ink-3 transition duration-150 ease-gt-bounce hover:bg-gt-bg-3 hover:text-gt-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-gt-primary/20"
      >
        <XIcon className="h-5 w-5" />
      </button>
    </div>
  );
}

/** A labelled memory section (heading + caption + its rule list or empty note). */
function MemorySection({
  heading,
  caption,
  rules,
  onForget,
}: {
  heading: string;
  caption: string;
  rules: MemoryRule[];
  onForget: (id: string) => void;
}) {
  return (
    <>
      <div className="flex flex-col gap-gt-1">
        <SettingsGroupHeading>{heading}</SettingsGroupHeading>
        <p className="px-gt-4 text-gt-xs font-medium text-gt-ink-3">{caption}</p>
      </div>
      {rules.length > 0 ? (
        <div className="flex flex-col">
          {rules.map((rule) => (
            <RuleRow key={rule.id} rule={rule} onForget={onForget} />
          ))}
        </div>
      ) : (
        <p className="px-gt-4 py-gt-6 text-gt-sm font-medium text-gt-ink-3">Aún no hay reglas aprendidas.</p>
      )}
    </>
  );
}

export function MemorySubview({ onBack }: { onBack?: () => void }) {
  const [learning, setLearning] = useState(true);
  const [txRules, setTxRules] = useState<MemoryRule[]>(INITIAL_TX_RULES);
  const [itemRules, setItemRules] = useState<MemoryRule[]>(INITIAL_ITEM_RULES);
  const [confirmClear, setConfirmClear] = useState(false);

  const forgetTx = (id: string) => setTxRules((prev) => prev.filter((r) => r.id !== id));
  const forgetItem = (id: string) => setItemRules((prev) => prev.filter((r) => r.id !== id));
  const clearAll = () => {
    setTxRules([]);
    setItemRules([]);
    setConfirmClear(false);
  };

  const hasAny = txRules.length > 0 || itemRules.length > 0;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <SettingsSubviewShell title="Mi memoria" onBack={onBack}>
        <p className="px-gt-2 text-gt-sm font-medium leading-relaxed text-gt-ink-3">
          gastify recuerda cómo clasificas tus compras y tus productos, y aplica esas reglas automáticamente la próxima vez.
        </p>

        {/* master toggle */}
        <div className="flex items-center gap-gt-12 px-gt-4 py-gt-10">
          <span className="grid h-11 w-11 shrink-0 place-items-center">
            <PixelIcon name="settings-memory" size={36} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-gt-1">
            <span className="font-gt-display text-gt-md font-extrabold text-gt-ink">Aprender de mis correcciones</span>
            <span className="text-gt-sm font-medium text-gt-ink-3">Mejora la categorización con el tiempo</span>
          </span>
          <Switch checked={learning} onChange={setLearning} label="Aprender de mis correcciones" />
        </div>

        {/* 1 — transaction-field memory */}
        <MemorySection
          heading="Transacciones"
          caption="Cómo se clasifican los comercios de tus boletas."
          rules={txRules}
          onForget={forgetTx}
        />

        {/* 2 — item-field memory */}
        <MemorySection
          heading="Productos"
          caption="Cómo se clasifican los ítems dentro de cada boleta."
          rules={itemRules}
          onForget={forgetItem}
        />

        {/* destructive — clears both memories */}
        {hasAny ? (
          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            className="mt-gt-8 flex w-full items-center gap-gt-12 px-gt-4 py-gt-10 text-left transition duration-150 ease-gt-bounce hover:bg-gt-negative/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-gt-primary/20"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center">
              <PixelIcon name="action-delete" size={36} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-gt-1">
              <span className="font-gt-display text-gt-md font-extrabold text-gt-negative">Olvidar todo</span>
              <span className="text-gt-sm font-medium text-gt-ink-3">Borra todas las reglas aprendidas</span>
            </span>
          </button>
        ) : null}
      </SettingsSubviewShell>

      <Modal
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="¿Olvidar todo lo aprendido?"
        footer={
          <div className="flex justify-end gap-gt-8">
            <Button variant="ghost" size="sm" onClick={() => setConfirmClear(false)}>Cancelar</Button>
            <Button variant="danger" size="sm" onClick={clearAll}>Olvidar todo</Button>
          </div>
        }
      >
        <p className="font-gt-body text-gt-sm leading-relaxed text-gt-ink-2">
          gastify volverá a clasificar tus transacciones y productos desde cero. Esta acción no se puede deshacer.
        </p>
      </Modal>
    </div>
  );
}
