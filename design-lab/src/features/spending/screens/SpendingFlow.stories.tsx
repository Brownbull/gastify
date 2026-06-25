import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { AppSurface, platformFromGlobals, type Platform } from "@design-system/organisms/AppSurface";
import { AppScaffold } from "@design-system/organisms/AppScaffold";
import { AppHeader, HeaderAction } from "@design-system/organisms/Nav";
import { PurchasesScreen } from "@features/purchases/screens/PurchasesScreen";
import { SpendingScreen } from "./SpendingScreen";
import { CategoryDetailScreen } from "./CategoryDetailScreen";
import { SPEND_REPS, type SpendRepresentation } from "../components/TrendsRepresentations";
import { BROWSE_TRANSACTIONS } from "@lib/browseFixtures";
import { getCategoryToken } from "@lib/categoryTokens";

/**
 * Flows/Spending — the analytics drill journey end-to-end inside AppScaffold
 * (use the platform toolbar for mobile/tablet/desktop):
 *   dashboard (Gastos) → drill (tap a category's count pill → its CategoryDetail)
 *   → list ("Ver todas las transacciones" → the full Compras list filtered to that
 *   category). Each step's back arrow returns to the previous one.
 */
function SpendingJourney({ platform }: { platform: Platform }) {
  const [rep, setRep] = useState<SpendRepresentation>("donut");
  const [detailCat, setDetailCat] = useState<string | null>(null);
  const [listCat, setListCat] = useState<string | null>(null);

  const switcher = SPEND_REPS.map((r) => (
    <HeaderAction key={r.id} icon={r.icon} label={r.label} active={rep === r.id} onClick={() => setRep(r.id)} />
  ));

  const filteredGroups = listCat
    ? BROWSE_TRANSACTIONS.map((g) => ({ ...g, transactions: g.transactions.filter((t) => t.category === listCat) })).filter((g) => g.transactions.length > 0)
    : [];

  let overlay;
  if (listCat) {
    overlay = (
      <div className="flex h-full flex-col bg-gt-bg">
        <AppHeader variant="detail" title={`Movimientos · ${getCategoryToken(listCat).label}`} onBack={() => setListCat(null)} />
        <div className="min-h-0 flex-1">
          <PurchasesScreen groups={filteredGroups} platform={platform} />
        </div>
      </div>
    );
  } else if (detailCat) {
    overlay = (
      <CategoryDetailScreen
        categoryId={detailCat}
        platform={platform}
        onBack={() => setDetailCat(null)}
        onOpenTransactions={() => setListCat(detailCat)}
      />
    );
  }

  return (
    <AppScaffold platform={platform} active="spending" title="Gastos" headerActions={switcher} overlay={overlay}>
      <SpendingScreen platform={platform} rep={rep} onOpenCategory={setDetailCat} />
    </AppScaffold>
  );
}

const meta: Meta = {
  title: "Flows/Spending",
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj;

/** Dashboard → drill → list. Tap a category's count pill, then "Ver todas las transacciones". */
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
