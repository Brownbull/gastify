import { Suspense, lazy, useEffect, useMemo, useRef } from "react";
import { Sparkline } from "@/components/charts/Sparkline";
import { useInsightsTree, useMonthlyInsights, type InsightDimension } from "@/hooks/useInsights";
import { useI18n } from "@/hooks/useI18n";
import { treeNodesToSlices } from "@/lib/chartData";
import { formatMinorAmount } from "@/lib/format";
import {
  buildReportInsight,
  renderReportInsight,
  type ReportHighlight,
} from "@/lib/reportInsights";
import type { components } from "@/lib/api-types";

const CategoryDonut = lazy(() => import("@/components/charts/CategoryDonut"));

type TreeNode = components["schemas"]["InsightsTreeNode"];

export interface ReportDetailCard {
  /** A report period key (YYYY-MM month, YYYY-Qn quarter, or YYYY year). The detail
   *  overlay opens for month/quarter/year (Phase 3 lifted the D77 month-only limit on
   *  /insights/tree + /monthly); week cards are excluded at the call site. */
  period: string;
  periodLabel: string;
  total: number;
  count: number;
  trend: "up" | "down" | "flat" | null;
  deltaPct: number | null;
  currency: string;
}

interface ReportDetailOverlayProps {
  card: ReportDetailCard;
  onClose: () => void;
  /** Drill into the underlying transactions for this report's period (legacy "view transactions"). */
  onViewTransactions: (period: string) => void;
}

/**
 * Legacy "Resumen" report detail — tap a month report → a hierarchical, grouped
 * breakdown by store AND by product/item, each as a donut + group cards, reusing
 * the existing `/insights/tree` (D69) + `CategoryDonut`. Persona insight + highlights
 * (Phase 2) and trend sparklines + quarter/year support (Phase 3) layer onto this.
 */
export function ReportDetailOverlay({ card, onClose, onViewTransactions }: ReportDetailOverlayProps) {
  const { t } = useI18n();
  const panelRef = useRef<HTMLDivElement>(null);
  // Keep the latest onClose without re-subscribing the listener every parent render.
  // (Written in an effect — ref writes during render break React's render purity.)
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // Mount-once: Escape closes, and focus moves into the dialog (WCAG 2.4.3).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    panelRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div
      data-testid="report-detail-overlay"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-gt-ink/45 p-4 sm:p-8"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-detail-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl space-y-gt-16 rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface p-gt-16 shadow-gt-md outline-none"
      >
        <div className="flex items-start justify-between gap-gt-10">
          <h2
            id="report-detail-title"
            className="font-gt-display text-gt-lg font-extrabold text-gt-ink"
          >
            {card.periodLabel}
          </h2>
          <button
            data-testid="report-detail-close"
            onClick={onClose}
            aria-label={t("reports.detail.close")}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-gt-lg border-2 border-gt-line-strong bg-gt-surface text-gt-lg font-extrabold text-gt-ink shadow-gt-xs transition hover:bg-gt-bg-3"
          >
            ×
          </button>
        </div>

        <Hero card={card} />

        <InsightBlock card={card} />

        <button
          data-testid="report-detail-view-transactions"
          onClick={() => onViewTransactions(card.period)}
          className="w-full rounded-gt-xl border-2 border-gt-line-strong bg-gt-primary-soft px-gt-16 py-gt-10 font-gt-display text-gt-sm font-extrabold text-gt-primary shadow-gt-xs transition duration-150 ease-gt-bounce hover:-translate-y-0.5"
        >
          {t("reports.detail.viewTransactions")}
        </button>

        <GroupBreakdown
          period={card.period}
          dimension="transaction_category"
          title={t("reports.detail.byStore")}
          testId="report-detail-store"
        />
        <GroupBreakdown
          period={card.period}
          dimension="item_category"
          title={t("reports.detail.byItem")}
          testId="report-detail-item"
        />
      </div>
    </div>
  );
}

function Hero({ card }: { card: ReportDetailCard }) {
  const { t } = useI18n();
  const trendClass =
    card.trend === "up" ? "text-gt-error" : card.trend === "down" ? "text-gt-positive" : "text-gt-ink-3";
  const arrow = card.trend === "up" ? "▲" : card.trend === "down" ? "▼" : "—";
  return (
    <div className="rounded-gt-2xl border-2 border-gt-line-strong bg-gt-primary-soft p-gt-16 text-center shadow-gt-sm">
      <p className="font-gt-display text-gt-3xl font-extrabold tabular-nums text-gt-ink">
        {formatMinorAmount(card.total, card.currency)}
      </p>
      <p className="mt-gt-2 text-gt-xs font-bold text-gt-ink-3">
        {card.count} {t("reports.transactions")}
      </p>
      {card.trend && (
        <p className={`mt-gt-4 text-gt-sm font-extrabold ${trendClass}`}>
          {arrow}
          {card.deltaPct != null ? ` ${Math.abs(card.deltaPct).toFixed(1)}%` : ""}
        </p>
      )}
    </div>
  );
}

/** Persona insight sentence + highlights ("trophies"), sourced from the month's
 *  `/insights/monthly` gravity_centers + top categories (Phase 2). */
function InsightBlock({ card }: { card: ReportDetailCard }) {
  const { t } = useI18n();
  const monthly = useMonthlyInsights(card.period);
  const { insight, highlights } = useMemo(
    () =>
      monthly.data
        ? buildReportInsight(monthly.data, card)
        : { insight: null, highlights: [] as ReportHighlight[] },
    [monthly.data, card],
  );

  if (!insight && highlights.length === 0) return null;
  const highlightLabel: Record<ReportHighlight["key"], string> = {
    leader: t("reports.highlight.leader"),
    rise: t("reports.highlight.rise"),
    drop: t("reports.highlight.drop"),
  };

  return (
    <div data-testid="report-detail-insight" className="space-y-gt-10">
      {insight && (
        <div className="rounded-gt-2xl border-2 border-gt-line-strong bg-gt-primary-soft p-gt-12 shadow-gt-sm">
          <p className="text-gt-xs font-extrabold uppercase tracking-wide text-gt-primary">
            💡 {t("reports.insight.title")}
          </p>
          <p className="mt-gt-2 text-gt-sm font-medium text-gt-ink">{renderReportInsight(insight, t)}</p>
        </div>
      )}
      {highlights.length > 0 && (
        <div>
          <p className="mb-gt-6 font-gt-display text-gt-sm font-extrabold text-gt-ink">
            {t("reports.highlights.title")}
          </p>
          <ul className="space-y-gt-4">
            {highlights.map((h) => (
              <li
                key={h.key}
                data-testid={`report-detail-highlight-${h.key}`}
                className="flex items-center justify-between gap-gt-8 rounded-gt-lg border-2 border-gt-line bg-gt-surface px-gt-10 py-gt-6 text-gt-sm"
              >
                <span className="font-bold text-gt-ink-3">{highlightLabel[h.key]}</span>
                <span className="font-extrabold text-gt-ink">
                  {h.category} · {h.metric}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function GroupBreakdown({
  period,
  dimension,
  title,
  testId,
}: {
  period: string;
  dimension: InsightDimension;
  title: string;
  testId: string;
}) {
  const { t } = useI18n();
  // include_series=true: the report detail is the only consumer that wants the
  // per-root within-period series for the group-card sparklines.
  const tree = useInsightsTree(period, dimension, undefined, true);
  const roots = tree.data?.roots ?? [];
  const total = tree.data?.total_spend_minor ?? 0;
  const currency = tree.data?.currency ?? "CLP";
  const slices = treeNodesToSlices(roots, total);
  const hasData = roots.length > 0;

  return (
    <section data-testid={testId} className="space-y-gt-10">
      <h3 className="font-gt-display text-gt-md font-extrabold text-gt-ink">{title}</h3>
      {tree.isLoading ? (
        <p className="py-gt-16 text-center text-gt-sm font-medium text-gt-ink-3">
          {t("reports.detail.loading")}
        </p>
      ) : tree.error ? (
        <p className="py-gt-16 text-center text-gt-sm font-bold text-gt-error" role="alert">
          {t("reports.detail.loadError")}
        </p>
      ) : !hasData ? (
        <p className="py-gt-16 text-center text-gt-sm font-medium text-gt-ink-3">
          {t("reports.detail.noBreakdown")}
        </p>
      ) : (
        <>
          <Suspense fallback={<div className="h-40" aria-busy="true" />}>
            <CategoryDonut slices={slices} currency={currency} />
          </Suspense>
          <ul className="space-y-gt-8">
            {roots.map((node) => (
              <GroupCard key={node.key} node={node} parentTotal={total} currency={currency} />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function GroupCard({
  node,
  parentTotal,
  currency,
}: {
  node: TreeNode;
  parentTotal: number;
  currency: string;
}) {
  const pct = parentTotal > 0 ? (node.total_minor / parentTotal) * 100 : 0;
  const children = node.children ?? [];
  return (
    <li
      data-testid="report-detail-group"
      className="rounded-gt-xl border-2 border-gt-line-strong bg-gt-surface p-gt-10 shadow-gt-xs"
    >
      <div className="flex items-center justify-between gap-gt-8">
        <span className="truncate font-gt-display text-gt-sm font-extrabold text-gt-ink">{node.label}</span>
        <div className="flex shrink-0 items-center gap-gt-6">
          {node.series && node.series.length > 1 && (
            <Sparkline
              points={node.series.map((point) => point.total_spend_minor)}
              ariaLabel={`${node.label} spend trend over the period`}
            />
          )}
          <span className="font-gt-display text-gt-sm font-extrabold tabular-nums text-gt-ink">
            {formatMinorAmount(node.total_minor, currency)}
            <span className="ml-gt-2 text-gt-xs font-bold text-gt-ink-3">{pct.toFixed(0)}%</span>
          </span>
        </div>
      </div>
      {children.length > 0 && (
        <ul className="mt-gt-6 space-y-gt-2 border-t-2 border-gt-line pt-gt-6">
          {children.map((child) => (
            <li key={child.key} className="flex items-center justify-between gap-gt-8 text-gt-sm font-bold text-gt-ink-2">
              <span className="truncate">{child.label}</span>
              <span className="shrink-0 tabular-nums">{formatMinorAmount(child.total_minor, currency)}</span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
