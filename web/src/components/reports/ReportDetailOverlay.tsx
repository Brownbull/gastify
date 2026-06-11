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
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8"
      style={{ backgroundColor: "color-mix(in srgb, var(--text) 45%, transparent)" }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-detail-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl space-y-5 rounded-2xl p-5 shadow-xl outline-none"
        style={{ backgroundColor: "var(--bg)", borderColor: "var(--border)" }}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="report-detail-title" className="text-lg font-semibold" style={{ color: "var(--text)" }}>
            {card.periodLabel}
          </h2>
          <button
            data-testid="report-detail-close"
            onClick={onClose}
            aria-label={t("reports.detail.close")}
            className="rounded-lg px-2 py-1 text-lg"
            style={{ color: "var(--text-muted)" }}
          >
            ×
          </button>
        </div>

        <Hero card={card} />

        <InsightBlock card={card} />

        <button
          data-testid="report-detail-view-transactions"
          onClick={() => onViewTransactions(card.period)}
          className="w-full rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          style={{ color: "var(--primary)", backgroundColor: "var(--primary-light)" }}
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
  const trendColor =
    card.trend === "up" ? "var(--error)" : card.trend === "down" ? "var(--success)" : "var(--text-muted)";
  const arrow = card.trend === "up" ? "▲" : card.trend === "down" ? "▼" : "—";
  return (
    <div
      className="rounded-xl p-5 text-center"
      style={{ backgroundColor: "var(--primary-light)" }}
    >
      <p className="text-3xl font-bold tabular-nums" style={{ color: "var(--text)" }}>
        {formatMinorAmount(card.total, card.currency)}
      </p>
      <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
        {card.count} {t("reports.transactions")}
      </p>
      {card.trend && (
        <p className="mt-2 text-sm font-semibold" style={{ color: trendColor }}>
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
    <div data-testid="report-detail-insight" className="space-y-3">
      {insight && (
        <div
          className="rounded-xl border p-4"
          style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
            💡 {t("reports.insight.title")}
          </p>
          <p className="mt-1 text-sm" style={{ color: "var(--text)" }}>
            {renderReportInsight(insight, t)}
          </p>
        </div>
      )}
      {highlights.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-semibold" style={{ color: "var(--text)" }}>
            {t("reports.highlights.title")}
          </p>
          <ul className="space-y-1.5">
            {highlights.map((h) => (
              <li
                key={h.key}
                data-testid={`report-detail-highlight-${h.key}`}
                className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}
              >
                <span style={{ color: "var(--text-muted)" }}>{highlightLabel[h.key]}</span>
                <span className="font-medium" style={{ color: "var(--text)" }}>
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
    <section data-testid={testId} className="space-y-3">
      <h3 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
        {title}
      </h3>
      {tree.isLoading ? (
        <p className="py-6 text-center text-sm" style={{ color: "var(--text-muted)" }}>
          {t("reports.detail.loading")}
        </p>
      ) : tree.error ? (
        <p className="py-6 text-center text-sm" style={{ color: "var(--error)" }} role="alert">
          {t("reports.detail.loadError")}
        </p>
      ) : !hasData ? (
        <p className="py-6 text-center text-sm" style={{ color: "var(--text-muted)" }}>
          {t("reports.detail.noBreakdown")}
        </p>
      ) : (
        <>
          <Suspense fallback={<div className="h-40" aria-busy="true" />}>
            <CategoryDonut slices={slices} currency={currency} />
          </Suspense>
          <ul className="space-y-2">
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
      className="rounded-lg border p-3"
      style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="truncate font-medium" style={{ color: "var(--text)" }}>
          {node.label}
        </span>
        <div className="flex shrink-0 items-center gap-2">
          {node.series && node.series.length > 1 && (
            <Sparkline
              points={node.series.map((point) => point.total_spend_minor)}
              ariaLabel={`${node.label} spend trend over the period`}
            />
          )}
          <span className="text-sm font-semibold tabular-nums" style={{ color: "var(--text)" }}>
            {formatMinorAmount(node.total_minor, currency)}
            <span className="ml-2 text-xs font-normal" style={{ color: "var(--text-muted)" }}>
              {pct.toFixed(0)}%
            </span>
          </span>
        </div>
      </div>
      {children.length > 0 && (
        <ul className="mt-2 space-y-1 border-t pt-2" style={{ borderColor: "var(--border)" }}>
          {children.map((child) => (
            <li
              key={child.key}
              className="flex items-center justify-between gap-3 text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              <span className="truncate">{child.label}</span>
              <span className="shrink-0 tabular-nums">
                {formatMinorAmount(child.total_minor, currency)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
