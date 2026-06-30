import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/hooks/useI18n";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { SettingsSubviewShell, SettingsField } from "@/components/settings/SettingsSubviewShell";

export const Route = createFileRoute("/settings/data")({
  component: DataSubview,
});

function DataSubview() {
  const { t } = useI18n();
  const { signOut } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const deleteWord = t("settings.deleteConfirm").split(" ").pop() ?? "DELETE";
  const canDelete = confirmText.toUpperCase() === deleteWord.toUpperCase();

  async function handleExport() {
    setExporting(true);
    try {
      const { data, error } = await apiClient.GET("/api/v1/privacy/portability");
      if (error) throw new Error(String(error));
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gastify-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  async function handleDelete() {
    if (!canDelete) return;
    setDeleting(true);
    try {
      await apiClient.POST("/api/v1/privacy/erasure");
      await signOut();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <SettingsSubviewShell title={t("settings.row.data")}>
      <SettingsField label={t("settings.exportData")} hint={t("settings.exportDataDesc")}>
        <Button onClick={() => void handleExport()} disabled={exporting}>
          {exporting ? "..." : t("settings.exportData")}
        </Button>
      </SettingsField>

      <div className="rounded-gt-xl border-2 border-gt-error bg-gt-error/5 p-gt-16">
        <h3 className="font-gt-display text-gt-sm font-extrabold text-gt-error">{t("settings.dangerZone")}</h3>
        <p className="mt-gt-2 text-gt-xs font-medium text-gt-ink-2">{t("settings.deleteAccountDesc")}</p>
        <div className="mt-gt-12 flex gap-gt-8">
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={t("settings.deleteConfirm")}
            className="flex-1 rounded-gt-lg border-2 border-gt-line bg-gt-surface px-gt-12 py-gt-6 text-gt-sm font-bold text-gt-ink focus-visible:outline-none focus-visible:border-gt-line-strong"
          />
          <Button variant="danger" disabled={!canDelete || deleting} onClick={() => void handleDelete()}>
            {t("settings.deleteAccount")}
          </Button>
        </div>
      </div>
    </SettingsSubviewShell>
  );
}
