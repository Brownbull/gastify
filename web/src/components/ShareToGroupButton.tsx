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
      className="flex flex-wrap items-center gap-gt-8 rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface p-gt-12 shadow-gt-sm"
    >
      <span className="text-gt-sm font-extrabold text-gt-ink-2">{t("group.shareToGroup")}</span>
      <select
        value={groupId}
        onChange={(event) => {
          // Re-arm the button for a new target after a prior success/error.
          if (share.isSuccess || share.isError) share.reset();
          setGroupId(event.target.value);
        }}
        aria-label={t("group.shareToGroup")}
        className="rounded-gt-lg border-2 border-gt-line bg-gt-surface px-gt-8 py-gt-6 text-gt-sm font-bold text-gt-ink focus-visible:outline-none focus-visible:border-gt-line-strong"
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
        disabled={!groupId || share.isPending || share.isSuccess}
        onClick={() => share.mutate({ groupId, transactionId })}
        className="rounded-gt-lg border-2 border-gt-line-strong bg-gt-primary px-gt-12 py-gt-6 font-gt-display text-gt-sm font-extrabold text-white shadow-gt-xs transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-50"
      >
        {share.isSuccess ? t("group.shared") : t("group.share")}
      </button>
      {share.isError && (
        <span className="text-gt-xs font-bold text-gt-error" role="alert" data-testid="share-error">
          {t("group.shareError")}
        </span>
      )}
    </div>
  );
}
