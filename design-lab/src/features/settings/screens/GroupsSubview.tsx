import { EmptyState } from "@design-system/molecules/EmptyState";
import { SettingsSubviewShell } from "../components/SettingsSubviewShell";

/**
 * Grupos subview — a coming-soon empty state (the SettingsScreen row already
 * carries a "Próximamente" badge). Custom groups for sharing expenses are future.
 */
export function GroupsSubview({ onBack }: { onBack?: () => void }) {
  return (
    <SettingsSubviewShell title="Grupos" onBack={onBack}>
      <div className="grid place-items-center py-gt-24" style={{ minHeight: "46vh" }}>
        <EmptyState
          iconName="settings-groups"
          title="¡Próximamente!"
          message="Esta función está siendo rediseñada para una mejor experiencia. Pronto podrás crear y compartir grupos de gastos con tu familia."
        />
      </div>
    </SettingsSubviewShell>
  );
}
