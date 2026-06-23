import { AppHeader } from "@design-system/organisms/Nav";
import { MerchantHeader } from "@design-system/molecules/MerchantHeader";
import { ItemGroup } from "@design-system/molecules/ItemGroup";
import { ItemRow } from "@design-system/molecules/ItemRow";
import { TransactionTotal } from "@design-system/molecules/TransactionTotal";
import type { Platform } from "@design-system/organisms/AppSurface";
import { sampleTxn, type TxnDetail } from "@lib/transactionFixtures";

/**
 * TransactionDetail (Phase 9) — the "items" half of Compras: a boleta detail
 * reached by tapping a transaction in ComprasScreen. Full-surface (rides
 * AppScaffold's overlay slot, like the filter / scan flows) with its own
 * `detail` back header. Assembles the settled detail molecules:
 *
 *   header → MerchantHeader (thumbnail · merchant · category + payment · meta)
 *   body   → one ItemGroup per L3 familia, each holding its ItemRows (L4)
 *   footer → TransactionTotal (the total folded into the save CTA; payment is
 *            shown in the header, so it is omitted here per DM-9)
 *
 * Editable framing (the legacy EditView): the header edit pencil, tappable
 * payment chip, and "Guardar cambios" CTA are wired to parent-owned handlers.
 */
export interface TransactionDetailProps {
  txn?: TxnDetail;
  onBack?: () => void;
  onEdit?: () => void;
  /** tap the payment chip — opens the PaymentPicker (parent-owned). */
  onPaymentClick?: () => void;
  onSave?: () => void;
  platform?: Platform;
}

export function TransactionDetail({ txn = sampleTxn, onBack, onEdit, onPaymentClick, onSave, platform = "mobile" }: TransactionDetailProps) {
  const itemCount = txn.groups.reduce((n, g) => n + g.items.length, 0);
  // desktop: cap + center the single column (it never fills the wide pane).
  const contentMax = platform === "desktop" ? "44rem" : undefined;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-gt-bg">
      <AppHeader variant="detail" title="Boleta" onBack={onBack} />

      <div className="min-h-0 flex-1 overflow-y-auto px-gt-16 pb-gt-16">
        <div className="mx-auto flex w-full flex-col gap-gt-16 pt-gt-12" style={{ maxWidth: contentMax }}>
          <MerchantHeader txn={txn} onEdit={onEdit} onPaymentClick={onPaymentClick} />

          <div className="flex flex-col gap-gt-12">
            {txn.groups.map((group) => {
              const subtotal = group.items.reduce((sum, it) => sum + it.total, 0);
              return (
                <ItemGroup key={group.familia} familia={group.familia} total={subtotal} count={group.items.length}>
                  {group.items.map((item, i) => (
                    <ItemRow key={`${group.familia}-${i}`} item={item} />
                  ))}
                </ItemGroup>
              );
            })}
          </div>
        </div>
      </div>

      {/* sticky total footer (full-width chrome, inner content centered on desktop) */}
      <div className="shrink-0 border-t-2 border-gt-line bg-gt-surface px-gt-16 py-gt-12">
        <div className="mx-auto w-full" style={{ maxWidth: contentMax }}>
          <TransactionTotal total={txn.total} itemCount={itemCount} onSave={onSave} saveLabel="Guardar cambios" />
        </div>
      </div>
    </div>
  );
}
