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

function GroupsPage() {
  const { t } = useI18n();
  const { data: groups, isError } = useGroups();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          {t("group.title")}
        </h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          {t("group.subtitle")}
        </p>
      </header>

      <CreateGroupForm />

      {isError && (
        <p className="text-sm" style={{ color: "var(--danger, #dc2626)" }}>
          {t("group.loadError")}
        </p>
      )}

      {groups && groups.length === 0 && (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          {t("group.empty")}
        </p>
      )}

      <ul className="space-y-3">
        {groups?.map((group) => (
          <li key={group.id}>
            <GroupCard
              group={group}
              expanded={selectedId === group.id}
              onToggle={() =>
                setSelectedId((id) => (id === group.id ? null : group.id))
              }
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
    <div className="space-y-1">
      <form
        data-testid="create-group-form"
        onSubmit={(event) => {
          event.preventDefault();
          const trimmed = name.trim();
          if (!trimmed) return;
          createGroup.mutate(trimmed, { onSuccess: () => setName("") });
        }}
        className="flex gap-2 rounded-xl border p-3"
        style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}
      >
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t("group.namePlaceholder")}
          aria-label={t("group.namePlaceholder")}
          maxLength={60}
          className="flex-1 rounded-lg border bg-transparent px-3 py-2 text-sm"
          style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
        />
        <button
          type="submit"
          disabled={createGroup.isPending || !name.trim()}
          className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
          style={{ backgroundColor: "var(--primary)", color: "white" }}
        >
          {t("group.create")}
        </button>
      </form>
      {createGroup.isError && (
        <p className="px-1 text-sm" role="alert" data-testid="create-group-error"
           style={{ color: "var(--danger, #dc2626)" }}>
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
    <div
      className="flex items-center justify-between gap-3 rounded-xl border p-4"
      style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}
    >
      <div className="flex min-w-0 items-center gap-3">
        <GroupAvatar icon={group.icon} color={group.color} size={36} />
        <div className="min-w-0">
          <p className="truncate font-semibold" style={{ color: "var(--text-primary)" }}>
            {group.name}
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {group.member_count} {t("group.members")} · {t(ROLE_KEYS[group.role])}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={() => {
            setActiveScope({ kind: "group", id: group.id, name: group.name });
            void navigate({ to: "/" });
          }}
          className="rounded-lg px-3 py-2 text-xs font-medium"
          style={{ backgroundColor: "var(--primary-light)", color: "var(--primary)" }}
        >
          {t("group.viewDashboard")}
        </button>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="rounded-lg border px-3 py-2 text-xs"
          style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
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
    return (
      <p className="mt-2 px-1 text-sm" style={{ color: "var(--text-muted)" }}>
        …
      </p>
    );
  }
  if (isError) {
    return (
      <p
        className="mt-2 px-1 text-sm"
        role="alert"
        data-testid="group-detail-error"
        style={{ color: "var(--danger, #dc2626)" }}
      >
        {t("group.loadError")}
      </p>
    );
  }
  if (!detail) return null;
  const canManage = detail.role === "owner" || detail.role === "admin";

  return (
    <div
      className="mt-2 space-y-4 rounded-xl border p-4"
      style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}
    >
      {canManage && <AvatarSection detail={detail} groupId={groupId} />}
      {canManage && <InviteSection groupId={groupId} />}
      <MemberRoster detail={detail} groupId={groupId} />
      {canManage && <VisibilitySection detail={detail} groupId={groupId} />}
      {detail.member_visibility_enabled && (
        <ConsentControl detail={detail} groupId={groupId} />
      )}
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
    <div className="space-y-2" data-testid="group-avatar-section">
      <div className="flex items-center gap-3">
        <GroupAvatar icon={icon} color={color} size={40} />
        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          {t("group.avatarTitle")}
        </h3>
      </div>
      <div className="flex flex-wrap gap-1">
        {GROUP_ICON_CHOICES.map((choice) => (
          <button
            key={choice}
            type="button"
            data-testid={`group-icon-choice-${choice}`}
            aria-pressed={icon === choice}
            onClick={() => setIcon_(choice)}
            className="rounded-lg border px-2 py-1 text-lg"
            style={{
              borderColor: icon === choice ? "var(--primary)" : "var(--border)",
              backgroundColor: icon === choice ? "var(--primary-light)" : "transparent",
            }}
          >
            {choice}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {GROUP_COLOR_CHOICES.map((choice) => (
          <button
            key={choice}
            type="button"
            data-testid={`group-color-choice-${choice}`}
            aria-pressed={color === choice}
            aria-label={choice}
            onClick={() => setColor(choice)}
            className="h-6 w-6 rounded-full border"
            style={{
              backgroundColor: choice,
              outline: color === choice ? "2px solid var(--text-primary)" : "none",
              outlineOffset: "1px",
              borderColor: "var(--border)",
            }}
          />
        ))}
      </div>
      <button
        type="button"
        data-testid="group-avatar-save"
        disabled={!dirty || setIcon.isPending}
        onClick={() => setIcon.mutate({ icon, color })}
        className="rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50"
        style={{ backgroundColor: "var(--primary)", color: "white" }}
      >
        {t("group.avatarSave")}
      </button>
      {setIcon.isError && (
        <p className="text-xs" role="alert" style={{ color: "var(--danger, #dc2626)" }}>
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
    <div className="space-y-2">
      {!link ? (
        <button
          type="button"
          data-testid="generate-invite-button"
          onClick={() => createInvite.mutate()}
          disabled={createInvite.isPending}
          className="rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50"
          style={{ backgroundColor: "var(--primary)", color: "white" }}
        >
          {t("group.invite")}
        </button>
      ) : (
        <div className="space-y-1">
          <div className="flex gap-2">
            <input
              readOnly
              value={link}
              data-testid="invite-link"
              aria-label={t("group.invite")}
              className="flex-1 rounded-lg border bg-transparent px-3 py-2 text-xs"
              style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
            />
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard?.writeText(link);
                setCopied(true);
              }}
              className="rounded-lg border px-3 py-2 text-xs"
              style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
            >
              {copied ? t("group.copied") : t("group.copy")}
            </button>
          </div>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {t("group.inviteHint")}
          </p>
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
    <div className="space-y-2">
      <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
        {t("group.membersTitle")}
      </h3>
      <ul className="space-y-1">
        {detail.members.map((member) => {
          return (
            <li
              key={member.user_id}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <span className="truncate" style={{ color: "var(--text-secondary)" }}>
                {member.display_name ?? member.user_id.slice(0, 8)}
                <span
                  className="ml-2 text-xs"
                  data-testid={`member-role-${member.user_id}`}
                  style={{ color: "var(--text-muted)" }}
                >
                  {t(ROLE_KEYS[member.role])}
                </span>
              </span>
              {isOwner && member.role !== "owner" && (
                <span className="flex shrink-0 gap-2 text-xs">
                  <button
                    type="button"
                    data-testid={`member-role-toggle-${member.user_id}`}
                    onClick={() =>
                      updateRole.mutate({
                        memberUserId: member.user_id,
                        role: member.role === "admin" ? "member" : "admin",
                      })
                    }
                    style={{ color: "var(--primary)" }}
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
                    style={{ color: "var(--danger, #dc2626)" }}
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

  function resetScopeIfActive() {
    if (activeScope.kind === "group" && activeScope.id === groupId) {
      setActiveScope({ kind: "personal" });
    }
  }

  return (
    <div className="flex flex-wrap gap-3 border-t pt-3" style={{ borderColor: "var(--border)" }}>
      <button
        type="button"
        data-testid="group-leave-button"
        onClick={() => leaveGroup.mutate(groupId, { onSuccess: resetScopeIfActive })}
        className="text-xs font-medium"
        style={{ color: "var(--text-secondary)" }}
      >
        {t("group.leave")}
      </button>
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
          className="text-xs font-medium"
          style={{ color: "var(--danger, #dc2626)" }}
        >
          {t("group.delete")}
        </button>
      )}
      {(leaveGroup.isError || deleteGroup.isError) && (
        <p
          className="basis-full text-xs"
          role="alert"
          data-testid="group-action-error"
          style={{ color: "var(--danger, #dc2626)" }}
        >
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
    <div className="space-y-1 border-t pt-3" style={{ borderColor: "var(--border)" }}>
      <label className="flex items-center justify-between gap-3 text-sm">
        <span style={{ color: "var(--text-secondary)" }}>{t("group.visibilityLabel")}</span>
        <input
          type="checkbox"
          data-testid="group-visibility-toggle"
          checked={detail.member_visibility_enabled}
          disabled={setVisibility.isPending}
          onChange={(event) => setVisibility.mutate(event.target.checked)}
        />
      </label>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        {t("group.visibilityHint")}
      </p>
      {setVisibility.isError && (
        <p className="text-xs" role="alert" style={{ color: "var(--danger, #dc2626)" }}>
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
    <div className="space-y-1">
      <label className="flex items-center justify-between gap-3 text-sm">
        <span style={{ color: "var(--text-secondary)" }}>{t("group.consentLabel")}</span>
        <input
          type="checkbox"
          data-testid="group-consent-toggle"
          checked={detail.viewer_shares_detail}
          disabled={setConsent.isPending}
          onChange={(event) => setConsent.mutate(event.target.checked)}
        />
      </label>
      {setConsent.isError && (
        <p className="text-xs" role="alert" style={{ color: "var(--danger, #dc2626)" }}>
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
    <div className="space-y-2 border-t pt-3" style={{ borderColor: "var(--border)" }}>
      <button
        type="button"
        data-testid="group-transactions-toggle"
        onClick={() => setShow((value) => !value)}
        className="text-xs font-medium"
        style={{ color: "var(--primary)" }}
      >
        {show ? t("group.hideTransactions") : t("group.viewTransactions")}
      </button>
      {show && (
        <div data-testid="group-transactions" className="space-y-1">
          {isLoading && (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              …
            </p>
          )}
          {isError && (
            <p className="text-xs" role="alert" style={{ color: "var(--danger, #dc2626)" }}>
              {t("group.transactionsError")}
            </p>
          )}
          {txns && txns.length === 0 && (
            <p
              className="text-xs"
              data-testid="group-transactions-empty"
              style={{ color: "var(--text-muted)" }}
            >
              {t("group.transactionsEmpty")}
            </p>
          )}
          {txns?.map((txn) => (
            <div
              key={txn.id}
              data-testid="group-txn-row"
              className="flex items-center justify-between gap-2 text-sm"
            >
              <span className="truncate" style={{ color: "var(--text-primary)" }}>
                {txn.merchant}
                <span className="ml-2 text-xs" style={{ color: "var(--text-muted)" }}>
                  {txn.is_own ? t("group.youLabel") : txn.shared_by_name}
                </span>
              </span>
              <span className="shrink-0 text-xs" style={{ color: "var(--text-secondary)" }}>
                {formatMinorAmount(txn.total_minor, txn.currency)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
