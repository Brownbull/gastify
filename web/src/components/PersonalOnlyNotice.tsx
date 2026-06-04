import { useI18n } from "@/hooks/useI18n";
import { useUiStore } from "@/stores/uiStore";

/**
 * Shown in place of personal-only features (scanning) while a group is the active
 * scope — D70 keeps scanning in personal mode; you populate a group by sharing.
 */
export function PersonalOnlyNotice() {
  const { t } = useI18n();
  const setActiveScope = useUiStore((s) => s.setActiveScope);

  return (
    <div
      data-testid="personal-only-notice"
      className="mx-auto max-w-xl space-y-4 rounded-2xl border p-6 text-center"
      style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}
    >
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
        {t("scan.groupDisabled")}
      </p>
      <button
        type="button"
        onClick={() => setActiveScope({ kind: "personal" })}
        className="rounded-lg px-4 py-2 text-sm font-medium"
        style={{ backgroundColor: "var(--primary)", color: "white" }}
      >
        {t("group.backToPersonal")}
      </button>
    </div>
  );
}
