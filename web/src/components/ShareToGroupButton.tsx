import { useState } from "react";
import { useGroups, useShareTransaction } from "@/hooks/useGroups";
import { useI18n } from "@/hooks/useI18n";
import { useUiStore } from "@/stores/uiStore";

/**
 * "Share to group" affordance on a personal transaction (D70 populate-via-share).
 * Only shown in personal mode and only when the user belongs to a group; picking a
 * group copies the transaction into it (the original stays personal).
 */
export function ShareToGroupButton({ transactionId }: { transactionId: string }) {
  const { t } = useI18n();
  const inPersonalMode = useUiStore((s) => s.activeScope.kind === "personal");
  const { data: groups } = useGroups();
  const share = useShareTransaction();
  const [groupId, setGroupId] = useState("");

  if (!inPersonalMode || !groups || groups.length === 0) return null;

  return (
    <div
      data-testid="share-to-group"
      className="flex flex-wrap items-center gap-2 rounded-xl border p-3"
      style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}
    >
      <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
        {t("group.shareToGroup")}
      </span>
      <select
        value={groupId}
        onChange={(event) => setGroupId(event.target.value)}
        aria-label={t("group.shareToGroup")}
        className="rounded-lg border bg-transparent px-2 py-1 text-sm"
        style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
      >
        <option value="">—</option>
        {groups.map((group) => (
          <option key={group.id} value={group.id}>
            {group.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={!groupId || share.isPending}
        onClick={() => share.mutate({ groupId, transactionId })}
        className="rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50"
        style={{ backgroundColor: "var(--primary)", color: "white" }}
      >
        {share.isSuccess ? t("group.shared") : t("group.share")}
      </button>
    </div>
  );
}
