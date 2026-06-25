import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/hooks/useI18n";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@/lib/i18n";
import { apiClient } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

const selectClass =
  "rounded-gt-lg border-2 border-gt-line bg-gt-surface px-gt-10 py-gt-6 font-gt-display text-gt-sm font-bold text-gt-ink focus-visible:outline-none focus-visible:border-gt-line-strong disabled:opacity-50";

function SettingsPage() {
  const { t } = useI18n();

  return (
    <div className="mx-auto max-w-2xl space-y-gt-16">
      <h1 className="font-gt-display text-gt-4xl font-extrabold text-gt-ink">{t("settings.title")}</h1>
      <ProfileSection />
      <CurrencySection />
      <DateFormatSection />
      <LearnedMappingsSection />
      <LanguageSection />
      <DataSection />
      <AccountSection />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card title={title}>
      <div className="space-y-gt-12">{children}</div>
    </Card>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-gt-12">
      <span className="font-gt-display text-gt-sm font-bold text-gt-ink-2">{label}</span>
      <div className="flex shrink-0 items-center gap-gt-8">{children}</div>
    </div>
  );
}

function ProfileSection() {
  const { user } = useAuth();
  const { t } = useI18n();

  return (
    <Section title={t("settings.profile")}>
      <FieldRow label={t("settings.email")}>
        <span className="text-gt-md font-bold text-gt-ink">{user?.email ?? "—"}</span>
      </FieldRow>
      <FieldRow label={t("settings.displayName")}>
        <span className="text-gt-md font-bold text-gt-ink">{user?.displayName ?? "—"}</span>
      </FieldRow>
    </Section>
  );
}

const CURRENCY_CHOICES = ["CLP", "USD"] as const;

function CurrencySection() {
  const [current, setCurrent] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiClient.GET("/api/v1/privacy/profile").then(({ data }) => {
      if (!cancelled && data) setCurrent(data.default_currency);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const onChange = async (code: string) => {
    setSaving(true);
    setError(null);
    const previous = current;
    setCurrent(code);
    const { error: apiError } = await apiClient.POST("/api/v1/privacy/rectification", {
      body: { default_currency: code },
    });
    setSaving(false);
    if (apiError) {
      setCurrent(previous);
      setError("Could not update currency");
    }
  };

  return (
    <Section title="Currency">
      <FieldRow label="Default currency">
        <select
          data-testid="settings-currency-select"
          value={current ?? ""}
          disabled={current === null || saving}
          onChange={(e) => onChange(e.target.value)}
          className={selectClass}
        >
          {current === null && <option value="">…</option>}
          {CURRENCY_CHOICES.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
        {error && <span className="text-gt-xs font-bold text-gt-error">{error}</span>}
      </FieldRow>
    </Section>
  );
}

type LearnedMappings = {
  merchants: Array<{ id: string; original_merchant: string; target_merchant: string }>;
  items: Array<{ id: string; original_item: string; target_item: string | null }>;
};

const DATE_FORMATS = ["dd/MM/yyyy", "MM/dd/yyyy"] as const;

function DateFormatSection() {
  const [current, setCurrent] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiClient.GET("/api/v1/privacy/profile").then(({ data }) => {
      if (!cancelled && data) setCurrent(data.date_format);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const onChange = async (value: string) => {
    setSaving(true);
    const previous = current;
    setCurrent(value);
    const { error } = await apiClient.POST("/api/v1/privacy/rectification", {
      body: { date_format: value as (typeof DATE_FORMATS)[number] },
    });
    setSaving(false);
    if (error) setCurrent(previous);
  };

  return (
    <Section title="Date format">
      <FieldRow label="Dates shown as">
        <select
          data-testid="settings-date-format"
          value={current ?? ""}
          disabled={current === null || saving}
          onChange={(e) => onChange(e.target.value)}
          className={selectClass}
        >
          {current === null && <option value="">…</option>}
          {DATE_FORMATS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </FieldRow>
    </Section>
  );
}

function LearnedMappingsSection() {
  const [data, setData] = useState<LearnedMappings | null>(null);

  const refresh = () => {
    apiClient.GET("/api/v1/mappings").then(({ data: d }) => {
      if (d) setData(d as LearnedMappings);
    });
  };
  useEffect(refresh, []);

  const remove = async (kind: "merchant" | "item", id: string) => {
    if (kind === "merchant") {
      await apiClient.DELETE("/api/v1/mappings/merchant/{mapping_id}", {
        params: { path: { mapping_id: id } },
      });
    } else {
      await apiClient.DELETE("/api/v1/mappings/item/{mapping_id}", {
        params: { path: { mapping_id: id } },
      });
    }
    refresh();
  };

  const empty = data && data.merchants.length === 0 && data.items.length === 0;
  return (
    <Section title="Learned mappings">
      <div className="space-y-gt-8" data-testid="learned-mappings-section">
        {!data && <p className="text-gt-sm font-medium text-gt-ink-3">…</p>}
        {empty && (
          <p className="text-gt-sm font-medium text-gt-ink-3" data-testid="learned-mappings-empty">
            Nothing learned yet — corrections you make to merchants and items will appear here and
            auto-apply to future scans.
          </p>
        )}
        {data?.merchants.map((m) => (
          <MappingRow
            key={m.id}
            id={m.id}
            label={`${m.original_merchant} → ${m.target_merchant}`}
            onRemove={() => remove("merchant", m.id)}
          />
        ))}
        {data?.items.map((m) => (
          <MappingRow
            key={m.id}
            id={m.id}
            label={`${m.original_item} → ${m.target_item ?? "(category only)"}`}
            onRemove={() => remove("item", m.id)}
          />
        ))}
      </div>
    </Section>
  );
}

function MappingRow({ id, label, onRemove }: { id: string; label: string; onRemove: () => void }) {
  return (
    <div className="flex items-center justify-between gap-gt-8 rounded-gt-lg border-2 border-gt-line bg-gt-surface px-gt-12 py-gt-8">
      <span className="truncate text-gt-sm font-medium text-gt-ink-2">{label}</span>
      <Button variant="ghost" size="sm" data-testid={`mapping-delete-${id}`} onClick={onRemove} className="shrink-0 text-gt-negative">
        Delete
      </Button>
    </div>
  );
}

function LanguageSection() {
  const { t, locale, setLocale } = useI18n();

  return (
    <Section title={t("locale.label")}>
      <div className="flex items-center justify-end">
        <select
          value={locale}
          aria-label={t("locale.label")}
          onChange={(e) => setLocale(e.target.value as SupportedLocale)}
          className={selectClass}
        >
          {SUPPORTED_LOCALES.map((l) => (
            <option key={l} value={l}>
              {l.toUpperCase()}
            </option>
          ))}
        </select>
      </div>
    </Section>
  );
}

function DataSection() {
  const { t } = useI18n();
  const [exporting, setExporting] = useState(false);

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

  return (
    <Section title={t("settings.exportData")}>
      <p className="text-gt-sm font-medium text-gt-ink-2">{t("settings.exportDataDesc")}</p>
      <Button onClick={() => void handleExport()} disabled={exporting}>
        {exporting ? "..." : t("settings.exportData")}
      </Button>
    </Section>
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
    <Section title={t("settings.account")}>
      <Button variant="secondary" fullWidth onClick={() => void signOut()}>
        {t("auth.signOut")}
      </Button>

      <div className="mt-gt-4 rounded-gt-xl border-2 border-gt-error bg-gt-error/5 p-gt-16">
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
    </Section>
  );
}
