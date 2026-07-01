import { useState, type ReactNode } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { GroupSwitcher } from "@/components/GroupSwitcher";
import { RateLimitToast } from "@/components/RateLimitToast";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/hooks/useI18n";
import { useUnreadNotificationCount } from "@/hooks/useNotifications";
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
 * Routes that render as a full-surface OVERLAY (DF1, D100) instead of inside the
 * nav-framed <main>: mobile covers the whole frame; desktop covers the content
 * pane only (SideNav stays). These remain real routes — URLs / back-button /
 * deep-links are preserved. Grown one family at a time across DF2–DF5.
 */
const OVERLAY_ROUTES = ["/settings"];
function isOverlayPath(pathname: string): boolean {
  return OVERLAY_ROUTES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * The Playful Geometric app shell (W2, DM-5): desktop SideNav + mobile AppHeader
 * + 4-tab BottomNav + ScanFab + Perfil avatar dropdown. View-only — wraps the
 * existing data wiring (useAuth, GroupSwitcher/scope, NotificationBell, i18n).
 * IA (Option A): tabs Inicio·Compras·Gastos·Historial; scan = FAB; Perfil = avatar.
 */
export function AppLayout({ children }: AppLayoutProps) {
  const { user, signOut } = useAuth();
  const { t } = useI18n();
  const { data: unreadCount = 0 } = useUnreadNotificationCount();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const email = user?.email ?? "";
  const displayName = email || "Usuario";
  const initials = (email[0] ?? "U").toUpperCase();
  const activeKey = tabKeyForPath(pathname);
  const isOverlay = isOverlayPath(pathname);

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
    {
      key: "notifications",
      label: t("notifications.title"),
      icon: "nav-alerts",
      badge: unreadCount > 0 ? (unreadCount > 99 ? "99+" : String(unreadCount)) : undefined,
    },
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
        brand={<GroupSwitcher collapsed={collapsed} />}
      />

      <div data-testid="app-content-pane" className="relative flex min-h-screen flex-1 flex-col">
        <AppHeader
          className="sticky top-0 z-20 bg-gt-bg! lg:hidden"
          variant="home"
          brand={<GroupSwitcher />}
          avatarInitials={initials}
          onProfile={toggleMenu}
        />

        <main className="flex-1 px-4 py-5 pb-28 sm:px-6 lg:p-8">{isOverlay ? null : children}</main>

        {/* Full-surface overlay slot (DF1, D100): mobile = fixed over the whole
            frame (covers header z-20 + bottomnav z-30 + fab z-40); desktop =
            absolute over THIS content pane only, so the SideNav sibling stays. */}
        {isOverlay ? (
          <div
            data-testid="app-overlay"
            className="fixed inset-0 z-45 overflow-y-auto bg-gt-bg lg:absolute"
          >
            {/* No pb-28 here: the overlay hides the bottom nav, so the extra
                bottom clearance would just be dead space after the last row. */}
            <div className="min-h-full px-4 py-5 sm:px-6 lg:p-8">{children}</div>
          </div>
        ) : null}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 lg:hidden">
        <BottomNav active={activeKey} items={tabs} onSelect={goTab} />
      </div>

      {/* Focused (overlay) screens have no FAB. */}
      {!isOverlay ? <ScanFab placement="corner" modes={scanModes} onModeSelect={onScanMode} /> : null}

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
