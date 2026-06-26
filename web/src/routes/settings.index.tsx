import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/hooks/useI18n";
import { type MessageKey } from "@/lib/i18n";
import { PixelIcon } from "@/components/shell/PixelIcon";
import { ChevronLeftIcon, LogOutIcon } from "@/components/shell/icons";
import { Badge } from "@/components/ui/Badge";

export const Route = createFileRoute("/settings/")({
  component: SettingsHub,
});

/** valid navigation targets for a settings row. */
type SettingsTarget =
  | "/settings/profile"
  | "/settings/scanning"
  | "/settings/preferences"
  | "/settings/memory"
  | "/settings/data"
  | "/settings/help"
  | "/notifications";

interface SettingsRowData {
  key: string;
  label: MessageKey;
  sub: MessageKey;
  /** pixel-icon name (under /public/pixel-icons). */
  icon?: string;
  /** stroke glyph instead of a pixel icon (the danger logout). */
  svg?: ReactNode;
  to?: SettingsTarget;
  comingSoon?: boolean;
  danger?: boolean;
}

interface SettingsGroup {
  heading: MessageKey;
  rows: SettingsRowData[];
}

const GROUPS: SettingsGroup[] = [
  {
    heading: "settings.section.account",
    rows: [
      { key: "profile", label: "settings.row.profile", sub: "settings.sub.profile", icon: "snowshoe-face-wave", to: "/settings/profile" },
      { key: "subscription", label: "settings.row.subscription", sub: "settings.sub.subscription", icon: "credit-super", comingSoon: true },
      { key: "cards", label: "settings.row.cards", sub: "settings.sub.cards", icon: "card-blue", comingSoon: true },
      { key: "notifications", label: "settings.row.notifications", sub: "settings.sub.notifications", icon: "nav-alerts", to: "/notifications" },
    ],
  },
  {
    heading: "settings.section.preferences",
    rows: [
      { key: "limits", label: "settings.row.limits", sub: "settings.sub.limits", icon: "fin-budget", comingSoon: true },
      { key: "scanning", label: "settings.row.scanning", sub: "settings.sub.scanning", icon: "nav-scan", to: "/settings/scanning" },
      { key: "preferences", label: "settings.row.preferences", sub: "settings.sub.preferences", icon: "settings-sliders", to: "/settings/preferences" },
    ],
  },
  {
    heading: "settings.section.data",
    rows: [
      { key: "memory", label: "settings.row.memory", sub: "settings.sub.memory", icon: "settings-memory", to: "/settings/memory" },
      { key: "data", label: "settings.row.data", sub: "settings.sub.data", icon: "shield-finance", to: "/settings/data" },
    ],
  },
  {
    heading: "settings.section.support",
    rows: [{ key: "help", label: "settings.row.help", sub: "settings.sub.help", icon: "status-info", to: "/settings/help" }],
  },
];

const LOGOUT: SettingsRowData = {
  key: "logout",
  label: "settings.row.logout",
  sub: "settings.sub.logout",
  svg: <LogOutIcon className="h-9 w-9 text-gt-negative" />,
  danger: true,
};

function SettingsRow({ row }: { row: SettingsRowData }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const onClick = () => {
    if (row.comingSoon) return;
    if (row.danger) void signOut();
    else if (row.to) void navigate({ to: row.to });
  };

  return (
    <button
      type="button"
      data-testid={`settings-row-${row.key}`}
      onClick={onClick}
      disabled={row.comingSoon}
      className={`flex w-full items-center gap-gt-12 px-gt-4 py-gt-10 text-left transition duration-150 ease-gt-bounce focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-gt-primary/20 ${
        row.comingSoon ? "cursor-default opacity-60" : row.danger ? "hover:bg-gt-negative/10" : "hover:bg-gt-bg-3"
      }`}
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center">
        {row.svg ?? (row.icon ? <PixelIcon name={row.icon} size={36} /> : null)}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-gt-2">
        <span className={`truncate font-gt-display text-gt-md font-extrabold ${row.danger ? "text-gt-negative" : "text-gt-ink"}`}>
          {t(row.label)}
        </span>
        <span className="truncate text-gt-sm font-medium text-gt-ink-3">{t(row.sub)}</span>
      </span>
      {row.comingSoon ? (
        <Badge tone="neutral" className="shrink-0">
          {t("settings.comingSoon")}
        </Badge>
      ) : null}
      {!row.danger && !row.comingSoon ? (
        <span aria-hidden="true" className="grid shrink-0 place-items-center text-gt-ink-3">
          <span className="h-2.5 w-2.5 rotate-45 border-r-2 border-t-2 border-current" />
        </span>
      ) : null}
    </button>
  );
}

function SettingsHub() {
  const { t } = useI18n();
  const router = useRouter();
  return (
    <div className="mx-auto w-full max-w-2xl">
      {/* Overlay close: back arrow dismisses the settings overlay (DF1). */}
      <div className="flex items-center gap-gt-8 pb-gt-12">
        <button
          type="button"
          aria-label={t("common.back")}
          data-testid="settings-close"
          onClick={() => router.history.back()}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-gt-lg text-gt-ink transition hover:-translate-x-0.5"
        >
          <ChevronLeftIcon className="h-7 w-7" />
        </button>
        <h1 className="font-gt-display text-gt-4xl font-extrabold text-gt-ink">{t("settings.title")}</h1>
      </div>
      <div className="flex flex-col gap-gt-16">
        {GROUPS.map((g) => (
          <section key={g.heading} className="flex flex-col gap-gt-4">
            <p className="px-gt-4 font-gt-display text-gt-sm font-extrabold uppercase tracking-wide text-gt-ink-3">{t(g.heading)}</p>
            <div className="flex flex-col">
              {g.rows.map((r) => (
                <SettingsRow key={r.key} row={r} />
              ))}
            </div>
          </section>
        ))}
        <SettingsRow row={LOGOUT} />
      </div>
    </div>
  );
}
