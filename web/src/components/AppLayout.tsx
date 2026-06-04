import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { GroupSwitcher } from "@/components/GroupSwitcher";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/hooks/useI18n";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@/lib/i18n";

interface AppLayoutProps {
  children: ReactNode;
}

const NAV_ITEMS = [
  { to: "/", labelKey: "nav.dashboard", icon: "📊" },
  { to: "/scan", labelKey: "nav.scan", icon: "📷" },
  { to: "/scan-batch", labelKey: "nav.batchScan", icon: "🧾" },
  { to: "/statements", labelKey: "nav.statements", icon: "💳" },
  { to: "/transactions", labelKey: "nav.transactions", icon: "📋" },
  { to: "/items", labelKey: "nav.items", icon: "🛒" },
  { to: "/trends", labelKey: "nav.trends", icon: "📈" },
  { to: "/reports", labelKey: "nav.reports", icon: "📑" },
  { to: "/groups", labelKey: "nav.groups", icon: "🏠" },
  { to: "/settings", labelKey: "nav.settings", icon: "⚙️" },
] as const;

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen lg:flex">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <MobileHeader />
        <main className="flex-1 px-4 py-5 pb-24 sm:px-6 lg:p-8">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}

function Sidebar() {
  const { user, signOut } = useAuth();
  const { locale, setLocale, t } = useI18n();

  return (
    <aside
      className="hidden w-64 flex-col border-r lg:flex"
      style={{
        backgroundColor: "var(--surface)",
        borderColor: "var(--border)",
      }}
    >
      <div className="space-y-3 p-6 pb-3">
        <h1 className="text-xl font-bold" style={{ color: "var(--primary)" }}>
          {t("app.name")}
        </h1>
        <GroupSwitcher />
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            label={t(item.labelKey)}
            icon={item.icon}
          />
        ))}
      </nav>
      <div
        className="space-y-2 border-t p-4"
        style={{ borderColor: "var(--border)" }}
      >
        <LocaleSelect
          label={t("locale.label")}
          locale={locale}
          onChange={setLocale}
        />
        {user && (
          <p
            className="truncate text-xs"
            style={{ color: "var(--text-muted)" }}
          >
            {user.email}
          </p>
        )}
        <button
          onClick={() => void signOut()}
          className="w-full rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-(--primary-light)"
          style={{ color: "var(--text-secondary)" }}
        >
          {t("auth.signOut")}
        </button>
      </div>
    </aside>
  );
}

function MobileHeader() {
  const { user, signOut } = useAuth();
  const { locale, setLocale, t } = useI18n();

  return (
    <header
      className="sticky top-0 z-20 border-b px-4 py-3 lg:hidden"
      style={{
        backgroundColor: "var(--surface)",
        borderColor: "var(--border)",
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-lg font-bold" style={{ color: "var(--primary)" }}>
            {t("app.name")}
          </p>
          {user && (
            <p
              className="truncate text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              {user.email}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <LocaleSelect
            label={t("locale.label")}
            locale={locale}
            compact
            onChange={setLocale}
          />
          <button
            onClick={() => void signOut()}
            className="rounded-lg px-3 py-2 text-xs font-medium transition-colors hover:bg-(--primary-light)"
            style={{ color: "var(--text-secondary)" }}
          >
            {t("auth.signOut")}
          </button>
        </div>
      </div>
      <div className="mt-2">
        <GroupSwitcher />
      </div>
    </header>
  );
}

function MobileNav() {
  const { t } = useI18n();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 flex border-t lg:hidden"
      style={{
        backgroundColor: "var(--surface)",
        borderColor: "var(--border)",
      }}
    >
      {NAV_ITEMS.map((item) => (
        <MobileNavLink
          key={item.to}
          to={item.to}
          label={t(item.labelKey)}
          icon={item.icon}
        />
      ))}
    </nav>
  );
}

interface LocaleSelectProps {
  label: string;
  locale: SupportedLocale;
  compact?: boolean;
  onChange: (locale: SupportedLocale) => void;
}

function LocaleSelect({
  label,
  locale,
  compact = false,
  onChange,
}: LocaleSelectProps) {
  return (
    <label className="block space-y-1 text-xs">
      <span
        className={compact ? "sr-only" : ""}
        style={{ color: "var(--text-muted)" }}
      >
        {label}
      </span>
      <select
        value={locale}
        aria-label={label}
        onChange={(event) => onChange(event.target.value as SupportedLocale)}
        className="rounded-md border bg-transparent px-2 py-1 text-xs"
        style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
      >
        {SUPPORTED_LOCALES.map((supportedLocale) => (
          <option key={supportedLocale} value={supportedLocale}>
            {supportedLocale.toUpperCase()}
          </option>
        ))}
      </select>
    </label>
  );
}

interface NavLinkProps {
  to: string;
  label: string;
  icon: string;
}

function NavLink({ to, label, icon }: NavLinkProps) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors"
      activeProps={{
        style: {
          backgroundColor: "var(--primary-light)",
          color: "var(--primary)",
        },
      }}
      inactiveProps={{
        style: { color: "var(--text-secondary)" },
      }}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </Link>
  );
}

function MobileNavLink({ to, label, icon }: NavLinkProps) {
  return (
    <Link
      to={to}
      className="flex flex-1 flex-col items-center gap-1 py-3 text-xs transition-colors"
      activeProps={{
        style: { color: "var(--primary)" },
      }}
      inactiveProps={{
        style: { color: "var(--text-muted)" },
      }}
    >
      <span className="text-lg">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}
