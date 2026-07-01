import { Button } from "@/components/ui/Button";

/**
 * Apply / Discard footer for a settings section — appears only when there are
 * staged (unsaved) changes. Lets a section batch its writes behind one explicit
 * "Aplicar cambios" instead of saving on every control change.
 */
export function SettingsApplyBar({
  dirty,
  saving,
  error,
  onApply,
  onDiscard,
  labels,
}: {
  dirty: boolean;
  saving: boolean;
  error: string | null;
  onApply: () => void;
  onDiscard: () => void;
  labels: { apply: string; applying: string; discard: string };
}) {
  if (!dirty) return null;
  return (
    <div className="mt-gt-8 flex flex-col gap-gt-6 border-t-2 border-gt-line pt-gt-12">
      {error ? (
        <p className="text-center text-gt-sm font-bold text-gt-error" role="alert">{error}</p>
      ) : null}
      <div className="flex gap-gt-8">
        <Button variant="ghost" fullWidth onClick={onDiscard} disabled={saving} data-testid="settings-discard">
          {labels.discard}
        </Button>
        <Button variant="primary" fullWidth onClick={onApply} disabled={saving} data-testid="settings-apply">
          {saving ? labels.applying : labels.apply}
        </Button>
      </div>
    </div>
  );
}
