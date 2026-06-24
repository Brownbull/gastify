import { useState } from "react";
import { AppHeader } from "@design-system/organisms/Nav";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { Button } from "@design-system/atoms/Button";
import { Badge } from "@design-system/atoms/Badge";
import { GroupAvatar } from "@design-system/atoms/GroupAvatar";
import { MemberAvatar } from "@design-system/atoms/MemberAvatar";
import { CompactRow, CompactRowList } from "@design-system/molecules/CompactRowList";
import { ThumbnailBadge } from "@design-system/molecules/ThumbnailBadge";
import { InviteSheet } from "../components/InviteSheet";
import { ROLE_LABEL, ROLE_TONE, type Group, type GroupMember } from "../model/groupFixtures";
import { clp } from "@lib/transactionFixtures";

/**
 * GroupDetailScreen — a group's shared dashboard: identity + the period shared
 * total, the two primary actions (share an expense / invite), the member roster
 * with roles + 5e consent state, and the feed of consent-visible shared
 * transactions. Grounded on backend GroupDetail + GroupTransactionRow.
 */
export interface GroupDetailScreenProps {
  group: Group;
  onBack?: () => void;
  /** "Compartir gasto" — share a personal transaction into the group (host-owned flow). */
  onShare?: () => void;
  platform?: "mobile" | "tablet" | "desktop";
}

function MemberRow({ member, visibilityEnabled }: { member: GroupMember; visibilityEnabled: boolean }) {
  // 5e: a member's detail is exposed only if the GROUP gate is on AND they opted in.
  const sharesNow = visibilityEnabled && member.sharesDetail;
  return (
    <div className={`flex items-center gap-gt-10 px-gt-12 py-gt-10 ${member.isYou ? "border-l-4 border-gt-primary" : ""}`}>
      <MemberAvatar name={member.displayName} color={member.color} size="md" />
      <span className="flex min-w-0 flex-1 flex-col gap-gt-1">
        <span className="truncate font-gt-display text-gt-md font-extrabold text-gt-ink">{member.displayName}</span>
        <span className="text-gt-xs font-bold text-gt-ink-2">{sharesNow ? "Comparte el detalle" : "Solo totales"}</span>
      </span>
      <Badge tone={ROLE_TONE[member.role]} className="shrink-0">{ROLE_LABEL[member.role]}</Badge>
    </div>
  );
}

export function GroupDetailScreen({ group, onBack, onShare, platform = "mobile" }: GroupDetailScreenProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const contentMax = platform === "desktop" ? "42rem" : undefined;
  // 5e consent gate: itemize a shared txn only when the group exposes member
  // detail (or it's your own). Others' detail rolls up into a "solo totales" row.
  const itemized = group.memberVisibilityEnabled ? group.sharedTxns : group.sharedTxns.filter((t) => t.isOwn);
  const hidden = group.memberVisibilityEnabled ? [] : group.sharedTxns.filter((t) => !t.isOwn);
  const hiddenTotal = hidden.reduce((s, t) => s + t.total, 0);
  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-gt-bg">
      <AppHeader variant="detail" title={group.name} onBack={onBack} />
      <div className="min-h-0 flex-1 overflow-y-auto px-gt-16 pb-gt-16">
        <div className="mx-auto flex w-full flex-col gap-gt-16 pt-gt-12" style={{ maxWidth: contentMax }}>
          {/* identity + period shared total */}
          <section className="flex flex-col items-center gap-gt-8 rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface px-gt-16 py-gt-16 shadow-gt-sm">
            <GroupAvatar icon={group.icon} color={group.color} size="lg" />
            <div className="text-center">
              <h2 className="font-gt-display text-gt-xl font-extrabold text-gt-ink">{group.name}</h2>
              <p className="text-gt-sm font-bold text-gt-ink-3">
                {group.members.length} miembros · Tu rol: {ROLE_LABEL[group.role]}
              </p>
            </div>
            <div className="mt-gt-2 w-full rounded-gt-xl border-2 border-gt-line bg-gt-bg-3 px-gt-12 py-gt-10 text-center">
              <p className="font-gt-display text-gt-xs font-extrabold uppercase tracking-wide text-gt-ink-3">Compartido este mes</p>
              <p className="font-gt-display text-gt-3xl font-extrabold text-gt-primary">{clp(group.sharedTotal)}</p>
            </div>
          </section>

          {/* primary actions */}
          <div className="grid grid-cols-2 gap-gt-8">
            <Button variant="primary" onClick={onShare}>
              <PixelIcon name="action-split" size={20} /> Compartir gasto
            </Button>
            <Button variant="secondary" onClick={() => setInviteOpen(true)}>
              <PixelIcon name="nav-profile" size={20} /> Invitar
            </Button>
          </div>

          {/* members */}
          <section className="flex flex-col gap-gt-6">
            <p className="px-gt-4 font-gt-display text-gt-sm font-extrabold uppercase tracking-wide text-gt-ink-3">Miembros · {group.members.length}</p>
            <div className="flex flex-col divide-y-2 divide-gt-line overflow-hidden rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface shadow-gt-sm">
              {group.members.map((m) => (
                <MemberRow key={m.userId} member={m} visibilityEnabled={group.memberVisibilityEnabled} />
              ))}
            </div>
          </section>

          {/* shared transactions feed */}
          <section className="flex flex-col gap-gt-6">
            <p className="px-gt-4 font-gt-display text-gt-sm font-extrabold uppercase tracking-wide text-gt-ink-3">Movimientos compartidos</p>
            <CompactRowList>
              {itemized.map((t) => (
                <CompactRow
                  key={t.id}
                  leading={<ThumbnailBadge icon={t.storeIcon} category={t.category} />}
                  title={t.merchant}
                  meta={
                    <span className="flex items-center gap-gt-4 text-gt-xs font-medium text-gt-ink-2">
                      <PixelIcon name="chart-calendar" size={14} />
                      {t.date} · compartido por <span className="font-extrabold text-gt-ink-2">{t.isOwn ? "ti" : t.sharedByName}</span>
                    </span>
                  }
                  trailing={<span className="font-gt-display text-gt-md font-extrabold text-gt-ink">{clp(t.total)}</span>}
                />
              ))}
              {hidden.length > 0 ? (
                <CompactRow
                  leading={
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-gt-lg border-2 border-dashed border-gt-line bg-gt-bg-3">
                      <PixelIcon name="shield-finance" size={22} />
                    </span>
                  }
                  title={`${hidden.length} movimientos de otros miembros`}
                  meta={<span className="text-gt-xs font-medium text-gt-ink-3">Solo totales · detalle privado</span>}
                  trailing={<span className="font-gt-display text-gt-md font-extrabold text-gt-ink-2">{clp(hiddenTotal)}</span>}
                />
              ) : null}
            </CompactRowList>
          </section>
        </div>
      </div>

      <InviteSheet open={inviteOpen} onClose={() => setInviteOpen(false)} group={group} />
    </div>
  );
}
