/**
 * Category-flow Sankey (W7) — ECharts (echarts-for-react, SVG renderer). Walks
 * the insights tree (L1→L2→L3) into nodes + parent→child links sized by spend.
 * Node colors resolve the same --chart-N tokens the donut/treemap use (read off
 * :root at runtime) so the three representations stay color-consistent. Heavy —
 * lazy-load this at the route. No data-layer change; consumes InsightsTreeNode[].
 */
import { useMemo } from "react";
import ReactEChartsCore from "echarts-for-react/esm/core";
import * as echarts from "echarts/core";
import { SankeyChart as SankeyChartFeature } from "echarts/charts";
import { TooltipComponent } from "echarts/components";
import { SVGRenderer } from "echarts/renderers";
import { categoryColorVar } from "@/lib/chartData";
import { formatMinorAmount } from "@/lib/format";
import type { components } from "@/lib/api-types";

// Tree-shaken ECharts (Wf / P97): register ONLY Sankey + SVG renderer + tooltip
// instead of importing the full library — drops the lazy chart chunk from
// ~378KB gzip (full echarts) to ~150KB gzip.
echarts.use([SankeyChartFeature, TooltipComponent, SVGRenderer]);

type InsightsTreeNode = components["schemas"]["InsightsTreeNode"];

interface SankeyChartProps {
  roots: InsightsTreeNode[];
  currency: string;
  maxLevels?: number;
  height?: number;
}

const INK = "#1E293B";
const FALLBACK = ["#8B5CF6", "#FBBF24", "#F472B6", "#34D399", "#3B82F6", "#64748B"];

/** Resolve a slice's `var(--chart-N)` colorVar to a concrete hex (ECharts needs real colors). */
function resolveColor(categoryKey: string, idx: number): string {
  const varRef = categoryColorVar(categoryKey);
  const m = varRef.match(/var\((--[\w-]+)\)/);
  if (m && typeof document !== "undefined") {
    const v = getComputedStyle(document.documentElement).getPropertyValue(m[1]).trim();
    if (v) return v;
  }
  return FALLBACK[idx % FALLBACK.length];
}

interface SankeyData {
  nodes: { name: string; itemStyle: { color: string; borderColor: string; borderWidth: number } }[];
  links: { source: string; target: string; value: number }[];
}

function treeToSankey(roots: InsightsTreeNode[], maxLevels: number): SankeyData {
  const colorByName = new Map<string, string>();
  const links: SankeyData["links"] = [];
  let idx = 0;

  const ensure = (node: InsightsTreeNode) => {
    if (!colorByName.has(node.label)) colorByName.set(node.label, resolveColor(node.key, idx++));
  };

  const walk = (node: InsightsTreeNode, depth: number) => {
    if (depth >= maxLevels) return;
    ensure(node);
    for (const child of node.children ?? []) {
      if (depth + 1 >= maxLevels) break;
      if ((child.total_minor ?? 0) <= 0) continue;
      ensure(child);
      if (child.label !== node.label) {
        links.push({ source: node.label, target: child.label, value: child.total_minor });
      }
      walk(child, depth + 1);
    }
  };

  for (const root of roots) walk(root, 0);

  return {
    nodes: [...colorByName].map(([name, color]) => ({
      name,
      itemStyle: { color, borderColor: INK, borderWidth: 1 },
    })),
    links,
  };
}

export default function SankeyChart({ roots, currency, maxLevels = 3, height = 340 }: SankeyChartProps) {
  const option = useMemo(() => {
    const { nodes, links } = treeToSankey(roots, maxLevels);
    return {
      animation: true,
      animationDuration: 700,
      animationEasing: "cubicOut" as const,
      tooltip: {
        trigger: "item" as const,
        formatter: (p: { dataType?: string; name?: string; value?: number; data?: { value?: number } }) => {
          if (p.dataType === "edge") return `${p.name} · ${formatMinorAmount(p.data?.value ?? 0, currency)}`;
          return `${p.name}`;
        },
      },
      series: [
        {
          type: "sankey" as const,
          orient: "horizontal" as const,
          left: "2%",
          right: "8%",
          top: "4%",
          bottom: "4%",
          nodeWidth: 14,
          nodeGap: 10,
          layoutIterations: 32,
          emphasis: { focus: "adjacency" as const },
          data: nodes,
          links,
          label: {
            fontFamily: "Outfit, sans-serif",
            fontSize: 11,
            fontWeight: 700 as const,
            color: INK,
          },
          lineStyle: { color: "source" as const, curveness: 0.5, opacity: 0.45 },
        },
      ],
    };
  }, [roots, currency, maxLevels]);

  return (
    <div
      data-testid="sankey-chart"
      className="w-full overflow-hidden rounded-gt-xl border-2 border-gt-line-strong bg-gt-surface"
    >
      <ReactEChartsCore
        echarts={echarts}
        option={option}
        style={{ height, width: "100%" }}
        opts={{ renderer: "svg" }}
        notMerge
        lazyUpdate
      />
    </div>
  );
}
