import { useState } from "react";
import { Badge } from "@design-system/atoms/Badge";
import { BellIcon, MenuIcon } from "@design-system/assets/icons";
import { AppSurface, type Platform } from "@design-system/organisms/AppSurface";
import {
  AppHeader,
  BottomNav,
  NavDrawer,
  ProfileButton,
  SideNav,
  currentNavCatalog,
  redesignedNavCatalog,
} from "@design-system/organisms/AppShell";
import { emptyHome, sampleHome, type HomeScreenModel } from "../model/HomeScreenModel";
import { MonthTreemapCard } from "../components/MonthTreemapCard";
import { RecentTransactionsCard } from "../components/RecentTransactionsCard";

/**
 * Inicio — composed screen. ONE responsive implementation; platform, IA
 * candidate, and state are story-controlled args. While the Phase 3 IA
 * decision is open the screen renders either chrome candidate; the loser
 * is removed once the user picks.
 *
 * References: web/src/routes/index.tsx (shipped dashboard),
 * docs/mockups/screens/gastify-dashboard{,-desktop}.html,
 * boletapp docs/mockups (2026-03 redesign).
 */
export type HomeIA = "current" | "redesigned";
export type HomeState = "default" | "empty";

export interface HomeScreenProps {
  /** device frame — usually supplied by the Platform toolbar via the story render. */
  platform?: Platform;
  ia?: HomeIA;
  state?: HomeState;
  /** current-IA mobile/tablet only: render the nav drawer open. */
  menuOpen?: boolean;
  chromeless?: boolean;
}

/**
 * `compact` = tight mobile padding; `wide` = tablet/desktop two-column content
 * (treemap + recent side by side). Mobile stacks; tablet/desktop split — so the
 * three platforms read as genuinely different layouts.
 */
function HomeContent({ model, compact, wide }: { model: HomeScreenModel; compact: boolean; wide: boolean }) {
  return (
    <div className={`flex flex-col gap-4 ${compact ? "p-4" : "p-6"}`}>
      <div>
        <p className="text-gt-md text-gt-ink-2">{model.greeting}</p>
        <div className="flex items-baseline gap-3">
          <h2 className="font-gt-display text-gt-4xl font-extrabold text-gt-ink">{model.total}</h2>
          {model.delta ? <Badge tone={model.delta.tone}>{model.delta.label}</Badge> : null}
        </div>
        <p className="text-gt-sm text-gt-ink-3">{model.monthLabel}</p>
      </div>
      <div className={wide ? "grid grid-cols-2 items-start gap-4" : "flex flex-col gap-4"}>
        <MonthTreemapCard blocks={model.treemap} />
        <RecentTransactionsCard transactions={model.recent} />
      </div>
    </div>
  );
}

export function HomeScreen({
  platform = "mobile",
  ia = "redesigned",
  state = "default",
  menuOpen = false,
  chromeless = false,
}: HomeScreenProps) {
  const [drawerOpen, setDrawerOpen] = useState(menuOpen);
  const model = state === "empty" ? emptyHome : sampleHome;
  const items = ia === "current" ? currentNavCatalog : redesignedNavCatalog;
  const activeKey = ia === "current" ? "dashboard" : "inicio";

  if (platform === "desktop") {
    return (
      <AppSurface platform="desktop" chromeless={chromeless}>
        <div className="flex min-h-0 flex-1">
          <SideNav
            items={items}
            active={activeKey}
            footer={
              ia === "redesigned" ? (
                <div className="flex items-center gap-3 rounded-gt-lg border border-gt-line bg-gt-bg px-3 py-2">
                  <ProfileButton />
                  <span className="flex flex-col">
                    <span className="text-gt-md font-medium text-gt-ink">Benjamín</span>
                    <span className="text-gt-xs text-gt-ink-3">Plan gratuito</span>
                  </span>
                </div>
              ) : undefined
            }
          />
          <div className="flex min-w-0 flex-1 flex-col">
            <header className="flex h-14 shrink-0 items-center justify-end gap-3 border-b border-gt-line bg-gt-surface px-6">
              <BellIcon className="h-5 w-5 text-gt-ink-2" />
              {ia === "current" ? <ProfileButton /> : null}
            </header>
            <main className="min-h-0 flex-1 overflow-y-auto">
              <div className="mx-auto max-w-5xl">
                <HomeContent model={model} compact={false} wide />
              </div>
            </main>
          </div>
        </div>
      </AppSurface>
    );
  }

  return (
    <AppSurface platform={platform} chromeless={chromeless} className="relative">
      <AppHeader
        leading={
          ia === "current" ? (
            <button
              type="button"
              aria-label="Abrir menú"
              onClick={() => setDrawerOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-gt-lg text-gt-ink-2 hover:bg-gt-bg-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gt-primary"
            >
              <MenuIcon className="h-5 w-5" />
            </button>
          ) : undefined
        }
        trailing={
          <>
            <BellIcon className="h-5 w-5 text-gt-ink-2" />
            {ia === "current" ? <ProfileButton /> : null}
          </>
        }
      />
      <main className="min-h-0 flex-1 overflow-y-auto">
        <HomeContent model={model} compact={platform === "mobile"} wide={platform === "tablet"} />
      </main>
      {ia === "redesigned" ? <BottomNav items={items} active={activeKey} /> : null}
      {ia === "current" && drawerOpen ? (
        <NavDrawer items={items} active={activeKey} onClose={() => setDrawerOpen(false)} />
      ) : null}
    </AppSurface>
  );
}
