import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { AppSurface, platformFromGlobals, type Platform } from "@design-system/organisms/AppSurface";
import { AppScaffold } from "@design-system/organisms/AppScaffold";
import { AppHeader, HeaderAction } from "@design-system/organisms/Nav";
import { PurchasesScreen } from "@features/purchases/screens/PurchasesScreen";
import { ItemsBrowseContent } from "./ItemsBrowseContent";
import { SpendingScreen } from "./SpendingScreen";
import { CategoryDetailScreen } from "./CategoryDetailScreen";
import { SPEND_REPS, type SpendRepresentation } from "../components/TrendsRepresentations";
import { BROWSE_TRANSACTIONS } from "@lib/browseFixtures";
import { getCategoryToken } from "@lib/categoryTokens";
import { type CountMode } from "@lib/analyticsFixtures";

/**
 * Flows/Spending — the analytics drill journey end-to-end inside AppScaffold
 * (use the platform toolbar for mobile/tablet/desktop). Two distinct targets on
 * the donut (Dona) + treemap (Mapa):
 *   • a section's ICON (donut legend left / treemap cell icon-label) → its
 *     **detail report** (CategoryDetailScreen);
 *   • a section's COUNT pill → that section's **history** filtered by the count
 *     toggle: transactions → the Compras list for that category; items → Productos.
 * Each overlay's back arrow returns to the dashboard.
 *
 * Note: items history (Productos) is keyed by item-category in the fixtures, not
 * by the L1 rubro, so the items view shows the full Productos list under the
 * section header — the real L1→item filter is a backend/data join.
 */
function SpendingJourney({ platform }: { platform: Platform }) {
  const [rep, setRep] = useState<SpendRepresentation>("donut");
  const [detailCat, setDetailCat] = useState<string | null>(null);
  const [history, setHistory] = useState<{ id: string; mode: CountMode } | null>(null);

  const switcher = SPEND_REPS.map((r) => (
    <HeaderAction key={r.id} icon={r.icon} label={r.label} active={rep === r.id} onClick={() => setRep(r.id)} />
  ));

  let overlay;
  if (history) {
    const label = getCategoryToken(history.id).label;
    if (history.mode === "transactions") {
      const groups = BROWSE_TRANSACTIONS.map((g) => ({ ...g, transactions: g.transactions.filter((t) => t.category === history.id) })).filter((g) => g.transactions.length > 0);
      overlay = (
        <div className="flex h-full flex-col bg-gt-bg">
          <AppHeader variant="detail" title={`Movimientos · ${label}`} onBack={() => setHistory(null)} />
          <div className="min-h-0 flex-1"><PurchasesScreen groups={groups} platform={platform} /></div>
        </div>
      );
    } else {
      overlay = (
        <div className="flex h-full flex-col bg-gt-bg">
          <AppHeader variant="detail" title={`Productos · ${label}`} onBack={() => setHistory(null)} />
          <div className="min-h-0 flex-1"><ItemsBrowseContent /></div>
        </div>
      );
    }
  } else if (detailCat) {
    const cat = detailCat;
    overlay = (
      <CategoryDetailScreen
        categoryId={cat}
        platform={platform}
        onBack={() => setDetailCat(null)}
        onOpenTransactions={() => setHistory({ id: cat, mode: "transactions" })}
      />
    );
  }

  return (
    <AppScaffold platform={platform} active="spending" title="Gastos" headerActions={switcher} overlay={overlay}>
      <SpendingScreen
        platform={platform}
        rep={rep}
        onOpenCategory={setDetailCat}
        onOpenHistory={(id, mode) => setHistory({ id, mode })}
      />
    </AppScaffold>
  );
}

const meta: Meta = {
  title: "Flows/Spending",
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj;

/** Tap a section ICON → its detail; tap a section COUNT pill → its transactions (or items, via the count toggle) in history. */
export const Spending: Story = {
  render: (_args, { globals }) => {
    const platform = platformFromGlobals(globals);
    return (
      <AppSurface platform={platform}>
        <SpendingJourney platform={platform} />
      </AppSurface>
    );
  },
};
