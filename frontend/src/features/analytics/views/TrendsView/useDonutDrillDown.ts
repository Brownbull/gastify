/**
 * useDonutDrillDown — Drill-down state machine for DonutChart
 *
 * Story 15-TD-5: Extracted from DonutChart.tsx
 *
 * Manages drill-down level/path state, animation state, segment selection,
 * expand/collapse handlers, and semantic path building for navigation.
 */
import { useState, useCallback, useEffect } from 'react';
import type { DonutViewMode } from './types';
import type { DrillDownPath } from '@/types/navigation';

interface UseDonutDrillDownProps {
    viewMode: DonutViewMode;
    parentOnExpand: () => void;
    parentOnCollapse: () => void;
}

export function useDonutDrillDown({
    viewMode,
    parentOnExpand,
    parentOnCollapse,
}: UseDonutDrillDownProps) {
    // Core drill-down state
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [donutAnimationKey, setDonutAnimationKey] = useState(0);
    const [visibleSegments, setVisibleSegments] = useState<Set<number>>(new Set());
    const [drillDownLevel, setDrillDownLevel] = useState<0 | 1 | 2 | 3 | 4>(0);
    const [drillDownPath, setDrillDownPath] = useState<string[]>([]);
    const [drillDownExpandedCount, setDrillDownExpandedCount] = useState(0);

    // Reset drill-down when viewMode changes
    useEffect(() => {
        setDrillDownLevel(0);
        setDrillDownPath([]);
        setSelectedCategory(null);
        setDrillDownExpandedCount(0);
        setDonutAnimationKey(prev => prev + 1);
        setVisibleSegments(new Set());
    }, [viewMode]);

    // Animate segments appearing clockwise
    useEffect(() => {
        const segmentCount = 10;
        const delays: ReturnType<typeof setTimeout>[] = [];
        for (let i = 0; i < segmentCount; i++) {
            const timer = setTimeout(() => {
                setVisibleSegments(prev => new Set([...prev, i]));
            }, i * 80);
            delays.push(timer);
        }
        return () => delays.forEach(clearTimeout);
    }, [donutAnimationKey]);

    const handleSegmentClick = useCallback((categoryName: string) => {
        setSelectedCategory(prev => prev === categoryName ? null : categoryName);
    }, []);

    const getMaxDrillDownLevel = useCallback((): number => {
        switch (viewMode) {
            case 'store-groups': return 4;
            case 'store-categories': return 3;
            case 'item-groups': return 2;
            case 'item-categories': return 1;
            default: return 2;
        }
    }, [viewMode]);

    const handleDrillDown = useCallback((name: string) => {
        setSelectedCategory(null);
        setDrillDownExpandedCount(0);
        const maxLevel = getMaxDrillDownLevel();
        if (drillDownLevel < maxLevel) {
            setDonutAnimationKey(prev => prev + 1);
            setVisibleSegments(new Set());
            setDrillDownPath(prev => [...prev, name]);
            setDrillDownLevel(prev => Math.min(prev + 1, 4) as 0 | 1 | 2 | 3 | 4);
        }
    }, [getMaxDrillDownLevel, drillDownLevel]);

    const handleBack = useCallback(() => {
        setSelectedCategory(null);
        setDrillDownExpandedCount(0);
        if (drillDownLevel > 0) {
            setDonutAnimationKey(prev => prev + 1);
            setVisibleSegments(new Set());
            setDrillDownPath(prev => prev.slice(0, -1));
            setDrillDownLevel(prev => Math.max(prev - 1, 0) as 0 | 1 | 2 | 3 | 4);
        }
    }, [drillDownLevel]);

    const handleExpand = useCallback(() => {
        if (drillDownLevel === 0) {
            parentOnExpand();
        } else {
            setDrillDownExpandedCount(prev => prev + 1);
        }
    }, [drillDownLevel, parentOnExpand]);

    const handleCollapse = useCallback(() => {
        if (drillDownLevel === 0) {
            parentOnCollapse();
        } else {
            setDrillDownExpandedCount(prev => Math.max(0, prev - 1));
        }
    }, [drillDownLevel, parentOnCollapse]);

    /**
     * Build semantic DrillDownPath from current state.
     * Converts the string array path and drill-down level into a structured object
     * with semantic meaning based on the current viewMode.
     */
    const buildSemanticDrillDownPath = useCallback((currentCategoryName?: string): DrillDownPath => {
        const path: DrillDownPath = {};

        switch (viewMode) {
            case 'store-groups':
                if (drillDownPath[0]) path.storeGroup = drillDownPath[0];
                if (drillDownPath[1]) path.storeCategory = drillDownPath[1];
                if (drillDownPath[2]) path.itemGroup = drillDownPath[2];
                if (drillDownPath[3]) path.itemCategory = drillDownPath[3];
                if (drillDownLevel === 4 && currentCategoryName) {
                    path.subcategory = currentCategoryName;
                } else if (drillDownLevel === 3 && currentCategoryName) {
                    path.itemCategory = currentCategoryName;
                } else if (drillDownLevel === 2 && currentCategoryName) {
                    path.itemGroup = currentCategoryName;
                } else if (drillDownLevel === 1 && currentCategoryName) {
                    path.storeCategory = currentCategoryName;
                } else if (drillDownLevel === 0 && currentCategoryName) {
                    path.storeGroup = currentCategoryName;
                }
                break;

            case 'store-categories':
                if (drillDownPath[0]) path.storeCategory = drillDownPath[0];
                if (drillDownPath[1]) path.itemGroup = drillDownPath[1];
                if (drillDownPath[2]) path.itemCategory = drillDownPath[2];
                if (drillDownLevel === 3 && currentCategoryName) {
                    path.subcategory = currentCategoryName;
                } else if (drillDownLevel === 2 && currentCategoryName) {
                    path.itemCategory = currentCategoryName;
                } else if (drillDownLevel === 1 && currentCategoryName) {
                    path.itemGroup = currentCategoryName;
                } else if (drillDownLevel === 0 && currentCategoryName) {
                    path.storeCategory = currentCategoryName;
                }
                break;

            case 'item-groups':
                if (drillDownPath[0]) path.itemGroup = drillDownPath[0];
                if (drillDownPath[1]) path.itemCategory = drillDownPath[1];
                if (drillDownLevel === 2 && currentCategoryName) {
                    path.subcategory = currentCategoryName;
                } else if (drillDownLevel === 1 && currentCategoryName) {
                    path.itemCategory = currentCategoryName;
                } else if (drillDownLevel === 0 && currentCategoryName) {
                    path.itemGroup = currentCategoryName;
                }
                break;

            case 'item-categories':
                if (drillDownPath[0]) path.itemCategory = drillDownPath[0];
                if (drillDownLevel === 1 && currentCategoryName) {
                    path.subcategory = currentCategoryName;
                } else if (drillDownLevel === 0 && currentCategoryName) {
                    path.itemCategory = currentCategoryName;
                }
                break;
        }

        return path;
    }, [viewMode, drillDownPath, drillDownLevel]);

    return {
        // State
        selectedCategory,
        donutAnimationKey,
        visibleSegments,
        drillDownLevel,
        drillDownPath,
        drillDownExpandedCount,

        // Handlers
        handleSegmentClick,
        getMaxDrillDownLevel,
        handleDrillDown,
        handleBack,
        handleExpand,
        handleCollapse,
        buildSemanticDrillDownPath,
    };
}
