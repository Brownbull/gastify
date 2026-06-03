import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/hooks/useI18n";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@/lib/i18n";
import { apiClient } from "@/lib/api";
import { useUiStore, type ColorTheme, type ThemeMode } from "@/stores/uiStore";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

const COLOR_THEMES: ColorTheme[] = ["normal", "professional", "mono"];
const THEME_MODES: ThemeMode[] = ["light", "dark"];

function SettingsPage() {
  const { t } = useI18n();

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
        {t("settings.title")}
      </h1>
      <ProfileSection />
      <AppearanceSection />
      <DataSection />
      <AccountSection />
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      className="rounded-xl border p-6"
      style={{ backgroundColor: "var(--surface)", borderColor: "var(--border-light)" }}
    >
      <h2 className="mb-4 text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
        {label}
      </span>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function ProfileSection() {
  const { user } = useAuth();
  const { t } = useI18n();

  return (
    <SectionCard title={t("settings.profile")}>
      <FieldRow label={t("settings.email")}>
        <span className="text-sm" style={{ color: "var(--text-primary)" }}>
          {user?.email ?? "—"}
        </span>
      </FieldRow>
      <FieldRow label={t("settings.displayName")}>
        <span className="text-sm" style={{ color: "var(--text-primary)" }}>
          {user?.displayName ?? "—"}
        </span>
      </FieldRow>
    </SectionCard>
  );
}

function AppearanceSection() {
  const { t, locale, setLocale } = useI18n();
  const colorTheme = useUiStore((s) => s.colorTheme);
  const themeMode = useUiStore((s) => s.themeMode);
  const setColorTheme = useUiStore((s) => s.setColorTheme);
  const setThemeMode = useUiStore((s) => s.setThemeMode);

  const themeLabels: Record<ColorTheme, string> = {
    normal: t("settings.theme.normal"),
    professional: t("settings.theme.professional"),
    mono: t("settings.theme.mono"),
  };

  const modeLabels: Record<ThemeMode, string> = {
    light: t("settings.mode.light"),
    dark: t("settings.mode.dark"),
  };

  return (
    <SectionCard title={t("settings.appearance")}>
      <FieldRow label={t("settings.colorTheme")}>
        <select
          value={colorTheme}
          onChange={(e) => setColorTheme(e.target.value as ColorTheme)}
          className="rounded-md border bg-transparent px-3 py-1.5 text-sm"
          style={{ borderColor: "var(--border-light)", color: "var(--text-primary)" }}
        >
          {COLOR_THEMES.map((theme) => (
            <option key={theme} value={theme}>
              {themeLabels[theme]}
            </option>
          ))}
        </select>
      </FieldRow>
      <FieldRow label={t("settings.themeMode")}>
        <select
          value={themeMode}
          onChange={(e) => setThemeMode(e.target.value as ThemeMode)}
          className="rounded-md border bg-transparent px-3 py-1.5 text-sm"
          style={{ borderColor: "var(--border-light)", color: "var(--text-primary)" }}
        >
          {THEME_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {modeLabels[mode]}
            </option>
          ))}
        </select>
      </FieldRow>
      <FieldRow label={t("locale.label")}>
        <select
          value={locale}
          onChange={(e) => setLocale(e.target.value as SupportedLocale)}
          className="rounded-md border bg-transparent px-3 py-1.5 text-sm"
          style={{ borderColor: "var(--border-light)", color: "var(--text-primary)" }}
        >
          {SUPPORTED_LOCALES.map((l) => (
            <option key={l} value={l}>
              {l.toUpperCase()}
            </option>
          ))}
        </select>
      </FieldRow>
    </SectionCard>
  );
}

function DataSection() {
  const { t } = useI18n();
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const { data, error } = await apiClient.POST("/api/v1/privacy/portability");
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

  return (
    <SectionCard title={t("settings.exportData")}>
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
        {t("settings.exportDataDesc")}
      </p>
      <button
        onClick={() => void handleExport()}
        disabled={exporting}
        className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50"
        style={{ backgroundColor: "var(--primary)" }}
      >
        {exporting ? "..." : t("settings.exportData")}
      </button>
    </SectionCard>
  );
}

function AccountSection() {
  const { signOut } = useAuth();
  const { t } = useI18n();
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const deleteWord = t("settings.deleteConfirm").split(" ").pop() ?? "DELETE";
  const canDelete = confirmText.toUpperCase() === deleteWord.toUpperCase();

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
    <SectionCard title={t("settings.account")}>
      <button
        onClick={() => void signOut()}
        className="w-full rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
        style={{ borderColor: "var(--border-light)", color: "var(--text-primary)" }}
      >
        {t("auth.signOut")}
      </button>

      <div
        className="mt-4 rounded-lg border p-4"
        style={{ borderColor: "var(--error)", backgroundColor: "rgba(239, 68, 68, 0.05)" }}
      >
        <h3 className="text-sm font-semibold" style={{ color: "var(--error)" }}>
          {t("settings.dangerZone")}
        </h3>
        <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
          {t("settings.deleteAccountDesc")}
        </p>
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={t("settings.deleteConfirm")}
            className="flex-1 rounded-md border bg-transparent px-3 py-1.5 text-sm"
            style={{ borderColor: "var(--border-light)", color: "var(--text-primary)" }}
          />
          <button
            onClick={() => void handleDelete()}
            disabled={!canDelete || deleting}
            className="rounded-lg px-4 py-1.5 text-sm font-medium text-white transition-colors disabled:opacity-30"
            style={{ backgroundColor: "var(--error)" }}
          >
            {t("settings.deleteAccount")}
          </button>
        </div>
      </div>
    </SectionCard>
  );
}
