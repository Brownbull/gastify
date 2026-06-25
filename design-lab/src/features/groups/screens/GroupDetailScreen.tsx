import { useState } from "react";
import { AppHeader } from "@design-system/organisms/Nav";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { Button } from "@design-system/atoms/Button";
import { Badge } from "@design-system/atoms/Badge";
import { Switch } from "@design-system/atoms/Switch";
import { GroupAvatar } from "@design-system/atoms/GroupAvatar";
import { MemberAvatar } from "@design-system/atoms/MemberAvatar";
import { LogOutIcon } from "@design-system/assets/icons";
import { CompactRow, CompactRowList } from "@design-system/molecules/CompactRowList";
import { ThumbnailBadge } from "@design-system/molecules/ThumbnailBadge";
import { InviteSheet } from "../components/InviteSheet";
import { MemberActionsSheet } from "../components/MemberActionsSheet";
import { ShareTransactionsScreen } from "./ShareTransactionsScreen";
import { type ShareableTxn } from "../model/shareFixtures";
import { LeaveGroupDialog, DeleteGroupDialog } from "../components/GroupLeaveDeleteDialogs";
import { ROLE_LABEL, ROLE_TONE, type Group, type GroupMember, type GroupRole } from "../model/groupFixtures";
import { clp } from "@lib/transactionFixtures";

/**
 * GroupDetailScreen — a group's shared dashboard: identity + the period shared
 * total, the two primary actions (share an expense / invite), the member roster
 * (tap to manage when you're owner/admin), the group config (visibility + your
 * consent), the consent-visible shared feed, and leave / delete. Grounded on
 * backend GroupDetail + the member/visibility/consent/leave/delete endpoints.
 */
export interface GroupDetailScreenProps {
  group: Group;
  onBack?: () => void;
  /** "Compartir gasto" — share a personal transaction into the group (host-owned flow). */
  onShare?: () => void;
  /** left the group (host removes it + closes the detail). */
  onLeave?: (deleteShared: boolean) => void;
  /** deleted the group (owner; host removes it + closes the detail). */
  onDelete?: () => void;
  platform?: "mobile" | "tablet" | "desktop";
}

function MemberRow({ member, visibilityEnabled, onManage }: { member: GroupMember; visibilityEnabled: boolean; onManage?: () => void }) {
  // 5e: a member's detail is exposed only if the GROUP gate is on AND they opted in.
  const sharesNow = visibilityEnabled && member.sharesDetail;
  const rowClass = `flex w-full items-center gap-gt-10 px-gt-12 py-gt-10 text-left ${member.isYou ? "border-l-4 border-gt-primary" : ""}`;
  const inner = (
    <>
      <MemberAvatar name={member.displayName} color={member.color} size="md" />
      <span className="flex min-w-0 flex-1 flex-col gap-gt-2">
        <span className="truncate font-gt-display text-gt-md font-extrabold text-gt-ink">{member.displayName}</span>
        <span className="text-gt-xs font-bold text-gt-ink-2">{sharesNow ? "Comparte el detalle" : "Solo totales"}</span>
      </span>
      <Badge tone={ROLE_TONE[member.role]} className="shrink-0">{ROLE_LABEL[member.role]}</Badge>
      {onManage ? <span aria-hidden="true" className="ml-gt-2 h-2.5 w-2.5 shrink-0 -rotate-45 border-b-2 border-r-2 border-gt-ink-3" /> : null}
    </>
  );
  return onManage ? (
    <button type="button" onClick={onManage} className={`${rowClass} transition hover:bg-gt-bg-3`} aria-label={`Administrar ${member.displayName}`}>{inner}</button>
  ) : (
    <div className={rowClass}>{inner}</div>
  );
}

export function GroupDetailScreen({ group, onBack, onShare, onLeave, onDelete, platform = "mobile" }: GroupDetailScreenProps) {
  const [g, setG] = useState(group);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [actionMember, setActionMember] = useState<GroupMember | null>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const isOwner = g.role === "owner";
  const canManageMembers = g.role === "owner" || g.role === "admin";
  const me = g.members.find((m) => m.isYou);
  // you can open a member's actions if you manage AND they're not you / not the owner.
  const canManage = (m: GroupMember) => canManageMembers && !m.isYou && m.role !== "owner";
  // only the owner changes admin status (backend: owner-only role changes).
  const canPromote = (m: GroupMember) => isOwner && !m.isYou && m.role !== "owner";

  const setRole = (userId: string, role: GroupRole) => setG((p) => ({ ...p, members: p.members.map((m) => (m.userId === userId ? { ...m, role } : m)) }));
  const removeMember = (userId: string) => setG((p) => ({ ...p, members: p.members.filter((m) => m.userId !== userId) }));
  const setVisibility = (v: boolean) => setG((p) => ({ ...p, memberVisibilityEnabled: v }));
  const setMyConsent = (v: boolean) => setG((p) => ({ ...p, members: p.members.map((m) => (m.isYou ? { ...m, sharesDetail: v } : m)) }));
  // share a personal transaction into the group → prepend it to the feed as yours.
  // a confirmed batch share from the full-page screen → prepend to the feed as yours.
  const shareTxns = (shared: ShareableTxn[]) => {
    if (shared.length === 0) return;
    setG((p) => ({
      ...p,
      sharedTotal: p.sharedTotal + shared.reduce((s, t) => s + t.total, 0),
      sharedTxns: [
        ...shared.map((t, i) => ({ id: `shared-${t.id}-${p.sharedTxns.length + i}`, date: t.date, merchant: t.merchant, total: t.total, currency: "CLP", sharedByName: "Tú", isOwn: true, category: t.category, storeIcon: t.storeIcon })),
        ...p.sharedTxns,
      ],
    }));
    onShare?.();
  };

  const contentMax = platform === "desktop" ? "42rem" : undefined;
  // 5e consent gate: itemize a shared txn only when the group exposes member
  // detail (or it's your own). Others' detail rolls up into a "solo totales" row.
  const itemized = g.memberVisibilityEnabled ? g.sharedTxns : g.sharedTxns.filter((t) => t.isOwn);
  const hidden = g.memberVisibilityEnabled ? [] : g.sharedTxns.filter((t) => !t.isOwn);
  const hiddenTotal = hidden.reduce((s, t) => s + t.total, 0);

  // "Compartir gasto" opens the full-page share flow (replaces this detail).
  if (shareOpen) {
    return <ShareTransactionsScreen groupName={g.name} platform={platform} onBack={() => setShareOpen(false)} onShared={shareTxns} />;
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-gt-bg">
      <AppHeader variant="detail" title={g.name} onBack={onBack} />
      <div className="min-h-0 flex-1 overflow-y-auto px-gt-16 pb-gt-16">
        <div className="mx-auto flex w-full flex-col gap-gt-16 pt-gt-12" style={{ maxWidth: contentMax }}>
          {/* identity + period shared total */}
          <section className="flex flex-col items-center gap-gt-8 rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface px-gt-16 py-gt-16 shadow-gt-sm">
            <GroupAvatar icon={g.icon} color={g.color} size="lg" />
            <div className="text-center">
              <h2 className="font-gt-display text-gt-xl font-extrabold text-gt-ink">{g.name}</h2>
              <p className="text-gt-sm font-bold text-gt-ink-3">
                {g.members.length} miembros · Tu rol: {ROLE_LABEL[g.role]}
              </p>
            </div>
            <div className="mt-gt-2 w-full rounded-gt-xl border-2 border-gt-line bg-gt-bg-3 px-gt-12 py-gt-10 text-center">
              <p className="font-gt-display text-gt-xs font-extrabold uppercase tracking-wide text-gt-ink-3">Compartido este mes</p>
              <p className="font-gt-display text-gt-3xl font-extrabold text-gt-primary">{clp(g.sharedTotal)}</p>
            </div>
          </section>

          {/* primary actions */}
          <div className="grid grid-cols-2 gap-gt-8">
            <Button variant="primary" onClick={() => setShareOpen(true)}>
              <PixelIcon name="action-split" size={20} /> Compartir gasto
            </Button>
            <Button variant="secondary" onClick={() => setInviteOpen(true)}>
              <PixelIcon name="nav-profile" size={20} /> Invitar
            </Button>
          </div>

          {/* members */}
          <section className="flex flex-col gap-gt-6">
            <p className="px-gt-4 font-gt-display text-gt-sm font-extrabold uppercase tracking-wide text-gt-ink-3">Miembros · {g.members.length}</p>
            <div className="flex flex-col divide-y-2 divide-gt-line overflow-hidden rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface shadow-gt-sm">
              {g.members.map((m) => (
                <MemberRow key={m.userId} member={m} visibilityEnabled={g.memberVisibilityEnabled} onManage={canManage(m) ? () => setActionMember(m) : undefined} />
              ))}
            </div>
          </section>

          {/* group config — visibility (owner/admin) + your own consent */}
          <section className="flex flex-col gap-gt-6">
            <p className="px-gt-4 font-gt-display text-gt-sm font-extrabold uppercase tracking-wide text-gt-ink-3">Configuración</p>
            <div className="flex flex-col divide-y-2 divide-gt-line overflow-hidden rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface shadow-gt-sm">
              {canManageMembers ? (
                <div className="flex items-center gap-gt-10 px-gt-12 py-gt-10">
                  <PixelIcon name="shield-finance" size={28} className="shrink-0" />
                  <span className="flex min-w-0 flex-1 flex-col gap-gt-2">
                    <span className="font-gt-display text-gt-md font-extrabold text-gt-ink">Mostrar gastos individuales</span>
                    <span className="text-gt-xs font-medium text-gt-ink-3">Los miembros ven el detalle de cada uno, no solo los totales.</span>
                  </span>
                  <Switch checked={g.memberVisibilityEnabled} onChange={setVisibility} label="Mostrar gastos individuales" />
                </div>
              ) : null}
              {me ? (
                <div className="flex items-center gap-gt-10 px-gt-12 py-gt-10">
                  <MemberAvatar name={me.displayName} color={me.color} size="md" />
                  <span className="flex min-w-0 flex-1 flex-col gap-gt-2">
                    <span className="font-gt-display text-gt-md font-extrabold text-gt-ink">Compartir el detalle de mis gastos</span>
                    <span className="text-gt-xs font-medium text-gt-ink-3">{g.memberVisibilityEnabled ? "Otros ven tus ítems, no solo el total." : "Se aplicará si el grupo muestra gastos individuales."}</span>
                  </span>
                  <Switch checked={me.sharesDetail} onChange={setMyConsent} label="Compartir el detalle de mis gastos" />
                </div>
              ) : null}
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

          {/* leave / delete */}
          <section className="pt-gt-2">
            {isOwner ? (
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                className="flex w-full items-center justify-center gap-gt-6 rounded-gt-xl border-2 border-gt-negative/40 bg-gt-negative/10 px-gt-12 py-gt-10 font-gt-display text-gt-md font-extrabold text-gt-negative transition hover:-translate-y-0.5"
              >
                <PixelIcon name="action-delete" size={20} /> Eliminar grupo
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setLeaveOpen(true)}
                className="flex w-full items-center justify-center gap-gt-6 rounded-gt-xl border-2 border-gt-negative/40 bg-gt-negative/10 px-gt-12 py-gt-10 font-gt-display text-gt-md font-extrabold text-gt-negative transition hover:-translate-y-0.5"
              >
                <LogOutIcon className="h-5 w-5" /> Salir del grupo
              </button>
            )}
          </section>
        </div>
      </div>

      <InviteSheet open={inviteOpen} onClose={() => setInviteOpen(false)} group={g} />
      <MemberActionsSheet
        member={actionMember}
        canPromote={actionMember ? canPromote(actionMember) : false}
        onClose={() => setActionMember(null)}
        onToggleAdmin={() => { if (actionMember) { setRole(actionMember.userId, actionMember.role === "admin" ? "member" : "admin"); setActionMember(null); } }}
        onRemove={() => { if (actionMember) removeMember(actionMember.userId); }}
      />
      <LeaveGroupDialog open={leaveOpen} groupName={g.name} onClose={() => setLeaveOpen(false)} onLeave={(d) => onLeave?.(d)} />
      <DeleteGroupDialog open={deleteOpen} groupName={g.name} onClose={() => setDeleteOpen(false)} onDelete={() => onDelete?.()} />
    </div>
  );
}
