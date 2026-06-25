import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { AppSurface, platformFromGlobals, type Platform } from "@design-system/organisms/AppSurface";
import { AppScaffold } from "@design-system/organisms/AppScaffold";
import { FilterSheet, type FilterSelection } from "@design-system/organisms/FilterSheet";
import { BROWSE_FACETS, BROWSE_TXN_COUNT, type BrowseTransaction } from "@lib/browseFixtures";
import { ScanModeChooserScreen } from "@features/scan/screens/ScanModeChooserScreen";
import { PurchasesScreen } from "./PurchasesScreen";
import { TransactionDetail } from "./TransactionDetail";
import { NewTransactionScreen } from "./NewTransactionScreen";
import { pickDetailFor } from "../model/detailFixtures";

/**
 * Features/Purchases/Screens/PurchasesScreen — the transactions browse, rendered
 * inside AppScaffold (`bleed` mode so the screen owns its sticky search/filter
 * band + scroll + filter overlay). The "+" FAB opens the scan mode chooser; the
 * filter button opens the FilterSheet. Platform toolbar switches device.
 */
const meta: Meta = {
  title: "Features/Purchases/Screens/PurchasesScreen",
  // fullscreen so the desktop scaffold (SideNav + content pane) gets real width.
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj;

function ComprasInShell({ platform }: { platform: Platform }) {
  const [scanOpen, setScanOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selection, setSelection] = useState<FilterSelection>({});
  const [detailTxn, setDetailTxn] = useState<BrowseTransaction | null>(null);

  const sheet = (
    <FilterSheet
      facets={BROWSE_FACETS}
      selection={selection}
      title="Buscar compras"
      matchCount={BROWSE_TXN_COUNT}
      matchNoun="compras"
      onApply={(s) => { setSelection(s); setFilterOpen(false); }}
      onClear={() => { setSelection({}); setFilterOpen(false); }}
      onClose={() => setFilterOpen(false)}
      className={platform === "desktop" ? "h-full w-full" : "h-full w-full rounded-none! border-0!"}
    />
  );
  // the filter rides AppScaffold's overlay slot. Mobile/tablet: fills the whole
  // frame. Desktop: a dimmed backdrop over the content pane with the form capped
  // at a max width and centered (it never uses the full pane width).
  const overlay = detailTxn ? (
    <TransactionDetail txn={pickDetailFor(detailTxn)} platform={platform} onBack={() => setDetailTxn(null)} onDelete={() => setDetailTxn(null)} />
  ) : newOpen ? (
    <NewTransactionScreen platform={platform} onCancel={() => setNewOpen(false)} onCreate={() => setNewOpen(false)} />
  ) : filterOpen ? (
    platform === "desktop" ? (
      <div className="flex h-full w-full justify-center bg-gt-ink/30 px-gt-16 py-gt-16">
        <div className="flex h-full w-full flex-col" style={{ maxWidth: "44rem" }}>{sheet}</div>
      </div>
    ) : (
      sheet
    )
  ) : scanOpen ? (
    <ScanModeChooserScreen
      onClose={() => setScanOpen(false)}
      onSingle={() => setScanOpen(false)}
      onStatement={() => setScanOpen(false)}
      onManual={() => { setScanOpen(false); setNewOpen(true); }}
    />
  ) : undefined;

  return (
    <AppScaffold
      platform={platform}
      active="purchases"
      title="Compras"
      bleed
      onScan={() => setScanOpen(true)}
      overlay={overlay}
    >
      <PurchasesScreen platform={platform} selection={selection} onOpenFilter={() => setFilterOpen(true)} onSelectTxn={setDetailTxn} />
    </AppScaffold>
  );
}

export const Default: Story = {
  render: (_args, { globals }) => {
    const platform = platformFromGlobals(globals);
    return (
      <AppSurface platform={platform}>
        <ComprasInShell platform={platform} />
      </AppSurface>
    );
  },
};
