import { Modal } from "@design-system/atoms/Modal";
import { Button } from "@design-system/atoms/Button";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { GroupAvatar } from "@design-system/atoms/GroupAvatar";
import type { Group } from "../model/groupFixtures";

/**
 * InviteSheet — bottom-sheet that surfaces a group's shareable invite link
 * (backend InviteResponse: token + 7-day expiry). Copy-to-share is the action;
 * the token here is a static mock.
 */
export interface InviteSheetProps {
  open: boolean;
  onClose: () => void;
  group: Group;
}

export function InviteSheet({ open, onClose, group }: InviteSheetProps) {
  const link = `gastify.app/unirse/${group.id.replace(/^g-/, "")}-x7Qk2`;
  return (
    <Modal
      open={open}
      onClose={onClose}
      placement="sheet"
      title="Invitar al grupo"
      footer={
        <Button variant="primary" fullWidth onClick={onClose}>
          <PixelIcon name="action-duplicate" size={20} /> Copiar enlace
        </Button>
      }
    >
      <div className="flex flex-col gap-gt-12">
        <div className="flex items-center gap-gt-12">
          <GroupAvatar icon={group.icon} color={group.color} size="lg" />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-gt-display text-gt-lg font-extrabold text-gt-ink">{group.name}</span>
            <span className="text-gt-xs font-bold text-gt-ink-3">{group.members.length} miembros</span>
          </span>
        </div>
        <p className="text-gt-sm font-medium text-gt-ink-2">
          Comparte este enlace para que se unan al grupo. Expira en 7 días.
        </p>
        <div className="rounded-gt-xl border-2 border-gt-line-strong bg-gt-bg-3 px-gt-12 py-gt-10">
          <span className="block truncate font-gt-display text-gt-sm font-extrabold text-gt-primary">{link}</span>
        </div>
      </div>
    </Modal>
  );
}
