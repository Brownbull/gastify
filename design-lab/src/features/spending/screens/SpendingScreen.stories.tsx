import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { AppSurface, platformFromGlobals, type Platform } from "@design-system/organisms/AppSurface";
import { AppScaffold } from "@design-system/organisms/AppScaffold";
import { AppHeader, HeaderAction } from "@design-system/organisms/Nav";
import { ScanModeChooserScreen } from "@features/scan/screens/ScanModeChooserScreen";
import { PurchasesScreen } from "@features/purchases/screens/PurchasesScreen";
import { SpendingScreen } from "./SpendingScreen";
import { CategoryDetailScreen } from "./CategoryDetailScreen";
import { ItemsBrowseContent } from "./ItemsBrowseContent";
import { SPEND_REPS, type SpendRepresentation } from "../components/TrendsRepresentations";
import { BROWSE_TRANSACTIONS } from "@lib/browseFixtures";
import { getCategoryToken } from "@lib/categoryTokens";
import { type CountMode } from "@lib/analyticsFixtures";

/**
 * Features/Spending/Screens/SpendingScreen — the analytics tab inside AppScaffold.
 * Gastos shows the three spending representations; Dona / Mapa / Flujo are
 * switched from the HEADER (diagram icon buttons next to the profile, Gustify
 * pattern). The dimension picker + draggable period bar live in-screen. On
 * Dona/Mapa a section ICON opens its detail; a section COUNT pill opens its
 * history (transactions → Compras · items → Productos). The full journey also
 * lives in `Flows/Spending`.
 */
const meta: Meta = {
  title: "Features/Spending/Screens/SpendingScreen",
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj;

function GastosInShell({ platform }: { platform: Platform }) {
  const [scanOpen, setScanOpen] = useState(false);
  const [rep, setRep] = useState<SpendRepresentation>("donut");
  const [detailCat, setDetailCat] = useState<string | null>(null);
  const [history, setHistory] = useState<{ id: string; mode: CountMode } | null>(null);

  // the diagram switcher (donut / treemap / sankey) lives in the header, next to
  // the profile avatar — the slot the old Tendencias/Reportes switcher used.
  const switcher = SPEND_REPS.map((r) => (
    <HeaderAction key={r.id} icon={r.icon} label={r.label} active={rep === r.id} onClick={() => setRep(r.id)} />
  ));

  // a section ICON → its detail; a section COUNT pill → its history filtered by
  // the count toggle (transactions → Compras list · items → Productos).
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
      <CategoryDetailScreen categoryId={cat} platform={platform} onBack={() => setDetailCat(null)} onOpenTransactions={() => setHistory({ id: cat, mode: "transactions" })} />
    );
  } else if (scanOpen) {
    overlay = (
      <ScanModeChooserScreen
        onClose={() => setScanOpen(false)}
        onSingle={() => setScanOpen(false)}
        onStatement={() => setScanOpen(false)}
        onManual={() => setScanOpen(false)}
      />
    );
  }

  return (
    <AppScaffold
      platform={platform}
      active="spending"
      title="Gastos"
      headerActions={switcher}
      onScan={() => setScanOpen(true)}
      overlay={overlay}
    >
      <SpendingScreen
        platform={platform}
        rep={rep}
        onOpenCategory={setDetailCat}
        onOpenHistory={(id, mode) => setHistory({ id, mode })}
      />
    </AppScaffold>
  );
}

export const Default: Story = {
  render: (_args, { globals }) => {
    const platform = platformFromGlobals(globals);
    return (
      <AppSurface platform={platform}>
        <GastosInShell platform={platform} />
      </AppSurface>
    );
  },
};
