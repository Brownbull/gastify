import type { Meta, StoryObj } from "@storybook/react-vite";
import { AppSurface, platformFromGlobals } from "@design-system/organisms/AppSurface";
import { sampleTxn } from "@lib/transactionFixtures";
import { TransactionDetail } from "./TransactionDetail";
import { SUPERMARKET_TXN } from "../model/detailFixtures";

/**
 * Features/Purchases/Screens/TransactionDetail — the boleta detail (the "items"
 * half of Compras), reached by tapping a transaction in PurchasesScreen. Full-
 * surface with a `detail` back header: MerchantHeader · familia-grouped
 * ItemGroups · the total folded into the save CTA. Platform toolbar switches
 * device; the integration (list → detail) lives in the PurchasesScreen story.
 */
const meta: Meta = {
  title: "Features/Purchases/Screens/TransactionDetail",
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj;

/** Smaller 2-group restaurant boleta. */
export const Default: Story = {
  render: (_args, { globals }) => {
    const platform = platformFromGlobals(globals);
    return (
      <AppSurface platform={platform}>
        <TransactionDetail txn={sampleTxn} platform={platform} onBack={() => {}} onSave={() => {}} onDelete={() => {}} />
      </AppSurface>
    );
  },
};

/** Richer 3-group supermarket boleta (food-fresh · food-packaged · hogar). */
export const Supermercado: Story = {
  render: (_args, { globals }) => {
    const platform = platformFromGlobals(globals);
    return (
      <AppSurface platform={platform}>
        <TransactionDetail txn={SUPERMARKET_TXN} platform={platform} onBack={() => {}} onSave={() => {}} onDelete={() => {}} />
      </AppSurface>
    );
  },
};

/** Locked — matched to a statement line (read-only; edit it by deleting the reconciliation). */
export const Matched: Story = {
  render: (_args, { globals }) => {
    const platform = platformFromGlobals(globals);
    return (
      <AppSurface platform={platform}>
        <TransactionDetail txn={SUPERMARKET_TXN} platform={platform} locked={{ reason: "matched" }} onBack={() => {}} />
      </AppSurface>
    );
  },
};

/** Locked — shared into a group (read-only). */
export const Shared: Story = {
  render: (_args, { globals }) => {
    const platform = platformFromGlobals(globals);
    return (
      <AppSurface platform={platform}>
        <TransactionDetail txn={sampleTxn} platform={platform} locked={{ reason: "shared", groupName: "Familia González" }} onBack={() => {}} />
      </AppSurface>
    );
  },
};
