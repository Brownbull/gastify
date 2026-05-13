import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";

interface AppLayoutProps {
  children: ReactNode;
}

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: "📊" },
  { to: "/scan", label: "Scan", icon: "📷" },
  { to: "/transactions", label: "Transactions", icon: "📋" },
] as const;

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6 pb-20 lg:p-8 lg:pb-8">{children}</main>
      <MobileNav />
    </div>
  );
}

function Sidebar() {
  const { user, signOut } = useAuth();

  return (
    <aside
      className="hidden w-64 flex-col border-r lg:flex"
      style={{
        backgroundColor: "var(--surface)",
        borderColor: "var(--border)",
      }}
    >
      <div className="p-6">
        <h1
          className="text-xl font-bold"
          style={{ color: "var(--primary)" }}
        >
          Gastify
        </h1>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} label={item.label} icon={item.icon} />
        ))}
      </nav>
      <div
        className="space-y-2 border-t p-4"
        style={{ borderColor: "var(--border)" }}
      >
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
          Sign out
        </button>
      </div>
    </aside>
  );
}

function MobileNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 flex border-t lg:hidden"
      style={{
        backgroundColor: "var(--surface)",
        borderColor: "var(--border)",
      }}
    >
      {NAV_ITEMS.map((item) => (
        <MobileNavLink key={item.to} to={item.to} label={item.label} icon={item.icon} />
      ))}
    </nav>
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
