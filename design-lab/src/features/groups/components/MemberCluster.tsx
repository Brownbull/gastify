import { MemberAvatar } from "@design-system/atoms/MemberAvatar";
import type { GroupMember } from "../model/groupFixtures";

/**
 * MemberCluster — overlapping member avatars (sm) with a "+N" overflow chip.
 * A compact at-a-glance roster for the group hub cards.
 */
export function MemberCluster({ members, max = 4 }: { members: GroupMember[]; max?: number }) {
  const shown = members.slice(0, max);
  const extra = members.length - shown.length;
  return (
    <div className="flex items-center">
      {shown.map((m, i) => (
        <MemberAvatar key={m.userId} name={m.displayName} color={m.color} size="sm" ring className={i > 0 ? "-ml-2" : ""} />
      ))}
      {extra > 0 ? (
        <span
          className="-ml-2 grid h-7 w-7 place-items-center rounded-gt-pill border-2 border-gt-line-strong bg-gt-bg-3 font-gt-display font-extrabold leading-none text-gt-ink ring-2 ring-gt-surface"
          style={{ fontSize: 11 }}
        >
          +{extra}
        </span>
      ) : null}
    </div>
  );
}
