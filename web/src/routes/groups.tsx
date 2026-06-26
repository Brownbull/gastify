import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  useCreateGroup,
  useCreateInvite,
  useDeleteGroup,
  useGroup,
  useGroups,
  useGroupTransactions,
  useLeaveGroup,
  useRemoveMember,
  useSetGroupConsent,
  useSetGroupIcon,
  useSetGroupVisibility,
  useUpdateMemberRole,
  type GroupDetail,
  type GroupSummary,
} from "@/hooks/useGroups";
import {
  GROUP_COLOR_CHOICES,
  GROUP_ICON_CHOICES,
  GroupAvatar,
} from "@/components/GroupAvatar";
import { useI18n } from "@/hooks/useI18n";
import { useUiStore } from "@/stores/uiStore";
import { formatMinorAmount } from "@/lib/format";

export const Route = createFileRoute("/groups")({
  component: GroupsPage,
});

/** Role → i18n key (typed, so `t()` keeps its literal-key checking). */
const ROLE_KEYS = {
  owner: "group.role.owner",
  admin: "group.role.admin",
  member: "group.role.member",
} as const;

const inputClass =
  "rounded-gt-lg border-2 border-gt-line bg-gt-surface px-gt-10 py-gt-8 text-gt-sm font-bold text-gt-ink focus-visible:outline-none focus-visible:border-gt-line-strong";
const primaryBtn =
  "rounded-gt-lg border-2 border-gt-line-strong bg-gt-primary px-gt-12 py-gt-8 font-gt-display text-gt-sm font-extrabold text-white shadow-gt-xs transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-50";

function GroupsPage() {
  const { t } = useI18n();
  const { data: groups, isError } = useGroups();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-3xl space-y-gt-16">
      <header>
        <h1 className="font-gt-display text-gt-4xl font-extrabold text-gt-ink">{t("group.title")}</h1>
        <p className="mt-gt-2 text-gt-sm font-medium text-gt-ink-2">{t("group.subtitle")}</p>
      </header>

      <CreateGroupForm />

      {isError && <p className="text-gt-sm font-bold text-gt-error">{t("group.loadError")}</p>}

      {groups && groups.length === 0 && (
        <p className="text-gt-sm font-medium text-gt-ink-3">{t("group.empty")}</p>
      )}

      <ul className="space-y-gt-10">
        {groups?.map((group) => (
          <li key={group.id}>
            <GroupCard
              group={group}
              expanded={selectedId === group.id}
              onToggle={() => setSelectedId((id) => (id === group.id ? null : group.id))}
            />
            {selectedId === group.id && <GroupDetailPanel groupId={group.id} />}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CreateGroupForm() {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const createGroup = useCreateGroup();

  return (
    <div className="space-y-gt-2">
      <form
        data-testid="create-group-form"
        onSubmit={(event) => {
          event.preventDefault();
          const trimmed = name.trim();
          if (!trimmed) return;
          createGroup.mutate(trimmed, { onSuccess: () => setName("") });
        }}
        className="flex gap-gt-8 rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface p-gt-12 shadow-gt-sm"
      >
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t("group.namePlaceholder")}
          aria-label={t("group.namePlaceholder")}
          maxLength={60}
          className={`${inputClass} flex-1`}
        />
        <button type="submit" disabled={createGroup.isPending || !name.trim()} className={primaryBtn}>
          {t("group.create")}
        </button>
      </form>
      {createGroup.isError && (
        <p className="px-gt-2 text-gt-sm font-bold text-gt-error" role="alert" data-testid="create-group-error">
          {t("group.createError")}
        </p>
      )}
    </div>
  );
}

function GroupCard({
  group,
  expanded,
  onToggle,
}: {
  group: GroupSummary;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const setActiveScope = useUiStore((s) => s.setActiveScope);

  return (
    <div className="flex items-center justify-between gap-gt-10 rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface p-gt-12 shadow-gt-sm">
      <div className="flex min-w-0 items-center gap-gt-10">
        <GroupAvatar icon={group.icon} color={group.color} size={44} />
        <div className="min-w-0">
          <p className="truncate font-gt-display text-gt-md font-extrabold text-gt-ink">{group.name}</p>
          <p className="text-gt-xs font-bold text-gt-ink-3">
            {group.member_count} {t("group.members")} · {t(ROLE_KEYS[group.role])}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 gap-gt-6">
        <button
          type="button"
          onClick={() => {
            setActiveScope({ kind: "group", id: group.id, name: group.name });
            void navigate({ to: "/" });
          }}
          className="rounded-gt-lg border-2 border-gt-line-strong bg-gt-primary-soft px-gt-10 py-gt-6 text-gt-xs font-extrabold text-gt-primary shadow-gt-xs transition hover:-translate-y-0.5"
        >
          {t("group.viewDashboard")}
        </button>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="rounded-gt-lg border-2 border-gt-line-strong bg-gt-surface px-gt-10 py-gt-6 text-gt-xs font-extrabold text-gt-ink-2 shadow-gt-xs transition hover:bg-gt-bg-3"
        >
          {t("group.membersTitle")}
        </button>
      </div>
    </div>
  );
}

function GroupDetailPanel({ groupId }: { groupId: string }) {
  const { t } = useI18n();
  const { data: detail, isLoading, isError } = useGroup(groupId);
  if (isLoading) {
    return <p className="mt-gt-4 px-gt-2 text-gt-sm font-medium text-gt-ink-3">…</p>;
  }
  if (isError) {
    return (
      <p
        className="mt-gt-4 px-gt-2 text-gt-sm font-bold text-gt-error"
        role="alert"
        data-testid="group-detail-error"
      >
        {t("group.loadError")}
      </p>
    );
  }
  if (!detail) return null;
  const canManage = detail.role === "owner" || detail.role === "admin";

  return (
    <div className="mt-gt-4 space-y-gt-12 rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface p-gt-16 shadow-gt-md">
      {canManage && <AvatarSection detail={detail} groupId={groupId} />}
      {canManage && <InviteSection groupId={groupId} />}
      <MemberRoster detail={detail} groupId={groupId} />
      {canManage && <VisibilitySection detail={detail} groupId={groupId} />}
      {detail.member_visibility_enabled && <ConsentControl detail={detail} groupId={groupId} />}
      <GroupTransactionsSection groupId={groupId} />
      <GroupActions detail={detail} groupId={groupId} />
    </div>
  );
}

// D75: owner/admin sets the group avatar (emoji icon + accent color). The change
// propagates to every member because the avatar lives on the shared group row.
function AvatarSection({ detail, groupId }: { detail: GroupDetail; groupId: string }) {
  const { t } = useI18n();
  const setIcon = useSetGroupIcon(groupId);
  const [icon, setIcon_] = useState<string | null>(detail.icon ?? null);
  const [color, setColor] = useState<string | null>(detail.color ?? null);
  const dirty = icon !== (detail.icon ?? null) || color !== (detail.color ?? null);

  return (
    <div className="space-y-gt-8" data-testid="group-avatar-section">
      <div className="flex items-center gap-gt-10">
        <GroupAvatar icon={icon} color={color} size={40} />
        <h3 className="font-gt-display text-gt-sm font-extrabold text-gt-ink">{t("group.avatarTitle")}</h3>
      </div>
      <div className="flex flex-wrap gap-gt-4">
        {GROUP_ICON_CHOICES.map((choice) => (
          <button
            key={choice}
            type="button"
            data-testid={`group-icon-choice-${choice}`}
            aria-pressed={icon === choice}
            onClick={() => setIcon_(choice)}
            className={`rounded-gt-lg border-2 px-gt-6 py-gt-2 text-gt-lg transition ${
              icon === choice ? "border-gt-line-strong bg-gt-primary-soft" : "border-gt-line bg-gt-surface hover:border-gt-line-strong"
            }`}
          >
            {choice}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-gt-6">
        {GROUP_COLOR_CHOICES.map((choice) => (
          <button
            key={choice}
            type="button"
            data-testid={`group-color-choice-${choice}`}
            aria-pressed={color === choice}
            aria-label={choice}
            onClick={() => setColor(choice)}
            className="h-7 w-7 rounded-gt-pill border-2 border-gt-line-strong shadow-gt-xs"
            style={{
              backgroundColor: choice,
              outline: color === choice ? "2px solid var(--color-gt-ink)" : "none",
              outlineOffset: "2px",
            }}
          />
        ))}
      </div>
      <button
        type="button"
        data-testid="group-avatar-save"
        disabled={!dirty || setIcon.isPending}
        onClick={() => setIcon.mutate({ icon, color })}
        className={primaryBtn}
      >
        {t("group.avatarSave")}
      </button>
      {setIcon.isError && (
        <p className="text-gt-xs font-bold text-gt-error" role="alert">
          {t("group.avatarError")}
        </p>
      )}
    </div>
  );
}

function InviteSection({ groupId }: { groupId: string }) {
  const { t } = useI18n();
  const createInvite = useCreateInvite(groupId);
  const [copied, setCopied] = useState(false);
  const link = createInvite.data
    ? `${window.location.origin}/invite/${createInvite.data.token}`
    : null;

  return (
    <div className="space-y-gt-8">
      {!link ? (
        <button
          type="button"
          data-testid="generate-invite-button"
          onClick={() => createInvite.mutate()}
          disabled={createInvite.isPending}
          className={primaryBtn}
        >
          {t("group.invite")}
        </button>
      ) : (
        <div className="space-y-gt-2">
          <div className="flex gap-gt-8">
            <input
              readOnly
              value={link}
              data-testid="invite-link"
              aria-label={t("group.invite")}
              className={`${inputClass} flex-1 text-gt-xs text-gt-primary`}
            />
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard?.writeText(link);
                setCopied(true);
              }}
              className="rounded-gt-lg border-2 border-gt-line-strong bg-gt-surface px-gt-10 py-gt-6 text-gt-xs font-extrabold text-gt-ink-2 shadow-gt-xs transition hover:bg-gt-bg-3"
            >
              {copied ? t("group.copied") : t("group.copy")}
            </button>
          </div>
          <p className="text-gt-xs font-medium text-gt-ink-3">{t("group.inviteHint")}</p>
        </div>
      )}
    </div>
  );
}

function MemberRoster({ detail, groupId }: { detail: GroupDetail; groupId: string }) {
  const { t } = useI18n();
  const updateRole = useUpdateMemberRole(groupId);
  const removeMember = useRemoveMember(groupId);
  const isOwner = detail.role === "owner";

  return (
    <div className="space-y-gt-8">
      <h3 className="font-gt-display text-gt-sm font-extrabold uppercase tracking-wide text-gt-ink-3">
        {t("group.membersTitle")}
      </h3>
      <ul className="flex flex-col divide-y-2 divide-gt-line overflow-hidden rounded-gt-xl border-2 border-gt-line">
        {detail.members.map((member) => {
          return (
            <li key={member.user_id} className="flex items-center justify-between gap-gt-8 px-gt-10 py-gt-8 text-gt-sm">
              <span className="truncate font-bold text-gt-ink">
                {member.display_name ?? member.user_id.slice(0, 8)}
                <span
                  className="ml-gt-4 text-gt-xs font-extrabold text-gt-ink-3"
                  data-testid={`member-role-${member.user_id}`}
                >
                  {t(ROLE_KEYS[member.role])}
                </span>
              </span>
              {isOwner && member.role !== "owner" && (
                <span className="flex shrink-0 gap-gt-8 text-gt-xs">
                  <button
                    type="button"
                    data-testid={`member-role-toggle-${member.user_id}`}
                    onClick={() =>
                      updateRole.mutate({
                        memberUserId: member.user_id,
                        role: member.role === "admin" ? "member" : "admin",
                      })
                    }
                    className="font-extrabold text-gt-primary"
                  >
                    {member.role === "admin" ? t("group.removeAdmin") : t("group.makeAdmin")}
                  </button>
                  <button
                    type="button"
                    data-testid={`member-remove-${member.user_id}`}
                    onClick={() => {
                      if (!window.confirm(t("group.confirmRemoveMember"))) return;
                      removeMember.mutate(member.user_id);
                    }}
                    className="font-extrabold text-gt-error"
                  >
                    {t("group.removeMember")}
                  </button>
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function GroupActions({ detail, groupId }: { detail: GroupDetail; groupId: string }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const leaveGroup = useLeaveGroup();
  const deleteGroup = useDeleteGroup();
  const activeScope = useUiStore((s) => s.activeScope);
  const setActiveScope = useUiStore((s) => s.setActiveScope);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);

  function resetScopeIfActive() {
    if (activeScope.kind === "group" && activeScope.id === groupId) {
      setActiveScope({ kind: "personal" });
    }
  }

  function leave(deleteShared: boolean) {
    leaveGroup.mutate(
      { groupId, deleteShared },
      {
        onSuccess: () => {
          setLeaveDialogOpen(false);
          resetScopeIfActive();
        },
      },
    );
  }

  return (
    <div className="flex flex-wrap gap-gt-10 border-t-2 border-gt-line pt-gt-10">
      <button
        type="button"
        data-testid="group-leave-button"
        onClick={() => setLeaveDialogOpen(true)}
        className="text-gt-xs font-extrabold text-gt-ink-2"
      >
        {t("group.leave")}
      </button>
      {leaveDialogOpen && (
        <div
          role="dialog"
          aria-label={t("group.leaveTitle")}
          data-testid="group-leave-dialog"
          className="basis-full space-y-gt-8 rounded-gt-xl border-2 border-gt-line-strong bg-gt-surface p-gt-12 shadow-gt-sm"
        >
          <p className="font-gt-display text-gt-sm font-extrabold text-gt-ink">{t("group.leaveTitle")}</p>
          <div className="flex flex-col gap-gt-6">
            <button
              type="button"
              data-testid="group-leave-keep-button"
              disabled={leaveGroup.isPending}
              onClick={() => leave(false)}
              className="rounded-gt-lg border-2 border-gt-line-strong px-gt-10 py-gt-8 text-left text-gt-xs font-extrabold text-gt-ink transition hover:bg-gt-bg-3 disabled:opacity-50"
            >
              {t("group.leaveKeep")}
            </button>
            <button
              type="button"
              data-testid="group-leave-delete-button"
              disabled={leaveGroup.isPending}
              onClick={() => leave(true)}
              className="rounded-gt-lg border-2 border-gt-error px-gt-10 py-gt-8 text-left text-gt-xs font-extrabold text-gt-error transition hover:bg-gt-error/5 disabled:opacity-50"
            >
              {t("group.leaveDelete")}
            </button>
            <button
              type="button"
              data-testid="group-leave-cancel-button"
              disabled={leaveGroup.isPending}
              onClick={() => setLeaveDialogOpen(false)}
              className="text-left text-gt-xs font-extrabold text-gt-ink-2"
            >
              {t("group.leaveCancel")}
            </button>
          </div>
        </div>
      )}
      {detail.role === "owner" && (
        <button
          type="button"
          data-testid="group-delete-button"
          onClick={() => {
            if (!window.confirm(t("group.confirmDelete"))) return;
            deleteGroup.mutate(groupId, {
              onSuccess: () => {
                resetScopeIfActive();
                void navigate({ to: "/groups" });
              },
            });
          }}
          className="text-gt-xs font-extrabold text-gt-error"
        >
          {t("group.delete")}
        </button>
      )}
      {(leaveGroup.isError || deleteGroup.isError) && (
        <p className="basis-full text-gt-xs font-bold text-gt-error" role="alert" data-testid="group-action-error">
          {leaveGroup.isError ? t("group.leaveError") : t("group.deleteError")}
        </p>
      )}
    </div>
  );
}

// 5e (D73): admin requests that members expose individual transactions.
function VisibilitySection({ detail, groupId }: { detail: GroupDetail; groupId: string }) {
  const { t } = useI18n();
  const setVisibility = useSetGroupVisibility(groupId);
  return (
    <div className="space-y-gt-2 border-t-2 border-gt-line pt-gt-10">
      <label className="flex items-center justify-between gap-gt-10 text-gt-sm">
        <span className="font-bold text-gt-ink-2">{t("group.visibilityLabel")}</span>
        <input
          type="checkbox"
          data-testid="group-visibility-toggle"
          checked={detail.member_visibility_enabled}
          disabled={setVisibility.isPending}
          onChange={(event) => setVisibility.mutate(event.target.checked)}
          className="h-5 w-5 accent-gt-primary"
        />
      </label>
      <p className="text-gt-xs font-medium text-gt-ink-3">{t("group.visibilityHint")}</p>
      {setVisibility.isError && (
        <p className="text-gt-xs font-bold text-gt-error" role="alert">
          {t("group.visibilityError")}
        </p>
      )}
    </div>
  );
}

// 5e (D73): a member opts their own shared transactions in/out of the list.
function ConsentControl({ detail, groupId }: { detail: GroupDetail; groupId: string }) {
  const { t } = useI18n();
  const setConsent = useSetGroupConsent(groupId);
  return (
    <div className="space-y-gt-2">
      <label className="flex items-center justify-between gap-gt-10 text-gt-sm">
        <span className="font-bold text-gt-ink-2">{t("group.consentLabel")}</span>
        <input
          type="checkbox"
          data-testid="group-consent-toggle"
          checked={detail.viewer_shares_detail}
          disabled={setConsent.isPending}
          onChange={(event) => setConsent.mutate(event.target.checked)}
          className="h-5 w-5 accent-gt-primary"
        />
      </label>
      {setConsent.isError && (
        <p className="text-gt-xs font-bold text-gt-error" role="alert">
          {t("group.consentError")}
        </p>
      )}
    </div>
  );
}

// 5e (D73): consent-gated list of the group's shared transactions.
function GroupTransactionsSection({ groupId }: { groupId: string }) {
  const { t } = useI18n();
  const [show, setShow] = useState(false);
  const { data: txns, isLoading, isError } = useGroupTransactions(groupId, show);
  return (
    <div className="space-y-gt-8 border-t-2 border-gt-line pt-gt-10">
      <button
        type="button"
        data-testid="group-transactions-toggle"
        onClick={() => setShow((value) => !value)}
        className="text-gt-xs font-extrabold text-gt-primary"
      >
        {show ? t("group.hideTransactions") : t("group.viewTransactions")}
      </button>
      {show && (
        <div data-testid="group-transactions" className="space-y-gt-2">
          {isLoading && <p className="text-gt-xs font-medium text-gt-ink-3">…</p>}
          {isError && (
            <p className="text-gt-xs font-bold text-gt-error" role="alert">
              {t("group.transactionsError")}
            </p>
          )}
          {txns && txns.length === 0 && (
            <p className="text-gt-xs font-medium text-gt-ink-3" data-testid="group-transactions-empty">
              {t("group.transactionsEmpty")}
            </p>
          )}
          {txns?.map((txn) => (
            <div
              key={txn.id}
              data-testid="group-txn-row"
              className="flex items-center justify-between gap-gt-8 rounded-gt-lg border-2 border-gt-line bg-gt-surface px-gt-10 py-gt-8 text-gt-sm"
            >
              <span className="truncate font-bold text-gt-ink">
                {txn.merchant}
                <span className="ml-gt-4 text-gt-xs font-medium text-gt-ink-3">
                  {txn.is_own ? t("group.youLabel") : txn.shared_by_name}
                </span>
              </span>
              <span className="shrink-0 text-gt-xs font-extrabold tabular-nums text-gt-ink-2">
                {formatMinorAmount(txn.total_minor, txn.currency)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
