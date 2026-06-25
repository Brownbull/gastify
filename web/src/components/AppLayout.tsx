import { useState, type ReactNode } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { GroupSwitcher } from "@/components/GroupSwitcher";
import { NotificationBell } from "@/components/NotificationBell";
import { RateLimitToast } from "@/components/RateLimitToast";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/hooks/useI18n";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@/lib/i18n";
import {
  AppHeader,
  BottomNav,
  ProfileMenu,
  ScanFab,
  SideNav,
  type NavTab,
  type ProfileMenuItem,
  type ScanMode,
} from "@/components/shell/Nav";

interface AppLayoutProps {
  children: ReactNode;
}

/** Which of the 4 tabs the current route belongs to (empty = no tab active). */
function tabKeyForPath(pathname: string): string {
  if (pathname === "/") return "home";
  if (pathname.startsWith("/transactions")) return "purchases";
  if (pathname.startsWith("/trends") || pathname.startsWith("/reports")) return "spending";
  if (pathname.startsWith("/items")) return "history";
  return "";
}

/**
 * The Playful Geometric app shell (W2, DM-5): desktop SideNav + mobile AppHeader
 * + 4-tab BottomNav + ScanFab + Perfil avatar dropdown. View-only — wraps the
 * existing data wiring (useAuth, GroupSwitcher/scope, NotificationBell, i18n).
 * IA (Option A): tabs Inicio·Compras·Gastos·Historial; scan = FAB; Perfil = avatar.
 */
export function AppLayout({ children }: AppLayoutProps) {
  const { user, signOut } = useAuth();
  const { t, locale, setLocale } = useI18n();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const email = user?.email ?? "";
  const displayName = email || "Usuario";
  const initials = (email[0] ?? "U").toUpperCase();
  const activeKey = tabKeyForPath(pathname);

  const tabs: NavTab[] = [
    { key: "home", icon: "nav-home", label: t("nav.dashboard") },
    { key: "purchases", icon: "nav-history", label: t("nav.purchases") },
    { key: "spending", icon: "chart-pie", label: t("nav.spending") },
    { key: "history", icon: "nav-historial", label: t("nav.history") },
  ];

  const goTab = (key: string) => {
    switch (key) {
      case "home":
        void navigate({ to: "/" });
        break;
      case "purchases":
        void navigate({ to: "/transactions" });
        break;
      case "spending":
        void navigate({ to: "/trends" });
        break;
      case "history":
        void navigate({ to: "/items" });
        break;
    }
  };

  const scanModes = [
    { id: "single" as ScanMode, icon: "scan-single", label: t("nav.scan"), cost: "" },
    { id: "batch" as ScanMode, icon: "scan-batch", label: t("nav.batchScan"), cost: "" },
    { id: "statement" as ScanMode, icon: "scan-statement", label: t("nav.statements"), cost: "" },
  ];

  const onScanMode = (mode: ScanMode) => {
    switch (mode) {
      case "single":
        void navigate({ to: "/scan" });
        break;
      case "batch":
        void navigate({ to: "/scan-batch" });
        break;
      case "statement":
        void navigate({ to: "/statements" });
        break;
    }
  };

  const profileItems: ProfileMenuItem[] = [
    { key: "notifications", label: t("nav.notifications"), icon: "nav-alerts" },
    { key: "reports", label: t("nav.reports"), icon: "chart-pie" },
    { key: "groups", label: t("nav.groups"), icon: "settings-groups" },
    { key: "statements", label: t("nav.statements"), icon: "scan-statement" },
    { key: "settings", label: t("nav.settings"), icon: "nav-settings" },
    { key: "logout", label: t("auth.signOut"), icon: "svg:logout", danger: true, divider: true },
  ];

  const onProfileSelect = (key: string) => {
    setMenuOpen(false);
    switch (key) {
      case "notifications":
        void navigate({ to: "/notifications" });
        break;
      case "reports":
        void navigate({ to: "/reports" });
        break;
      case "groups":
        void navigate({ to: "/groups" });
        break;
      case "statements":
        void navigate({ to: "/statements" });
        break;
      case "settings":
        void navigate({ to: "/settings" });
        break;
      case "logout":
        void signOut();
        break;
    }
  };

  const toggleMenu = () => setMenuOpen((o) => !o);

  return (
    <div className="min-h-screen bg-gt-bg lg:flex">
      <SideNav
        className="hidden lg:flex"
        active={activeKey}
        items={tabs}
        onSelect={goTab}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
        profileName={displayName}
        profileEmail={email}
        onProfile={toggleMenu}
        belowNav={<GroupSwitcher />}
      />

      <div className="flex min-h-screen flex-1 flex-col">
        <AppHeader
          className="sticky top-0 z-20 border-b-2 border-gt-line-strong lg:hidden"
          variant="home"
          actions={
            <>
              <NotificationBell />
              <LocaleSelect locale={locale} onChange={setLocale} label={t("locale.label")} />
            </>
          }
          band={<GroupSwitcher />}
          avatarInitials={initials}
          onProfile={toggleMenu}
        />

        <main className="flex-1 px-4 py-5 pb-28 sm:px-6 lg:p-8">{children}</main>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 lg:hidden">
        <BottomNav active={activeKey} items={tabs} onSelect={goTab} />
      </div>

      <ScanFab placement="corner" modes={scanModes} onModeSelect={onScanMode} />

      {menuOpen ? (
        <>
          <button
            type="button"
            aria-label="Cerrar menú"
            className="fixed inset-0 z-40 cursor-default bg-transparent"
            onClick={() => setMenuOpen(false)}
          />
          <div className="fixed right-4 top-16 z-50 lg:bottom-4 lg:left-4 lg:right-auto lg:top-auto">
            <ProfileMenu name={displayName} email={email} items={profileItems} onSelect={onProfileSelect} />
          </div>
        </>
      ) : null}

      <RateLimitToast />
    </div>
  );
}

interface LocaleSelectProps {
  locale: SupportedLocale;
  onChange: (locale: SupportedLocale) => void;
  label: string;
}

function LocaleSelect({ locale, onChange, label }: LocaleSelectProps) {
  return (
    <select
      value={locale}
      aria-label={label}
      onChange={(event) => onChange(event.target.value as SupportedLocale)}
      className="rounded-gt-md border-2 border-gt-line bg-gt-surface px-gt-6 py-gt-4 text-gt-xs font-extrabold text-gt-ink-2"
    >
      {SUPPORTED_LOCALES.map((supportedLocale) => (
        <option key={supportedLocale} value={supportedLocale}>
          {supportedLocale.toUpperCase()}
        </option>
      ))}
    </select>
  );
}
