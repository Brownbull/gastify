/**
 * DashboardRadarSlide — Radar chart slide for Dashboard carousel
 *
 * Story 15-TD-5: Extracted from DashboardView.tsx
 *
 * Shows a dynamic polygon radar chart comparing current vs previous month
 * spending across categories, with interactive category icons and comparison overlays.
 */
import React from 'react';

/** Radar chart category data */
export interface RadarCategory {
    name: string;
    currAmount: number;
    prevAmount: number;
    percent: number;
    emoji: string;
    color: string;
}

/** Radar chart data shape */
export interface RadarChartData {
    categories: RadarCategory[];
    maxValue: number;
    sides: number;
    polygonType: string;
    currentMonthIdx: number;
    prevMonthIdx: number;
}

/** Selected radar category for comparison overlay */
export interface SelectedRadarCategory {
    name: string;
    emoji: string;
    currAmount: number;
    prevAmount: number;
    color: string;
}

interface DashboardRadarSlideProps {
    radarChartData: RadarChartData;
    animationKey: number;
    isDark: boolean;
    selectedRadarCategory: SelectedRadarCategory | null;
    setSelectedRadarCategory: (cat: SelectedRadarCategory | null) => void;
    radarCurrentMonthLabel: string;
    radarPrevMonthLabel: string;
    translateTreemapName: (name: string) => string;
    t: (key: string) => string;
    formatCompactAmount: (amount: number) => string;
}

export const DashboardRadarSlide: React.FC<DashboardRadarSlideProps> = ({
    radarChartData,
    animationKey,
    isDark,
    selectedRadarCategory,
    setSelectedRadarCategory,
    radarCurrentMonthLabel,
    radarPrevMonthLabel,
    translateTreemapName,
    t,
    formatCompactAmount,
}) => {
    if (radarChartData.categories.length < 3) {
        return (
            <div className="h-full flex items-center justify-center text-sm text-center" style={{ color: 'var(--secondary)' }}>
                {t('needMoreCategories') || 'Se necesitan al menos 3 categorías para mostrar el radar'}
            </div>
        );
    }

    const center = { x: 100, y: 80 };
    const maxRadius = 58;
    const sides = radarChartData.sides;

    // Generate angles for N-sided polygon (starting from top, -90 degrees)
    const angles = Array.from({ length: sides }, (_, i) =>
        (-90 + (360 / sides) * i) * Math.PI / 180
    );

    // Helper to generate polygon points at a given radius
    const getPolygonPoints = (radius: number) =>
        angles.map(a => ({
            x: center.x + radius * Math.cos(a),
            y: center.y + radius * Math.sin(a)
        }));

    // Generate 4 concentric grid rings
    const ringRadii = [maxRadius, maxRadius * 0.75, maxRadius * 0.5, maxRadius * 0.25];
    const gridRings = ringRadii.map((r, i) => ({
        points: getPolygonPoints(r).map(p => `${p.x},${p.y}`).join(' '),
        fill: isDark
            ? (i % 2 === 0 ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)')
            : (i % 2 === 0 ? '#f1f5f9' : '#f8fafc')
    }));

    const axisEndpoints = getPolygonPoints(maxRadius);

    const currPoints = radarChartData.categories.map((cat, i) => {
        const ratio = cat.currAmount / radarChartData.maxValue;
        const radius = maxRadius * Math.max(0.1, ratio);
        return { x: center.x + radius * Math.cos(angles[i]), y: center.y + radius * Math.sin(angles[i]) };
    });

    const prevPoints = radarChartData.categories.map((cat, i) => {
        const ratio = cat.prevAmount / radarChartData.maxValue;
        const radius = maxRadius * Math.max(0.1, ratio);
        return { x: center.x + radius * Math.cos(angles[i]), y: center.y + radius * Math.sin(angles[i]) };
    });

    const currPolygon = currPoints.map(p => `${p.x},${p.y}`).join(' ');
    const prevPolygon = prevPoints.map(p => `${p.x},${p.y}`).join(' ');

    // Category icon positioning
    const getPositionStyle = (index: number) => {
        const angle = (-90 + (360 / sides) * index) * Math.PI / 180;
        const radius = 42;
        return { left: `${50 + radius * Math.cos(angle)}%`, top: `${50 + radius * Math.sin(angle)}%`, transform: 'translate(-50%, -50%)' };
    };

    const getPercent = (amount: number) => {
        if (radarChartData.maxValue === 0) return 0;
        return Math.min(100, (amount / radarChartData.maxValue) * 100);
    };

    const iconSize = 52;
    const strokeWidth = 3.5;
    const outerRadius = 23;
    const innerRadius = outerRadius - strokeWidth;
    const centerRadius = innerRadius - (strokeWidth / 2);
    const baseDelay = 0.3;
    const staggerDelay = 0.1;

    return (
        <>
            {/* SVG Dynamic Polygon Radar Chart */}
            <div className="flex-1 relative">
                <svg viewBox="0 0 200 150" style={{ width: '100%', height: '100%' }} className="overflow-visible">
                    {/* Grid rings */}
                    {gridRings.map((ring, i) => (
                        <polygon key={`ring-${i}`} points={ring.points} fill={ring.fill}
                            stroke={isDark ? 'rgba(255,255,255,0.12)' : '#e2e8f0'} strokeWidth="1" />
                    ))}

                    {/* Axis lines */}
                    {axisEndpoints.map((p, i) => (
                        <line key={`axis-${i}`} x1={center.x} y1={center.y} x2={p.x} y2={p.y}
                            stroke={isDark ? 'rgba(255,255,255,0.12)' : '#e2e8f0'} strokeWidth="1" opacity="0.5" />
                    ))}

                    {/* Previous month polygon */}
                    <polygon key={`prev-${animationKey}`} points={prevPolygon}
                        fill="#f59e0b" fillOpacity="0.12" stroke="#f59e0b" strokeWidth="2"
                        style={{ opacity: 0, transformOrigin: `${center.x}px ${center.y}px`,
                            animation: 'radarExpand 1s ease-out forwards', animationDelay: '0.1s' }} />

                    {/* Current month polygon */}
                    <polygon key={`curr-${animationKey}`} points={currPolygon}
                        fill="var(--primary, #2563eb)" fillOpacity="0.18" stroke="var(--primary, #2563eb)" strokeWidth="2"
                        style={{ opacity: 0, transformOrigin: `${center.x}px ${center.y}px`,
                            animation: 'radarExpand 1s ease-out forwards', animationDelay: '0.3s' }} />

                    {/* Current month data points */}
                    {currPoints.map((p, i) => (
                        <circle key={`curr-dot-${animationKey}-${i}`} cx={p.x} cy={p.y} r="4"
                            fill="var(--primary, #2563eb)" stroke="white" strokeWidth="1.5"
                            style={{ opacity: 0, animation: 'fade-in 0.5s ease-out forwards', animationDelay: '0.8s' }} />
                    ))}
                </svg>

                {/* Category icons with dual progress rings */}
                {radarChartData.categories.map((cat, i) => {
                    const currPercent = getPercent(cat.currAmount);
                    const prevPercent = getPercent(cat.prevAmount);
                    const innerCircum = 2 * Math.PI * innerRadius;
                    const outerCircum = 2 * Math.PI * outerRadius;
                    const innerOffset = innerCircum - (prevPercent / 100) * innerCircum;
                    const outerOffset = outerCircum - (currPercent / 100) * outerCircum;
                    const isSelected = selectedRadarCategory?.name === cat.name;
                    const animDelay = baseDelay + (i * staggerDelay);

                    return (
                        <div key={`${cat.name}-${animationKey}`}
                            className="absolute cursor-pointer hover:scale-110 transition-transform"
                            style={{ ...getPositionStyle(i), width: iconSize, height: iconSize }}
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRadarCategory(
                                    selectedRadarCategory?.name === cat.name ? null : {
                                        name: cat.name, emoji: cat.emoji,
                                        currAmount: cat.currAmount, prevAmount: cat.prevAmount, color: cat.color
                                    }
                                );
                            }}
                            data-testid={`radar-icon-${cat.name.toLowerCase().replace(/\s+/g, '-')}`}
                        >
                            <svg width={iconSize} height={iconSize} style={{ position: 'absolute', top: 0, left: 0 }}>
                                <circle key={`outer-ring-${cat.name}-${animationKey}`}
                                    cx={iconSize / 2} cy={iconSize / 2} r={outerRadius}
                                    fill="none" stroke="var(--primary, #2563eb)" strokeWidth={strokeWidth}
                                    strokeLinecap="round" strokeDasharray={outerCircum}
                                    style={{
                                        transform: 'rotate(-90deg)', transformOrigin: 'center',
                                        // @ts-expect-error - CSS custom properties
                                        '--ring-circumference': outerCircum, '--target-offset': outerOffset,
                                        strokeDashoffset: outerOffset,
                                        animation: `progressRingFill 0.8s ease-out ${animDelay}s forwards`
                                    }} />
                                <circle key={`inner-ring-${cat.name}-${animationKey}`}
                                    cx={iconSize / 2} cy={iconSize / 2} r={innerRadius}
                                    fill="none" stroke="#f59e0b" strokeWidth={strokeWidth}
                                    strokeLinecap="round" strokeDasharray={innerCircum}
                                    style={{
                                        transform: 'rotate(-90deg)', transformOrigin: 'center',
                                        // @ts-expect-error - CSS custom properties
                                        '--ring-circumference': innerCircum, '--target-offset': innerOffset,
                                        strokeDashoffset: innerOffset,
                                        animation: `progressRingFill 0.8s ease-out ${animDelay + 0.1}s forwards`
                                    }} />
                                <circle cx={iconSize / 2} cy={iconSize / 2} r={centerRadius}
                                    fill={cat.color} stroke={isSelected ? 'white' : 'none'} strokeWidth={isSelected ? 2 : 0} />
                            </svg>
                            <span className="absolute flex items-center justify-center"
                                style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '18px' }}>
                                {cat.emoji}
                            </span>
                        </div>
                    );
                })}

                {/* Comparison overlays when category selected */}
                {selectedRadarCategory && (
                    <React.Fragment key={selectedRadarCategory.name}>
                        <div className="absolute left-0 top-1 flex flex-col items-start animate-comparison-left" style={{ maxWidth: '90px' }}>
                            <div className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-medium shadow-sm"
                                style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)', color: 'var(--secondary)' }}>
                                <span className="opacity-70">{radarPrevMonthLabel}</span>
                                <span>{formatCompactAmount(selectedRadarCategory.prevAmount)}</span>
                            </div>
                            <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                                style={{ backgroundColor: selectedRadarCategory.color + '25', color: 'var(--primary)' }}>
                                <span>{selectedRadarCategory.emoji}</span>
                                <span className="truncate" style={{ maxWidth: '60px' }}>{
                                    selectedRadarCategory.name === 'Otro' || selectedRadarCategory.name === 'Other' ||
                                    selectedRadarCategory.name === 'otros' || selectedRadarCategory.name === 'otros-item'
                                        ? t('otherCategory')
                                        : translateTreemapName(selectedRadarCategory.name)
                                }</span>
                            </div>
                        </div>

                        <div className="absolute right-0 top-1 flex flex-col items-end animate-comparison-right" style={{ maxWidth: '90px' }}>
                            <div className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-bold shadow-sm"
                                style={{ backgroundColor: 'var(--primary)', color: 'var(--bg)' }}>
                                <span className="opacity-70">{radarCurrentMonthLabel}</span>
                                <span>{formatCompactAmount(selectedRadarCategory.currAmount)}</span>
                            </div>
                            {(() => {
                                const change = selectedRadarCategory.prevAmount > 0
                                    ? ((selectedRadarCategory.currAmount - selectedRadarCategory.prevAmount) / selectedRadarCategory.prevAmount) * 100
                                    : 100;
                                const isUp = change >= 0;
                                return (
                                    <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-xs font-bold"
                                        style={{ backgroundColor: isUp ? 'var(--negative-bg)' : 'var(--positive-bg)',
                                            color: isUp ? 'var(--negative-primary)' : 'var(--positive-primary)' }}>
                                        {isUp ? '↑' : '↓'}{Math.abs(Math.round(change))}%
                                    </span>
                                );
                            })()}
                        </div>
                    </React.Fragment>
                )}
            </div>
        </>
    );
};
