import { Link } from "@tanstack/react-router";
import { PixelIcon } from "@/components/shell/PixelIcon";
import { useI18n } from "@/hooks/useI18n";
import { formatDate, formatMinorAmount } from "@/lib/format";
import type { components } from "@/lib/api-types";

type Txn = components["schemas"]["TransactionListItem"];

function RecentRow({ txn }: { txn: Txn }) {
  const { t } = useI18n();
  const items = txn.item_count ?? 0;
  return (
    <li>
      <Link
        to="/transactions/$transactionId"
        params={{ transactionId: txn.id }}
        className="flex items-center gap-gt-12 rounded-gt-lg px-gt-2 py-gt-10 transition hover:bg-gt-bg-3"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-gt-lg border-2 border-gt-line-strong bg-gt-bg-3">
          <PixelIcon name="fin-receipt" size={22} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-gt-2">
          <span className="truncate font-gt-display text-gt-md font-extrabold text-gt-ink">{txn.merchant}</span>
          <span className="flex items-center gap-gt-4 text-gt-xs font-bold text-gt-ink-3">
            <PixelIcon name="chart-calendar" size={12} />
            {formatDate(txn.transaction_date)}
            {items > 0 ? (
              <>
                <span className="text-gt-line-strong">·</span> {items} {items === 1 ? t("home.item") : t("home.items")}
              </>
            ) : null}
          </span>
        </span>
        <span className="shrink-0 font-gt-display text-gt-md font-extrabold tabular-nums text-gt-ink">
          {formatMinorAmount(txn.total_minor, txn.currency)}
        </span>
      </Link>
    </li>
  );
}

/**
 * RecentTransactionsCard — the home "Recientes" feed: the latest movements as a
 * bare edge-to-edge list (thumbnail + merchant + date · items + amount), each
 * row linking to its detail, with a "Ver todo →" link to /transactions. Ports
 * design-lab RecentTransactionsCard, wired to useTransactions.
 */
export function RecentTransactionsCard({ transactions }: { transactions: Txn[] }) {
  const { t } = useI18n();
  return (
    <section data-testid="home-recent" className="flex flex-col gap-gt-8">
      <div className="flex items-center justify-between gap-gt-8">
        <h3 className="font-gt-display text-gt-lg font-extrabold text-gt-ink">{t("home.recentTitle")}</h3>
        {transactions.length > 0 ? (
          <Link to="/transactions" className="text-gt-sm font-extrabold text-gt-primary hover:underline">
            {t("home.viewAll")} →
          </Link>
        ) : null}
      </div>
      {transactions.length === 0 ? (
        <p className="py-gt-16 text-center text-gt-sm font-medium text-gt-ink-3">{t("home.recentEmpty")}</p>
      ) : (
        <ul className="flex flex-col divide-y-2 divide-gt-line">
          {transactions.map((txn) => (
            <RecentRow key={txn.id} txn={txn} />
          ))}
        </ul>
      )}
    </section>
  );
}
