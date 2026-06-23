import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { AppSurface, platformFromGlobals, type Platform } from "@design-system/organisms/AppSurface";
import { AppScaffold } from "@design-system/organisms/AppScaffold";
import { HeaderAction } from "@design-system/organisms/Nav";
import { FilterSheet, type FilterSelection } from "@design-system/organisms/FilterSheet";
import { BROWSE_FACETS, BROWSE_TXN_COUNT, type BrowseTransaction } from "@lib/browseFixtures";
import { ScanModeChooserScreen } from "@features/scan/screens/ScanModeChooserScreen";
import { TransactionDetail } from "@features/compras/screens/TransactionDetail";
import { pickDetailFor } from "@features/compras/model/detailFixtures";
import { HistorialScreen, type HistorialSub } from "./HistorialScreen";

/**
 * Features/Historial/Screens/HistorialScreen — the 4th-tab Historial hub inside
 * AppScaffold (active="historial", bleed). The header switcher (Transacciones ·
 * Productos · Reportes, icons next to the profile) drives the subsection. The "+"
 * FAB opens the scan chooser; on Transacciones the filter button opens the
 * FilterSheet over AppScaffold's overlay. Platform toolbar switches device.
 */
const meta: Meta = {
  title: "Features/Historial/Screens/HistorialScreen",
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj;

const SUBS: { id: HistorialSub; label: string; icon: string }[] = [
  { id: "transacciones", label: "Transacciones", icon: "nav-history" },
  { id: "productos", label: "Productos", icon: "item-pantry" },
  { id: "reportes", label: "Reportes", icon: "nav-reports" },
];

function HistorialInShell({ platform }: { platform: Platform }) {
  const [sub, setSub] = useState<HistorialSub>("transacciones");
  const [scanOpen, setScanOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selection, setSelection] = useState<FilterSelection>({});
  const [detailTxn, setDetailTxn] = useState<BrowseTransaction | null>(null);

  const switcher = SUBS.map((s) => (
    <HeaderAction key={s.id} icon={s.icon} label={s.label} active={sub === s.id} onClick={() => setSub(s.id)} />
  ));
  // header title reflects the active subsection (never the generic "Historial").
  // `sub` is exhaustive over SUBS, so the fallback never renders — kept as a guard
  // against future drift, and it still avoids the generic "Historial" string.
  const title = SUBS.find((s) => s.id === sub)?.label ?? SUBS[0].label;

  // the Compras filter sheet rides AppScaffold's overlay slot (only on Transacciones).
  const sheet = (
    <FilterSheet
      facets={BROWSE_FACETS}
      selection={selection}
      title="Buscar transacciones"
      matchCount={BROWSE_TXN_COUNT}
      matchNoun="transacciones"
      onApply={(s) => { setSelection(s); setFilterOpen(false); }}
      onClear={() => { setSelection({}); setFilterOpen(false); }}
      onClose={() => setFilterOpen(false)}
      className={platform === "desktop" ? "h-full w-full" : "h-full w-full rounded-none! border-0!"}
    />
  );
  const overlay = detailTxn ? (
    <TransactionDetail txn={pickDetailFor(detailTxn)} platform={platform} onBack={() => setDetailTxn(null)} onDelete={() => setDetailTxn(null)} />
  ) : sub === "transacciones" && filterOpen ? (
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
        onManual={() => setScanOpen(false)}
      />
    ) : undefined;

  return (
    <AppScaffold
      platform={platform}
      active="historial"
      title={title}
      bleed
      headerActions={switcher}
      onScan={() => setScanOpen(true)}
      overlay={overlay}
    >
      <HistorialScreen
        platform={platform}
        sub={sub}
        comprasSelection={selection}
        onOpenComprasFilter={() => setFilterOpen(true)}
        onSelectTxn={setDetailTxn}
      />
    </AppScaffold>
  );
}

export const Default: Story = {
  render: (_args, { globals }) => {
    const platform = platformFromGlobals(globals);
    return (
      <AppSurface platform={platform}>
        <HistorialInShell platform={platform} />
      </AppSurface>
    );
  },
};
