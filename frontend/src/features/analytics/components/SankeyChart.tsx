/**
 * SankeyChart Component
 * Story 14.13.3: ECharts Sankey diagram for spending flow visualization
 *
 * Displays money flow from store categories to item categories.
 * Uses tree-shaking to only include the Sankey module from ECharts.
 *
 * Features:
 * - 2-level mode: Store Categories → Item Categories
 * - 3-level-groups mode: Store Groups → Store Cats → Item Groups
 * - 3-level-categories mode: Store Cats → Item Groups → Item Cats
 * - 4-level mode: Store Groups → Store Cats → Item Groups → Item Cats
 * - 10% threshold filtering with "Más" aggregation
 * - Expand/collapse for each level
 * - Theme-aware colors (light/dark, normal/professional/mono)
 * - Phase 5: Dynamic title, icon nodes with progress borders, no navigation
 */

import { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import { SankeyChart as EChartsSankey } from 'echarts/charts';
import { TooltipComponent, GridComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import ReactEChartsCore from 'echarts-for-react/lib/core';

import type { Transaction } from '@/types/transaction';
import {
    buildSankeyData,
    getNodeLevel,
    type SankeyMode,
    type SankeyExpansionState,
    type SankeyNode,
} from '../utils/sankeyDataBuilder';
import {
    getCurrentTheme,
    getCurrentMode,
    type ThemeName,
    type ModeName,
} from '@/config/categoryColors';
import {
    translateCategory,
    translateStoreCategoryGroup,
    translateItemCategoryGroup,
    getStoreCategoryGroupEmoji,
    getItemCategoryGroupEmoji,
    getItemCategoryEmoji,
} from '@/utils/categoryTranslations';
import { getCategoryEmoji } from '@/utils/categoryEmoji';
import { SankeyIconNode } from './SankeyIconNode';

// Register only needed ECharts components for tree-shaking
echarts.use([EChartsSankey, TooltipComponent, GridComponent, CanvasRenderer]);

// ============================================================================
// TYPES
// ============================================================================

/** Selection data passed to parent for pill-style title display */
export interface SankeySelectionData {
    /** Original category name (internal key) */
    nodeName: string;
    /** Translated display name */
    displayName: string;
    /** Category emoji */
    emoji: string;
    /** Amount in K notation (e.g., "$244k") */
    amountK: string;
    /** Percentage of total */
    percent: string;
    /** Category background color for pill styling */
    color: string;
    /** Whether this is a link (flow between nodes) or a node */
    isLink: boolean;
    /** For links: source node name */
    sourceName?: string;
    /** For links: target node name */
    targetName?: string;
    /** For links: source emoji */
    sourceEmoji?: string;
    /** For links: target emoji */
    targetEmoji?: string;
}

export interface SankeyChartProps {
    /** Transaction data to visualize */
    transactions: Transaction[];
    /** Currency for formatting (e.g., 'CLP', 'USD') */
    currency: string;
    /** Locale for translations ('es' or 'en') */
    locale: 'es' | 'en';
    /** Sankey mode: hierarchy depth */
    mode?: SankeyMode;
    /** Expansion state for each level */
    expansion?: SankeyExpansionState;
    /** Color theme */
    theme?: ThemeName;
    /** Light/dark mode */
    colorMode?: ModeName;
    /** Height of the chart */
    height?: number | string;
    /**
     * Callback when a node is clicked (legacy - for navigation)
     * Phase 5: No longer navigates, only updates title
     * @deprecated Use onTitleChange instead for Phase 5 behavior
     */
    onNodeClick?: (categoryName: string, level: number, isStoreCategory: boolean) => void;
    /** Callback when title changes due to node click (Phase 5) */
    onTitleChange?: (title: string | null) => void;
    /** Whether to show animations */
    animate?: boolean;
    /** Prefers reduced motion */
    prefersReducedMotion?: boolean;
    /** Use icon nodes with progress borders (Phase 5) */
    useIconNodes?: boolean;
    /** Show dynamic title above chart (Phase 5) */
    showTitle?: boolean;
    /** Title auto-reset timeout in ms (Phase 5, default: 3000, 0 = no auto-reset) */
    titleResetTimeout?: number;
    /** Selected node name (controlled from parent - Story 14.13.3) */
    selectedNode?: string | null;
    /** Callback when selection changes (Story 14.13.3 toggle selection) */
    onSelectionChange?: (nodeName: string | null, title: string | null, data?: SankeySelectionData | null) => void;
}

/** Node position calculated from ECharts layout */
interface NodePosition {
    node: SankeyNode;
    x: number;
    y: number;
    percent: number;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Translates a category name based on its level and mode.
 */
export function translateNodeName(
    originalName: string,
    level: number,
    mode: SankeyMode,
    locale: 'es' | 'en'
): string {
    // Handle "Más" specially
    if (originalName === 'Más') {
        return locale === 'es' ? 'Más' : 'More';
    }

    if (mode === '2-level') {
        // Level 1 = Store Categories, Level 2 = Item Categories
        return translateCategory(originalName, locale);
    } else if (mode === '3-level-groups') {
        // Level 1 = Store Groups, Level 2 = Store Categories, Level 3 = Item Groups
        if (level === 1) {
            return translateStoreCategoryGroup(originalName, locale);
        } else if (level === 2) {
            return translateCategory(originalName, locale);
        } else {
            return translateItemCategoryGroup(originalName, locale);
        }
    } else if (mode === '3-level-categories') {
        // Level 1 = Store Categories, Level 2 = Item Groups, Level 3 = Item Categories
        if (level === 1) {
            return translateCategory(originalName, locale);
        } else if (level === 2) {
            return translateItemCategoryGroup(originalName, locale);
        } else {
            return translateCategory(originalName, locale);
        }
    } else {
        // 4-level mode
        if (level === 1) {
            return translateStoreCategoryGroup(originalName, locale);
        } else if (level === 2) {
            return translateCategory(originalName, locale);
        } else if (level === 3) {
            return translateItemCategoryGroup(originalName, locale);
        } else {
            return translateCategory(originalName, locale);
        }
    }
}

/**
 * Gets emoji for a node based on its level and mode.
 */
function getNodeEmoji(
    originalName: string,
    level: number,
    mode: SankeyMode
): string {
    // Handle "Más" specially
    if (originalName === 'Más') {
        return '📦';
    }

    if (mode === '2-level') {
        // Level 1 = Store Categories, Level 2 = Item Categories
        if (level === 1) {
            return getCategoryEmoji(originalName);
        } else {
            return getItemCategoryEmoji(originalName);
        }
    } else if (mode === '3-level-groups') {
        // Level 1 = Store Groups, Level 2 = Store Categories, Level 3 = Item Groups
        if (level === 1) {
            return getStoreCategoryGroupEmoji(originalName);
        } else if (level === 2) {
            return getCategoryEmoji(originalName);
        } else {
            return getItemCategoryGroupEmoji(originalName);
        }
    } else if (mode === '3-level-categories') {
        // Level 1 = Store Categories, Level 2 = Item Groups, Level 3 = Item Categories
        if (level === 1) {
            return getCategoryEmoji(originalName);
        } else if (level === 2) {
            return getItemCategoryGroupEmoji(originalName);
        } else {
            return getItemCategoryEmoji(originalName);
        }
    } else {
        // 4-level mode
        if (level === 1) {
            return getStoreCategoryGroupEmoji(originalName);
        } else if (level === 2) {
            return getCategoryEmoji(originalName);
        } else if (level === 3) {
            return getItemCategoryGroupEmoji(originalName);
        } else {
            return getItemCategoryEmoji(originalName);
        }
    }
}

/**
 * Determines if a level represents store categories (vs item categories).
 */
function isStoreCategoryLevel(level: number, mode: SankeyMode): boolean {
    if (mode === '2-level') {
        return level === 1;
    } else if (mode === '3-level-groups') {
        return level <= 2;
    } else if (mode === '3-level-categories') {
        return level === 1;
    } else {
        return level <= 2;
    }
}

/**
 * Gets the number of levels for a mode.
 */
function getLevelCount(mode: SankeyMode): number {
    switch (mode) {
        case '2-level': return 2;
        case '3-level-groups':
        case '3-level-categories': return 3;
        case '4-level': return 4;
        default: return 2;
    }
}

/**
 * Gets the default title for the chart based on mode.
 * Story 14.13.3: Returns empty string - title only shows on node click
 */
function getDefaultTitle(_mode: SankeyMode, _locale: 'es' | 'en'): string {
    // Story 14.13.3: Blank by default, only shows content when user clicks a node
    return '';
}

/**
 * Formats an amount in K notation (e.g., $244k, $1.2M)
 * Story 14.13.3: Consistent K notation for Sankey title display
 */
function formatAmountK(amount: number, currency: string): string {
    const symbol = currency === 'CLP' ? '$' : currency === 'USD' ? '$' : currency;

    if (amount >= 1000000) {
        const millions = amount / 1000000;
        return `${symbol}${millions.toFixed(1).replace(/\.0$/, '')}M`;
    } else if (amount >= 1000) {
        const thousands = amount / 1000;
        return `${symbol}${thousands.toFixed(0)}k`;
    } else {
        return `${symbol}${Math.round(amount)}`;
    }
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SankeyChart({
    transactions,
    currency,
    locale,
    mode = '2-level',
    expansion,
    theme,
    colorMode,
    height = 380, // Fits 360x780 viewport without scrolling
    onNodeClick,
    onTitleChange,
    animate = true,
    prefersReducedMotion = false,
    useIconNodes = false,
    showTitle = false,
    titleResetTimeout = 3000,
    selectedNode,
    onSelectionChange,
}: SankeyChartProps) {
    // Use current theme/mode if not provided
    const activeTheme = theme ?? getCurrentTheme();
    const activeMode = colorMode ?? getCurrentMode();

    // Phase 5: Dynamic title state (internal state when not controlled)
    const [internalSelectedTitle, setInternalSelectedTitle] = useState<string | null>(null);
    const [internalSelectedNodeName, setInternalSelectedNodeName] = useState<string | null>(null);

    // Story 14.13.3: Support controlled mode (parent manages selection) or uncontrolled mode
    const isControlled = selectedNode !== undefined;
    const selectedTitle = isControlled ? null : internalSelectedTitle; // In controlled mode, parent handles title
    const selectedNodeName = isControlled ? selectedNode : internalSelectedNodeName;

    const titleResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Chart ref for position calculations
    const chartRef = useRef<ReactEChartsCore>(null);
    const [nodePositions, setNodePositions] = useState<NodePosition[]>([]);

    // Build Sankey data
    const sankeyData = useMemo(() => {
        return buildSankeyData(
            transactions,
            mode,
            expansion,
            activeTheme,
            activeMode
        );
    }, [transactions, mode, expansion, activeTheme, activeMode]);

    // Calculate total for percentage display
    const totalValue = useMemo(() => {
        return sankeyData.nodes
            .filter(n => getNodeLevel(n.name) === 1)
            .reduce((sum, n) => sum + n.value, 0);
    }, [sankeyData.nodes]);

    // Reset title and highlight after timeout (only in uncontrolled mode)
    // Story 14.13.3: In controlled mode, parent manages reset; titleResetTimeout=0 disables auto-reset
    useEffect(() => {
        if (!isControlled && selectedTitle && titleResetTimeout > 0) {
            titleResetTimerRef.current = setTimeout(() => {
                setInternalSelectedTitle(null);
                setInternalSelectedNodeName(null);
                onTitleChange?.(null);

                // Also reset ECharts highlight
                if (chartRef.current) {
                    const instance = chartRef.current.getEchartsInstance();
                    if (instance) {
                        instance.dispatchAction({
                            type: 'downplay',
                            seriesIndex: 0,
                        });
                    }
                }
            }, titleResetTimeout);
        }

        return () => {
            if (titleResetTimerRef.current) {
                clearTimeout(titleResetTimerRef.current);
            }
        };
    }, [isControlled, selectedTitle, titleResetTimeout, onTitleChange]);

    // Handle node click - Phase 5: Update title only, no navigation
    // Story 14.13.3: Toggle selection - clicking same node deselects
    // Shows emoji + category name + K notation amount + percentage of total spending
    // Also triggers ECharts highlight for connected elements
    const handleNodeClick = useCallback((node: SankeyNode) => {
        if (node.originalName === 'Más') return;

        // Story 14.13.3: Toggle selection - if same node clicked, deselect
        const isDeselecting = selectedNodeName === node.originalName;

        if (isDeselecting) {
            // Clear selection
            if (isControlled) {
                onSelectionChange?.(null, null, null);
            } else {
                setInternalSelectedTitle(null);
                setInternalSelectedNodeName(null);
                onTitleChange?.(null);
            }

            // Reset ECharts highlight
            if (chartRef.current) {
                const instance = chartRef.current.getEchartsInstance();
                if (instance) {
                    instance.dispatchAction({
                        type: 'downplay',
                        seriesIndex: 0,
                    });
                }
            }
            return;
        }

        // Select new node
        const displayName = translateNodeName(node.originalName, node.level, mode, locale);
        const emoji = getNodeEmoji(node.originalName, node.level, mode);
        // Calculate percentage of total spending
        const percent = totalValue > 0 ? ((node.value / totalValue) * 100).toFixed(1) : '0';
        // Story 14.13.3: Use K notation for amounts (e.g., $244k instead of $244.923)
        const amountK = formatAmountK(node.value, currency);
        const titleWithPercent = `${emoji} ${displayName} - ${amountK} (${percent}%)`;

        // Build selection data for pill-style title display
        const selectionData: SankeySelectionData = {
            nodeName: node.originalName,
            displayName,
            emoji,
            amountK,
            percent: `${percent}%`,
            color: node.itemStyle.color,
            isLink: false,
        };

        if (isControlled) {
            onSelectionChange?.(node.originalName, titleWithPercent, selectionData);
        } else {
            setInternalSelectedTitle(titleWithPercent);
            setInternalSelectedNodeName(node.originalName);
            onTitleChange?.(titleWithPercent);
        }

        // Trigger ECharts highlight for connected elements (adjacency highlighting)
        // This highlights the clicked node and all its connected links/nodes
        if (chartRef.current) {
            const instance = chartRef.current.getEchartsInstance();
            if (instance) {
                // First downplay all to reset any previous highlight
                instance.dispatchAction({
                    type: 'downplay',
                    seriesIndex: 0,
                });
                // Then highlight the clicked node and its adjacencies
                instance.dispatchAction({
                    type: 'highlight',
                    seriesIndex: 0,
                    name: node.name, // Use the internal name (with level prefix)
                });
            }
        }

        // Legacy callback for backwards compatibility
        if (onNodeClick) {
            const isStoreCategory = isStoreCategoryLevel(node.level, mode);
            onNodeClick(node.originalName, node.level, isStoreCategory);
        }
    }, [mode, locale, totalValue, currency, selectedNodeName, isControlled, onTitleChange, onNodeClick, onSelectionChange]);

    // Handle link/edge click - Story 14.13.3: Show flow info when clicking traces
    const handleLinkClick = useCallback((linkData: { source: string; target: string; value: number }) => {
        // Find source and target nodes to get their info
        const sourceNode = sankeyData.nodes.find(n => n.name === linkData.source);
        const targetNode = sankeyData.nodes.find(n => n.name === linkData.target);

        if (!sourceNode || !targetNode) return;

        const sourceDisplayName = translateNodeName(sourceNode.originalName, sourceNode.level, mode, locale);
        const targetDisplayName = translateNodeName(targetNode.originalName, targetNode.level, mode, locale);
        const sourceEmoji = getNodeEmoji(sourceNode.originalName, sourceNode.level, mode);
        const targetEmoji = getNodeEmoji(targetNode.originalName, targetNode.level, mode);

        const percent = totalValue > 0 ? ((linkData.value / totalValue) * 100).toFixed(1) : '0';
        const amountK = formatAmountK(linkData.value, currency);

        // Build title: "🛒 Alimentación > 🏪 Supermercado - $50k (12.5%)"
        // Shows: [parent category] > [child category] - amount (%)
        const titleWithPercent = `${sourceEmoji} ${sourceDisplayName} > ${targetEmoji} ${targetDisplayName} - ${amountK} (${percent}%)`;

        // Use source node color for the link pill
        const selectionData: SankeySelectionData = {
            nodeName: `${sourceNode.originalName}->${targetNode.originalName}`,
            displayName: `${sourceDisplayName} > ${targetDisplayName}`,
            emoji: sourceEmoji,
            amountK,
            percent: `${percent}%`,
            color: sourceNode.itemStyle.color,
            isLink: true,
            sourceName: sourceDisplayName,
            targetName: targetDisplayName,
            sourceEmoji,
            targetEmoji,
        };

        if (isControlled) {
            onSelectionChange?.(selectionData.nodeName, titleWithPercent, selectionData);
        } else {
            setInternalSelectedTitle(titleWithPercent);
            setInternalSelectedNodeName(selectionData.nodeName);
            onTitleChange?.(titleWithPercent);
        }

        // Highlight the link
        if (chartRef.current) {
            const instance = chartRef.current.getEchartsInstance();
            if (instance) {
                instance.dispatchAction({
                    type: 'downplay',
                    seriesIndex: 0,
                });
                // Highlight both source and target nodes for the link
                instance.dispatchAction({
                    type: 'highlight',
                    seriesIndex: 0,
                    name: linkData.source,
                });
            }
        }
    }, [sankeyData.nodes, mode, locale, totalValue, currency, isControlled, onTitleChange, onSelectionChange]);

    // Handle ECharts click event (for non-icon mode) - now handles both nodes and links
    const handleEChartsClick = useCallback((params: {
        data?: SankeyNode | { source: string; target: string; value: number };
        dataType?: string;
    }) => {
        if (params.dataType === 'node' && params.data && 'originalName' in params.data) {
            handleNodeClick(params.data as SankeyNode);
        } else if (params.dataType === 'edge' && params.data && 'source' in params.data) {
            // Story 14.13.3: Handle link/trace clicks
            handleLinkClick(params.data as { source: string; target: string; value: number });
        }
    }, [handleNodeClick, handleLinkClick]);

    // Calculate node positions for icon overlay
    // Strategy: Try to extract actual positions from ECharts internal model first,
    // fall back to calculated positions based on layout configuration
    useEffect(() => {
        if (!useIconNodes || !chartRef.current) return;

        const instance = chartRef.current.getEchartsInstance();
        if (!instance) return;

        // Track if effect is still active (for cleanup)
        let isActive = true;

        // Try to extract actual node positions from ECharts internal model
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const extractEChartsPositions = (): NodePosition[] | null => {
            try {
                // Access the internal model to get computed layout positions
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const model = (instance as any).getModel?.();
                if (!model) return null;

                const seriesModel = model.getSeriesByIndex?.(0);
                if (!seriesModel) return null;

                const graph = seriesModel.getGraph?.();
                if (!graph) return null;

                const positions: NodePosition[] = [];
                const nodeNameToData = new Map(sankeyData.nodes.map(n => [n.name, n]));

                // ECharts stores node layout in the graph nodes
                graph.eachNode?.((graphNode: {
                    getLayout: () => { x?: number; y?: number } | null;
                    id?: string;
                    dataIndex?: number;
                }) => {
                    const layout = graphNode.getLayout?.();
                    if (layout && typeof layout.x === 'number' && typeof layout.y === 'number') {
                        // For vertical orient, x and y are swapped in ECharts internal model
                        // Note: In vertical sankey, 'x' is horizontal position, 'y' is vertical (depth)
                        const nodeName = graphNode.id;
                        const nodeData = nodeName ? nodeNameToData.get(nodeName) : null;

                        if (nodeData) {
                            const percent = totalValue > 0 ? (nodeData.value / totalValue) * 100 : 0;
                            positions.push({
                                node: nodeData,
                                x: layout.x,
                                y: layout.y,
                                percent,
                            });
                        }
                    }
                });

                return positions.length > 0 ? positions : null;
            } catch {
                // Fall through to calculated positions
                return null;
            }
        };

        // Calculate positions based on chart layout (fallback)
        const calculatePositions = (): NodePosition[] | null => {
            const chartWidth = instance.getWidth();
            const chartHeight = instance.getHeight();

            // Return null if chart hasn't rendered yet
            if (!chartWidth || !chartHeight || chartWidth === 0 || chartHeight === 0) {
                return null;
            }

            const levelCount = getLevelCount(mode);
            const positions: NodePosition[] = [];

            // Group nodes by level
            const nodesByLevel = new Map<number, SankeyNode[]>();
            sankeyData.nodes.forEach(node => {
                const level = node.level;
                if (!nodesByLevel.has(level)) {
                    nodesByLevel.set(level, []);
                }
                nodesByLevel.get(level)!.push(node);
            });

            // Calculate Y positions for each level (vertical Sankey)
            // Match ECharts config: top: 8%/3%, bottom: 5%, left/right: 8%
            const topPercent = showTitle ? 0.08 : 0.03;
            const paddingTop = chartHeight * topPercent;
            const paddingBottom = chartHeight * 0.05;
            const availableHeight = chartHeight - paddingTop - paddingBottom;
            const levelSpacing = levelCount > 1 ? availableHeight / (levelCount - 1) : 0;

            // Calculate X positions within each level
            const paddingX = chartWidth * 0.08;
            const availableWidth = chartWidth - (paddingX * 2);

            nodesByLevel.forEach((nodes, level) => {
                const y = paddingTop + (level - 1) * levelSpacing;
                const nodeCount = nodes.length;

                // Calculate total value at this level for proportional spacing
                const levelTotal = nodes.reduce((sum, n) => sum + n.value, 0);

                // Sort nodes by value (largest first) to match Sankey layout tendency
                const sortedNodes = [...nodes].sort((a, b) => b.value - a.value);

                if (nodeCount === 1) {
                    // Single node: center it
                    const node = sortedNodes[0];
                    const percent = totalValue > 0 ? (node.value / totalValue) * 100 : 0;
                    positions.push({ node, x: chartWidth / 2, y, percent });
                } else {
                    // Multiple nodes: distribute based on value weights for better alignment
                    let cumulativeWeight = 0;
                    sortedNodes.forEach((node) => {
                        // Position based on cumulative weight + half of own weight
                        const nodeWeight = levelTotal > 0 ? node.value / levelTotal : 1 / nodeCount;
                        const position = cumulativeWeight + (nodeWeight / 2);
                        const x = paddingX + (position * availableWidth);
                        cumulativeWeight += nodeWeight;

                        const percent = totalValue > 0 ? (node.value / totalValue) * 100 : 0;
                        positions.push({ node, x, y, percent });
                    });
                }
            });

            return positions;
        };

        // Update positions - try ECharts positions first, fall back to calculated
        const updatePositions = () => {
            if (!isActive) return;

            // Try to extract from ECharts internal model first
            let positions = extractEChartsPositions();

            // Fall back to calculated positions
            if (!positions || positions.length === 0) {
                positions = calculatePositions();
            }

            if (positions && positions.length > 0) {
                setNodePositions(positions);
            }
        };

        // Retry mechanism: Try multiple times with increasing delays
        // This ensures we catch the chart render even on slower devices
        const retryDelays = [50, 150, 300, 500];
        const timers: ReturnType<typeof setTimeout>[] = [];

        retryDelays.forEach(delay => {
            timers.push(setTimeout(updatePositions, delay));
        });

        // Also listen for chart finished event for dynamic updates
        instance.on('finished', updatePositions);

        // Handle window resize
        const handleResize = () => {
            // Debounce resize handling
            setTimeout(updatePositions, 100);
        };
        window.addEventListener('resize', handleResize);

        return () => {
            isActive = false;
            timers.forEach(timer => clearTimeout(timer));
            instance.off('finished', updatePositions);
            window.removeEventListener('resize', handleResize);
        };
    }, [useIconNodes, sankeyData.nodes, mode, totalValue, showTitle]);

    // Build ECharts option
    const option = useMemo(() => {
        if (sankeyData.nodes.length === 0) {
            return {};
        }

        // Get theme text colors
        const textColor = activeMode === 'dark' ? '#e5e7eb' : '#374151';

        // For icon mode, hide node labels (we'll overlay our own)
        const showLabels = !useIconNodes;

        return {
            // Story 14.13.3: Disable floating tooltip - all info shown in title area
            tooltip: {
                show: false,
            },
            animation: animate && !prefersReducedMotion,
            animationDuration: prefersReducedMotion ? 0 : 1000,
            animationEasing: 'cubicOut',
            series: [{
                type: 'sankey',
                orient: 'vertical',
                top: '3%', // Story 14.13.3: Title is now outside chart, so less top margin needed
                bottom: '5%',
                left: '4%', // Story 14.13.3: Reduced margin for wider diagram
                right: '4%', // Story 14.13.3: Reduced margin for wider diagram
                nodeWidth: useIconNodes ? 8 : 40, // Story 14.13.3: Wider bars for better visibility (was 36)
                nodeGap: 12, // Spacing between nodes at same level
                layoutIterations: 32,
                emphasis: {
                    focus: 'adjacency',
                },
                data: sankeyData.nodes.map(node => ({
                    ...node,
                    // Hide or show labels based on mode
                    label: {
                        show: showLabels,
                        // Story 14.13.3: Position 'inside' to put emoji centered inside the bar
                        position: 'inside',
                        // Story 14.13.3: Show emoji only as node label (no text, no count badges)
                        formatter: () => {
                            const emoji = getNodeEmoji(node.originalName, node.level, mode);
                            // Story 14.13.3: Just show emoji, no +N count badges for aggregated "Más" nodes
                            return emoji;
                        },
                        color: textColor,
                        fontSize: 18, // Story 14.13.3: Slightly larger for visibility inside bar
                        fontWeight: node.isMas ? 400 : 500,
                        // Ensure emoji is vertically centered
                        verticalAlign: 'middle',
                        align: 'center',
                    },
                    // In icon mode, show nodes as thin bars (flow anchors)
                    itemStyle: useIconNodes ? {
                        ...node.itemStyle,
                        opacity: 0.9, // Show bars for clear flow anchor points
                    } : node.itemStyle,
                })),
                links: sankeyData.links,
                lineStyle: {
                    color: 'source',
                    curveness: 0.5,
                    opacity: activeMode === 'dark' ? 0.5 : 0.6, // Higher opacity for clearer flow distinction
                },
                label: {
                    color: textColor,
                    fontSize: 18, // Story 14.13.3: Larger for emoji visibility inside bars
                },
                levels: getLevelCount(mode) === 2 ? [
                    { depth: 0 },
                    { depth: 1 },
                ] : getLevelCount(mode) === 3 ? [
                    { depth: 0 },
                    { depth: 1 },
                    { depth: 2 },
                ] : [
                    { depth: 0 },
                    { depth: 1 },
                    { depth: 2 },
                    { depth: 3 },
                ],
            }],
        };
    }, [sankeyData, mode, totalValue, activeMode, animate, prefersReducedMotion, useIconNodes]);

    // Get display title
    const displayTitle = selectedTitle || (showTitle ? getDefaultTitle(mode, locale) : null);

    // Empty state
    if (sankeyData.nodes.length === 0) {
        return (
            <div
                className="flex items-center justify-center"
                style={{
                    height: typeof height === 'number' ? `${height}px` : height,
                    color: 'var(--text-secondary)',
                }}
            >
                <p className="text-sm">
                    {locale === 'es'
                        ? 'No hay datos para mostrar'
                        : 'No data to display'}
                </p>
            </div>
        );
    }

    return (
        <div className="relative" data-testid="sankey-chart">
            {/* Dynamic Title (Phase 5) */}
            {showTitle && displayTitle && (
                <div
                    className="text-center font-semibold mb-1 transition-all duration-300"
                    style={{
                        color: selectedTitle ? 'var(--primary)' : 'var(--text-primary)',
                        fontSize: '14px',
                    }}
                    data-testid="sankey-title"
                >
                    {displayTitle}
                </div>
            )}

            {/* ECharts Sankey (flow lines) */}
            <ReactEChartsCore
                ref={chartRef}
                echarts={echarts}
                option={option}
                style={{
                    height: typeof height === 'number' ? `${height}px` : height,
                    width: '100%',
                }}
                onEvents={useIconNodes ? {} : { click: handleEChartsClick }}
                notMerge={true}
                lazyUpdate={true}
            />

            {/* Icon Nodes Overlay (Phase 5) */}
            {useIconNodes && nodePositions.length > 0 && (
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{ top: showTitle ? '24px' : '0' }}
                    data-testid="sankey-icon-overlay"
                >
                    {nodePositions.map(({ node, x, y, percent }) => (
                        <div
                            key={node.name}
                            className="absolute pointer-events-auto"
                            style={{
                                left: x,
                                top: y,
                                transform: 'translate(-50%, -50%)',
                            }}
                        >
                            <SankeyIconNode
                                emoji={getNodeEmoji(node.originalName, node.level, mode)}
                                percent={percent}
                                color={node.itemStyle.color}
                                size={36}
                                isSelected={selectedNodeName === node.originalName}
                                onClick={() => handleNodeClick(node)}
                                testId={`sankey-node-${node.originalName}`}
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default SankeyChart;
