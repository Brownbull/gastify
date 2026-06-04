/**
 * Donut drill-down state machine (D69 — mirrors web/src/hooks/useDonutDrill).
 * Navigates the server-supplied category tree in memory: tapping a node with
 * children descends a level, the breadcrumb jumps to any ancestor, and Back pops
 * one level. The whole tree arrives in one `useInsightsTree` payload.
 */
import { useState } from "react";
import type { InsightsTreeNode } from "../lib/insights";

export interface DonutDrill {
  /** Ancestor nodes from root to the current level (empty at the root). */
  path: InsightsTreeNode[];
  /** The deepest node in `path`, or null at the root. */
  current: InsightsTreeNode | null;
  /** Nodes shown at the current level: `current.children`, or `roots` at the root. */
  visibleNodes: InsightsTreeNode[];
  /** Denominator for within-parent percentages at the current level. */
  parentTotalMinor: number;
  /** Descend into `key` if that visible node has children; otherwise a no-op. */
  drillInto: (key: string) => void;
  /** Pop one level. */
  back: () => void;
  /** Jump to a breadcrumb depth: -1 = root, 0..n = a `path` index. */
  jumpTo: (depth: number) => void;
}

export function useDonutDrill(
  roots: readonly InsightsTreeNode[],
  totalSpendMinor: number,
  resetKey: string,
): DonutDrill {
  const [path, setPath] = useState<InsightsTreeNode[]>([]);
  const [appliedKey, setAppliedKey] = useState(resetKey);

  // A new period or dimension replaces the tree; drop stale ancestor refs by
  // adjusting state during render (React's reset-on-prop-change pattern).
  const isStale = resetKey !== appliedKey;
  if (isStale) {
    setAppliedKey(resetKey);
    setPath([]);
  }
  const activePath = isStale ? [] : path;

  const current = activePath.length > 0 ? activePath[activePath.length - 1] : null;
  const visibleNodes = current ? (current.children ?? []) : [...roots];
  const parentTotalMinor = current ? current.total_minor : totalSpendMinor;

  const drillInto = (key: string) => {
    const node = visibleNodes.find((candidate) => candidate.key === key);
    if (node && (node.children?.length ?? 0) > 0) {
      setPath((previous) => [...previous, node]);
    }
  };

  const back = () => setPath((previous) => previous.slice(0, -1));

  const jumpTo = (depth: number) =>
    setPath((previous) => (depth < 0 ? [] : previous.slice(0, depth + 1)));

  return { path: activePath, current, visibleNodes, parentTotalMinor, drillInto, back, jumpTo };
}
