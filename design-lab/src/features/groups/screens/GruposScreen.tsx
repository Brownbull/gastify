import { useState } from "react";
import { AppHeader } from "@design-system/organisms/Nav";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { Button } from "@design-system/atoms/Button";
import { EmptyState } from "@design-system/molecules/EmptyState";
import { GroupCard } from "../components/GroupCard";
import { CreateGroupSheet, type CreateGroupDraft } from "../components/CreateGroupSheet";
import { SAMPLE_GROUPS, type Group } from "../model/groupFixtures";

/**
 * GruposScreen — the Grupos hub, reached from the avatar dropdown (peer to
 * Ajustes), mounted as a full-surface overlay with its own back-arrow header.
 * Lists the user's groups (GroupCard each) with a dashed "Crear grupo" CTA, or a
 * first-run EmptyState when there are none.
 */
export interface GruposScreenProps {
  groups?: Group[];
  onBack?: () => void;
  onOpenGroup?: (group: Group) => void;
  /** notified when a group is created from the sheet (the sheet is screen-owned). */
  onCreate?: (draft: CreateGroupDraft) => void;
}

export function GruposScreen({ groups = SAMPLE_GROUPS, onBack, onOpenGroup, onCreate }: GruposScreenProps) {
  const [createOpen, setCreateOpen] = useState(false);
  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-gt-bg">
      <AppHeader variant="settings" title="Grupos" onBack={onBack} />
      <div className="min-h-0 flex-1 overflow-y-auto px-gt-16 pb-gt-16">
        <div className="mx-auto flex w-full flex-col gap-gt-12 pt-gt-12" style={{ maxWidth: "42rem" }}>
          {groups.length === 0 ? (
            <div className="grid place-items-center py-gt-24" style={{ minHeight: "52vh" }}>
              <EmptyState
                iconName="settings-groups"
                title="Aún no tienes grupos"
                message="Crea un grupo para compartir gastos con tu familia, roommates o amigos."
                actions={<Button variant="primary" onClick={() => setCreateOpen(true)}>Crear grupo</Button>}
              />
            </div>
          ) : (
            <>
              <p className="px-gt-4 font-gt-display text-gt-sm font-extrabold uppercase tracking-wide text-gt-ink-3">
                Tus grupos · {groups.length}
              </p>
              {groups.map((g) => (
                <GroupCard key={g.id} group={g} onOpen={onOpenGroup} />
              ))}
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="mt-gt-2 flex w-full items-center justify-center gap-gt-8 rounded-gt-2xl border-2 border-dashed border-gt-line-strong bg-gt-surface px-gt-12 py-gt-12 font-gt-display text-gt-md font-extrabold text-gt-primary shadow-gt-xs transition duration-150 ease-gt-bounce hover:-translate-y-0.5 hover:border-gt-primary hover:shadow-gt-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gt-primary/25"
              >
                <PixelIcon name="action-add" size={22} /> Crear grupo
              </button>
            </>
          )}
        </div>
      </div>

      <CreateGroupSheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={(draft) => { onCreate?.(draft); setCreateOpen(false); }}
      />
    </div>
  );
}
