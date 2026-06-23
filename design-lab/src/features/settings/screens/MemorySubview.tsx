import { useState } from "react";
import { Button } from "@design-system/atoms/Button";
import { Switch } from "@design-system/atoms/Switch";
import { Modal } from "@design-system/atoms/Modal";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { XIcon } from "@design-system/assets/icons";
import { SettingsSubviewShell, SettingsGroupHeading } from "../components/SettingsSubviewShell";

/**
 * Mi memoria subview — gastify's learned categorization rules. A master
 * "learn from my corrections" Switch over a removable list of merchant →
 * category associations, plus a destructive "forget everything" (Modal-confirmed).
 * Rules are local state so removing one (the ✕) updates live.
 */
interface LearnedRule {
  id: string;
  merchant: string;
  icon: string;
  category: string;
}

const INITIAL_RULES: LearnedRule[] = [
  { id: "lider", merchant: "Líder", icon: "rubro-supermercados", category: "Supermercados" },
  { id: "copec", merchant: "Copec", icon: "rubro-transporte-vehiculo", category: "Transporte" },
  { id: "starbucks", merchant: "Starbucks", icon: "rubro-restaurantes", category: "Restaurantes" },
  { id: "falabella", merchant: "Falabella", icon: "rubro-tiendas-generales", category: "Tiendas generales" },
  { id: "cruzverde", merchant: "Farmacia Cruz Verde", icon: "rubro-salud-bienestar", category: "Salud y bienestar" },
];

function RuleRow({ rule, onForget }: { rule: LearnedRule; onForget: (id: string) => void }) {
  return (
    <div className="flex items-center gap-gt-12 px-gt-4 py-gt-10">
      <span className="grid h-11 w-11 shrink-0 place-items-center">
        <PixelIcon name={rule.icon} size={36} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-gt-1">
        <span className="truncate font-gt-display text-gt-md font-extrabold text-gt-ink">{rule.merchant}</span>
        <span className="truncate text-gt-sm font-medium text-gt-ink-3">Se clasifica como {rule.category}</span>
      </span>
      <button
        type="button"
        onClick={() => onForget(rule.id)}
        aria-label={`Olvidar regla de ${rule.merchant}`}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-gt-pill text-gt-ink-3 transition duration-150 ease-gt-bounce hover:bg-gt-bg-3 hover:text-gt-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-gt-primary/20"
      >
        <XIcon className="h-5 w-5" />
      </button>
    </div>
  );
}

export function MemorySubview({ onBack }: { onBack?: () => void }) {
  const [learning, setLearning] = useState(true);
  const [rules, setRules] = useState<LearnedRule[]>(INITIAL_RULES);
  const [confirmClear, setConfirmClear] = useState(false);

  const forget = (id: string) => setRules((prev) => prev.filter((r) => r.id !== id));
  const clearAll = () => {
    setRules([]);
    setConfirmClear(false);
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <SettingsSubviewShell title="Mi memoria" onBack={onBack}>
        <p className="px-gt-2 text-gt-sm font-medium leading-relaxed text-gt-ink-3">
          gastify recuerda cómo clasificas tus compras y aplica esas reglas automáticamente la próxima vez.
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

        {/* learned rules */}
        <SettingsGroupHeading>Reglas aprendidas</SettingsGroupHeading>
        {rules.length > 0 ? (
          <div className="flex flex-col">
            {rules.map((rule) => (
              <RuleRow key={rule.id} rule={rule} onForget={forget} />
            ))}
          </div>
        ) : (
          <p className="px-gt-4 py-gt-10 text-gt-sm font-medium text-gt-ink-3">Aún no hay reglas aprendidas.</p>
        )}

        {/* destructive */}
        {rules.length > 0 ? (
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
          gastify volverá a clasificar tus compras desde cero. Esta acción no se puede deshacer.
        </p>
      </Modal>
    </div>
  );
}
