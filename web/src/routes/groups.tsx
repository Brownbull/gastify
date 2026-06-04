import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  useCreateGroup,
  useCreateInvite,
  useDeleteGroup,
  useGroup,
  useGroups,
  useLeaveGroup,
  useRemoveMember,
  useUpdateMemberRole,
  type GroupDetail,
  type GroupSummary,
} from "@/hooks/useGroups";
import { useI18n } from "@/hooks/useI18n";
import { useUiStore } from "@/stores/uiStore";

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
      <div className="min-w-0">
        <p className="truncate font-semibold" style={{ color: "var(--text-primary)" }}>
          🏠 {group.name}
        </p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {group.member_count} {t("group.members")} · {t(ROLE_KEYS[group.role])}
        </p>
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
      {canManage && <InviteSection groupId={groupId} />}
      <MemberRoster detail={detail} groupId={groupId} />
      <GroupActions detail={detail} groupId={groupId} />
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
                <span className="ml-2 text-xs" style={{ color: "var(--text-muted)" }}>
                  {t(ROLE_KEYS[member.role])}
                </span>
              </span>
              {isOwner && member.role !== "owner" && (
                <span className="flex shrink-0 gap-2 text-xs">
                  <button
                    type="button"
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
        onClick={() => leaveGroup.mutate(groupId, { onSuccess: resetScopeIfActive })}
        className="text-xs font-medium"
        style={{ color: "var(--text-secondary)" }}
      >
        {t("group.leave")}
      </button>
      {detail.role === "owner" && (
        <button
          type="button"
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
