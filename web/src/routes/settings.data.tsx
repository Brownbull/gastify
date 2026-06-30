import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/hooks/useI18n";
import { type MessageKey } from "@/lib/i18n";
import { apiClient } from "@/lib/api";
import {
  useConsents,
  useProcessingRegister,
  useConsentAudit,
  consentKeys,
} from "@/hooks/useConsent";
import { useDataAccess, dataAccessKeys } from "@/hooks/useDataAccess";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { Modal } from "@/components/ui/Modal";
import { PixelIcon } from "@/components/shell/PixelIcon";
import {
  SettingsSubviewShell,
  SettingsGroupHeading,
} from "@/components/settings/SettingsSubviewShell";

export const Route = createFileRoute("/settings/data")({
  component: DataSubview,
});

/**
 * Display metadata for the well-known processing purposes (friendlier than the
 * raw register description). Unknown purposes fall back to the register's own
 * legal description + a neutral icon.
 */
const PURPOSE_META: Record<string, { icon: string; titleKey: MessageKey; bodyKey: MessageKey }> = {
  ai_training: { icon: "scan-success", titleKey: "settings.data.purposeAiTitle", bodyKey: "settings.data.purposeAiBody" },
  data_sharing: { icon: "chart-donut", titleKey: "settings.data.purposeAnalyticsTitle", bodyKey: "settings.data.purposeAnalyticsBody" },
};

// Consent grant requires a jurisdiction (Ley 21.719 → Chile is the app's market).
const CONSENT_JURISDICTION = "CL" as const;
const CONSENT_VERSION = "1.0";

/**
 * Datos y privacidad — rebuilt to the design-lab PrivacySubview reference (was a
 * 2-control export/delete screen). Grounded on the backend /consent + /privacy
 * (Ley 21.719 / GDPR): a data-access summary (Art 15), per-purpose consent toggles
 * driven by the processing register (grant/revoke), the consent audit log, JSON
 * export (Art 20), and account deletion (Art 17, hard-delete + sign-out).
 *
 * All sections are backend-backed — no coming-soon. The summary shows the three
 * stats the data-access endpoint exposes (transactions, granted consents,
 * account-since); the mockup's "Ítems" tile is omitted (no items-count endpoint).
 */
function DataSubview() {
  const { t, locale } = useI18n();
  const { signOut } = useAuth();
  const queryClient = useQueryClient();
  const dataAccess = useDataAccess();
  const consents = useConsents();
  const register = useProcessingRegister();
  const [auditOpen, setAuditOpen] = useState(false);
  const audit = useConsentAudit(auditOpen);
  const [savingPurpose, setSavingPurpose] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<MessageKey | null>(null);

  // GET /consent returns a { consents: [...] } envelope — unwrap before iterating.
  const consentList = consents.data?.consents ?? [];
  const grantedByPurpose = new Map(consentList.map((c) => [c.purpose, c.status === "granted"]));
  const grantedCount = consentList.filter((c) => c.status === "granted").length;
  const activePurposes = (register.data ?? []).filter((p) => p.is_active);

  const fmtMonthYear = (iso: string | undefined) =>
    iso ? new Date(iso).toLocaleDateString(locale, { month: "short", year: "numeric" }) : "—";
  const fmtFullDate = (iso: string) =>
    new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });

  const summary: Array<{ label: string; value: string }> = [
    { label: t("settings.data.statTransactions"), value: dataAccess.data ? String(dataAccess.data.transactions_count) : "—" },
    { label: t("settings.data.statConsents"), value: consents.data ? String(grantedCount) : "—" },
    { label: t("settings.data.statSince"), value: fmtMonthYear(dataAccess.data?.user.created_at) },
  ];

  const toggleConsent = async (purpose: string, next: boolean) => {
    setSavingPurpose(purpose);
    setActionError(null);
    try {
      // grant requires a ConsentGrant body { jurisdiction, consent_version }; revoke takes none.
      const { error } = next
        ? await apiClient.POST("/api/v1/consent/{purpose}/grant", {
            params: { path: { purpose } },
            body: { jurisdiction: CONSENT_JURISDICTION, consent_version: CONSENT_VERSION },
          })
        : await apiClient.POST("/api/v1/consent/{purpose}/revoke", { params: { path: { purpose } } });
      if (error) {
        setActionError("settings.data.consentError");
        return; // the Switch reflects the cache (unchanged), so nothing to roll back
      }
      await queryClient.invalidateQueries({ queryKey: consentKeys.list() });
      await queryClient.invalidateQueries({ queryKey: dataAccessKeys.all });
    } catch {
      setActionError("settings.data.consentError");
    } finally {
      setSavingPurpose(null);
    }
  };

  async function handleExport() {
    setExporting(true);
    setActionError(null);
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
    } catch {
      setActionError("settings.data.exportError");
    } finally {
      setExporting(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setActionError(null);
    try {
      const { error } = await apiClient.POST("/api/v1/privacy/erasure");
      if (error) {
        // Do NOT sign out if erasure failed — the account still exists.
        setActionError("settings.data.deleteError");
        return;
      }
      await signOut();
    } catch {
      setActionError("settings.data.deleteError");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <SettingsSubviewShell title={t("settings.row.data")}>
        <p className="px-gt-2 text-gt-sm font-medium leading-relaxed text-gt-ink-3">{t("settings.data.intro")}</p>

        {actionError ? (
          <p className="rounded-gt-lg border-2 border-gt-error bg-gt-error/5 px-gt-12 py-gt-8 text-gt-sm font-bold text-gt-error" role="alert">
            {t(actionError)}
          </p>
        ) : null}

        {/* data-access summary (Art 15) */}
        <SettingsGroupHeading>{t("settings.data.sectionData")}</SettingsGroupHeading>
        <div className="grid grid-cols-2 gap-gt-8 rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface p-gt-12 shadow-gt-sm">
          {summary.map((s) => (
            <div key={s.label} className="flex flex-col gap-gt-2 rounded-gt-lg bg-gt-bg-3 px-gt-10 py-gt-8">
              <span className="font-gt-display text-gt-xl font-extrabold text-gt-ink">{s.value}</span>
              <span className="text-gt-xs font-bold uppercase tracking-wide text-gt-ink-3">{s.label}</span>
            </div>
          ))}
        </div>

        {/* per-purpose consent toggles (driven by the processing register) */}
        <SettingsGroupHeading>{t("settings.data.sectionConsent")}</SettingsGroupHeading>
        {register.isError ? (
          <p className="px-gt-4 py-gt-6 text-gt-sm font-medium text-gt-error">{t("settings.data.loadError")}</p>
        ) : (
          <div className="flex flex-col">
            {activePurposes.map((p) => {
              const meta = PURPOSE_META[p.purpose];
              const title = meta ? t(meta.titleKey) : p.purpose;
              const body = meta ? t(meta.bodyKey) : p.description;
              return (
                <div key={p.purpose} className="flex items-center gap-gt-10 px-gt-4 py-gt-10">
                  <span className="grid h-11 w-11 shrink-0 place-items-center">
                    <PixelIcon name={meta?.icon ?? "status-info"} size={34} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-gt-2">
                    <span className="font-gt-display text-gt-md font-extrabold text-gt-ink">{title}</span>
                    <span className="text-gt-xs font-medium text-gt-ink-3">{body}</span>
                  </span>
                  <Switch
                    checked={grantedByPurpose.get(p.purpose) ?? false}
                    loading={savingPurpose === p.purpose}
                    onChange={(v) => void toggleConsent(p.purpose, v)}
                    label={title}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* rights — audit, export */}
        <SettingsGroupHeading>{t("settings.data.sectionRights")}</SettingsGroupHeading>
        <button
          type="button"
          onClick={() => setAuditOpen(true)}
          className="flex w-full items-center gap-gt-12 rounded-gt-lg px-gt-4 py-gt-10 text-left transition hover:bg-gt-bg-3"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center"><PixelIcon name="status-info" size={34} /></span>
          <span className="flex min-w-0 flex-1 flex-col gap-gt-2">
            <span className="font-gt-display text-gt-md font-extrabold text-gt-ink">{t("settings.data.auditTitle")}</span>
            <span className="text-gt-sm font-medium text-gt-ink-3">{t("settings.data.auditSubtitle")}</span>
          </span>
          <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 -rotate-45 border-b-2 border-r-2 border-gt-ink-3" />
        </button>
        <div className="flex items-center gap-gt-12 px-gt-4 py-gt-10">
          <span className="grid h-11 w-11 shrink-0 place-items-center"><PixelIcon name="chart-export" size={34} /></span>
          <span className="flex min-w-0 flex-1 flex-col gap-gt-2">
            <span className="font-gt-display text-gt-md font-extrabold text-gt-ink">{t("settings.data.exportTitle")}</span>
            <span className="text-gt-sm font-medium text-gt-ink-3">{t("settings.data.exportSubtitle")}</span>
          </span>
          <Button variant="secondary" size="sm" onClick={() => void handleExport()} disabled={exporting}>
            {exporting ? t("settings.data.exporting") : t("settings.data.exportButton")}
          </Button>
        </div>

        {/* destructive — account deletion */}
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="mt-gt-8 flex w-full items-center gap-gt-12 rounded-gt-lg px-gt-4 py-gt-10 text-left transition duration-150 ease-gt-bounce hover:bg-gt-negative/10"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center"><PixelIcon name="action-delete" size={34} /></span>
          <span className="flex min-w-0 flex-1 flex-col gap-gt-2">
            <span className="font-gt-display text-gt-md font-extrabold text-gt-negative">{t("settings.data.deleteTitle")}</span>
            <span className="text-gt-sm font-medium text-gt-ink-3">{t("settings.data.deleteSubtitle")}</span>
          </span>
        </button>
      </SettingsSubviewShell>

      {/* audit log */}
      <Modal open={auditOpen} onClose={() => setAuditOpen(false)} title={t("settings.data.auditTitle")}>
        {audit.isLoading ? (
          <p className="text-gt-sm font-medium text-gt-ink-3">{t("settings.data.loading")}</p>
        ) : (audit.data?.events.length ?? 0) === 0 ? (
          <p className="text-gt-sm font-medium text-gt-ink-3">{t("settings.data.auditEmpty")}</p>
        ) : (
          <ul className="flex flex-col divide-y-2 divide-gt-line">
            {(audit.data?.events ?? []).map((e) => {
              const revoked = e.event_type.includes("revoke");
              return (
                <li key={e.id} className="flex items-center gap-gt-8 py-gt-8">
                  <PixelIcon name={revoked ? "status-alert" : "scan-success"} size={20} className="shrink-0" />
                  <span className="min-w-0 flex-1 text-gt-sm font-bold text-gt-ink-2">
                    {revoked ? t("settings.data.auditRevoked") : t("settings.data.auditGranted")}
                  </span>
                  <span className="shrink-0 text-gt-xs font-bold text-gt-ink-3">{fmtFullDate(e.created_at)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </Modal>

      {/* account deletion confirm */}
      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={t("settings.data.deleteConfirmTitle")}
        footer={
          <div className="flex justify-end gap-gt-8">
            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)} disabled={deleting}>
              {t("settings.data.cancel")}
            </Button>
            <Button variant="danger" size="sm" onClick={() => void handleDelete()} disabled={deleting}>
              {t("settings.data.deleteConfirmButton")}
            </Button>
          </div>
        }
      >
        <p className="font-gt-body text-gt-sm leading-relaxed text-gt-ink-2">{t("settings.data.deleteConfirmBody")}</p>
      </Modal>
    </div>
  );
}
