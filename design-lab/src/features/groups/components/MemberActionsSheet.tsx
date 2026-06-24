import { useState } from "react";
import { Modal } from "@design-system/atoms/Modal";
import { Button } from "@design-system/atoms/Button";
import { Badge } from "@design-system/atoms/Badge";
import { MemberAvatar } from "@design-system/atoms/MemberAvatar";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { ROLE_LABEL, ROLE_TONE, type GroupMember } from "../model/groupFixtures";

/**
 * MemberActionsSheet — tap a member (when you can manage) → promote/demote admin
 * (owner-only, per backend) and remove from the group (two-step confirm). The
 * owner and yourself are never targets. Backend: PATCH /members/:id role +
 * DELETE /members/:id.
 */
export function MemberActionsSheet({
  member,
  canPromote,
  onClose,
  onToggleAdmin,
  onRemove,
}: {
  member: GroupMember | null;
  /** owner viewing a non-owner — may change admin status. */
  canPromote: boolean;
  onClose: () => void;
  onToggleAdmin: () => void;
  onRemove: () => void;
}) {
  const [confirmRemove, setConfirmRemove] = useState(false);
  const close = () => { setConfirmRemove(false); onClose(); };

  return (
    <Modal open={member != null} onClose={close} title="Miembro">
      {member ? (
        <div className="flex flex-col gap-gt-12">
          <div className="flex items-center gap-gt-12">
            <MemberAvatar name={member.displayName} color={member.color} size="md" />
            <span className="flex min-w-0 flex-1 flex-col gap-gt-1">
              <span className="truncate font-gt-display text-gt-md font-extrabold text-gt-ink">{member.displayName}</span>
              <span className="text-gt-xs font-bold text-gt-ink-2">{member.sharesDetail ? "Comparte el detalle" : "Solo totales"}</span>
            </span>
            <Badge tone={ROLE_TONE[member.role]} className="shrink-0">{ROLE_LABEL[member.role]}</Badge>
          </div>

          {confirmRemove ? (
            <div className="flex flex-col gap-gt-8 rounded-gt-xl border-2 border-gt-negative/40 bg-gt-negative/10 p-gt-12">
              <p className="text-gt-sm font-medium text-gt-ink-2">
                <span className="font-extrabold text-gt-ink">{member.displayName}</span> dejará de ver el grupo. Lo que compartió se conserva en los totales.
              </p>
              <div className="flex justify-end gap-gt-8">
                <Button variant="ghost" size="sm" onClick={() => setConfirmRemove(false)}>Cancelar</Button>
                <Button variant="danger" size="sm" onClick={() => { onRemove(); close(); }}>Eliminar</Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-gt-8">
              {canPromote ? (
                <Button variant="secondary" fullWidth onClick={onToggleAdmin}>
                  <PixelIcon name={member.role === "admin" ? "nav-profile" : "settings-sliders"} size={20} />
                  {member.role === "admin" ? "Quitar administrador" : "Hacer administrador"}
                </Button>
              ) : null}
              <Button variant="danger" fullWidth onClick={() => setConfirmRemove(true)}>
                <PixelIcon name="action-delete" size={20} /> Eliminar del grupo
              </Button>
            </div>
          )}
        </div>
      ) : null}
    </Modal>
  );
}
