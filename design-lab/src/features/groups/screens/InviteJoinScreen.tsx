import { useState } from "react";
import { AppHeader } from "@design-system/organisms/Nav";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { Button } from "@design-system/atoms/Button";
import { GroupAvatar } from "@design-system/atoms/GroupAvatar";
import { MemberCluster } from "../components/MemberCluster";
import type { Group } from "../model/groupFixtures";

/**
 * InviteJoinScreen — the RECIPIENT side of an invite link (backend GET
 * /invites/:token preview → POST /invites/:token/join). Opened from a deep link
 * before you're a member: preview the group (avatar, name, who invited, member
 * cluster) → "Unirme al grupo". Expired/invalid tokens show an error (404
 * anti-enum); a successful join confirms and offers to open the group.
 */
export interface InviteJoinScreenProps {
  group: Group;
  inviterName?: string;
  /** expired or already-used token → the error state (no join). */
  expired?: boolean;
  onJoin?: () => void;
  onViewGroup?: () => void;
  onClose?: () => void;
}

export function InviteJoinScreen({ group, inviterName = "Un miembro", expired = false, onJoin, onViewGroup, onClose }: InviteJoinScreenProps) {
  const [joined, setJoined] = useState(false);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-gt-bg">
      <AppHeader variant="detail" title="Invitación" onClose={onClose ?? (() => {})} />

      <div className="min-h-0 flex-1 overflow-y-auto px-gt-16 pb-gt-16">
        <div className="mx-auto flex w-full max-w-xs flex-col items-center gap-gt-12 pt-gt-20 text-center">
          {expired ? (
            <>
              <span className="grid h-20 w-20 place-items-center rounded-gt-2xl border-2 border-gt-line-strong bg-gt-bg-3">
                <PixelIcon name="status-warning" size={48} />
              </span>
              <div>
                <h2 className="font-gt-display text-gt-xl font-extrabold text-gt-ink">Invitación no válida</h2>
                <p className="pt-gt-2 text-gt-sm font-medium text-gt-ink-2">Este enlace expiró o ya fue usado. Pídele a un miembro un enlace nuevo.</p>
              </div>
            </>
          ) : joined ? (
            <>
              <GroupAvatar icon={group.icon} color={group.color} size="lg" />
              <span className="grid h-12 w-12 place-items-center rounded-gt-pill border-2 border-gt-positive bg-gt-positive-bg">
                <PixelIcon name="scan-success" size={30} />
              </span>
              <div>
                <h2 className="font-gt-display text-gt-xl font-extrabold text-gt-ink">¡Te uniste a {group.name}!</h2>
                <p className="pt-gt-2 text-gt-sm font-medium text-gt-ink-2">Ahora compartes gastos con {group.members.length + 1} personas.</p>
              </div>
            </>
          ) : (
            <>
              <GroupAvatar icon={group.icon} color={group.color} size="lg" />
              <div>
                <p className="text-gt-sm font-bold text-gt-ink-3">
                  <span className="font-extrabold text-gt-ink">{inviterName}</span> te invitó a unirte a
                </p>
                <h2 className="pt-gt-1 font-gt-display text-gt-2xl font-extrabold text-gt-ink">{group.name}</h2>
              </div>
              <div className="flex flex-col items-center gap-gt-4">
                <MemberCluster members={group.members} max={5} />
                <span className="text-gt-xs font-bold text-gt-ink-3">{group.members.length} miembros</span>
              </div>
              <p className="text-gt-sm font-medium text-gt-ink-2">
                Al unirte, podrás compartir tus gastos y ver los totales del grupo. Tú decides qué compartir.
              </p>
            </>
          )}
        </div>
      </div>

      {/* footer */}
      <div className="shrink-0 border-t-2 border-gt-line bg-gt-surface px-gt-16 py-gt-12">
        <div className="mx-auto w-full max-w-xs">
          {expired ? (
            <Button variant="secondary" fullWidth onClick={onClose}>Volver</Button>
          ) : joined ? (
            <Button variant="primary" fullWidth onClick={onViewGroup}>Ver grupo</Button>
          ) : (
            <Button variant="primary" fullWidth onClick={() => { setJoined(true); onJoin?.(); }}>
              <PixelIcon name="action-split" size={20} /> Unirme al grupo
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
