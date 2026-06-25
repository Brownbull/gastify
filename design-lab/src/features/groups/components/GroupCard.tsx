import { GroupAvatar } from "@design-system/atoms/GroupAvatar";
import { Badge } from "@design-system/atoms/Badge";
import { MemberCluster } from "./MemberCluster";
import { ROLE_LABEL, ROLE_TONE, type Group } from "../model/groupFixtures";
import { clp } from "@lib/transactionFixtures";

/**
 * GroupCard — one row of the Grupos hub: the group's emoji avatar, name + the
 * viewer's role badge, an overlapping member cluster, and the period shared
 * total. The whole card taps into the group detail.
 */
export function GroupCard({ group, onOpen }: { group: Group; onOpen?: (group: Group) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen?.(group)}
      className="flex w-full items-center gap-gt-12 rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface px-gt-12 py-gt-12 text-left shadow-gt-sm transition duration-150 ease-gt-bounce hover:-translate-y-0.5 hover:shadow-gt-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gt-primary/30"
    >
      <GroupAvatar icon={group.icon} color={group.color} size="lg" />
      <span className="flex min-w-0 flex-1 flex-col gap-gt-6">
        <span className="flex items-center gap-gt-6">
          <span className="min-w-0 truncate font-gt-display text-gt-lg font-extrabold text-gt-ink">{group.name}</span>
          <Badge tone={ROLE_TONE[group.role]} className="shrink-0">{ROLE_LABEL[group.role]}</Badge>
        </span>
        <MemberCluster members={group.members} />
        <span className="text-gt-xs font-bold text-gt-ink-3">
          {group.members.length} miembros · <span className="font-extrabold text-gt-primary">{clp(group.sharedTotal)}</span> compartido
        </span>
      </span>
      <span aria-hidden="true" className="grid shrink-0 place-items-center text-gt-ink-3">
        <span className="h-2.5 w-2.5 rotate-45 border-r-2 border-t-2 border-current" />
      </span>
    </button>
  );
}
