/**
 * DashboardBumpSlide — Bump chart slide for Dashboard carousel
 *
 * Story 15-TD-5: Extracted from DashboardView.tsx
 *
 * Shows category ranking changes over the last 4 months with
 * animated lines, clickable data points, and a category legend.
 */
import React from 'react';
import { translateCategory } from '@/utils/categoryTranslations';

/** Bump chart category data */
export interface BumpChartCategory {
    name: string;
    color: string;
    amounts: number[];
    ranks: number[];
    total: number;
}

/** Bump chart data shape */
export interface BumpChartData {
    monthData: { year: number; month: number; isCurrentMonth: boolean }[];
    categories: BumpChartCategory[];
}

/** Bump tooltip state */
export interface BumpTooltipData {
    category: string;
    month: string;
    amount: number;
    color: string;
}

interface DashboardBumpSlideProps {
    bumpChartData: BumpChartData;
    bumpChartMonthLabels: string[];
    animationKey: number;
    isDark: boolean;
    lang: 'en' | 'es';
    bumpTooltip: BumpTooltipData | null;
    setBumpTooltip: (tooltip: BumpTooltipData | null) => void;
    translateTreemapName: (name: string) => string;
    getTreemapEmoji: (name: string) => string;
    t: (key: string) => string;
    formatCompactAmount: (amount: number) => string;
}

export const DashboardBumpSlide: React.FC<DashboardBumpSlideProps> = ({
    bumpChartData,
    bumpChartMonthLabels,
    animationKey,
    isDark,
    lang,
    bumpTooltip,
    setBumpTooltip,
    translateTreemapName,
    getTreemapEmoji,
    t,
    formatCompactAmount,
}) => {
    if (bumpChartData.categories.length === 0) {
        return (
            <div className="h-[180px] flex items-center justify-center">
                <p className="text-sm text-center" style={{ color: 'var(--secondary)' }}>
                    {t('noDataForBumpChart') || 'Sin datos suficientes'}
                </p>
            </div>
        );
    }

    const yPositions = [6, 30, 54, 78, 102];
    const xPositions = [28, 122, 216, 310];

    return (
        <div>
            {/* Tooltip display area */}
            <div className="h-6 flex items-center justify-center mb-1">
                {bumpTooltip ? (
                    <div className="flex items-center gap-2 text-sm">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: bumpTooltip.color }} />
                        <span style={{ color: bumpTooltip.color, fontWeight: 600 }}>
                            {bumpTooltip.category === 'Otro' || bumpTooltip.category === 'Other'
                                ? t('otherCategory')
                                : translateCategory(bumpTooltip.category, lang)}
                        </span>
                        <span style={{ color: 'var(--text-tertiary)' }}>{t('bumpInMonth')} {bumpTooltip.month}:</span>
                        <span className="font-semibold" style={{ color: 'var(--foreground)' }}>
                            {formatCompactAmount(bumpTooltip.amount)}
                        </span>
                    </div>
                ) : (
                    <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        {t('tapPointForDetails')}
                    </span>
                )}
            </div>

            {/* SVG Bump Chart */}
            <svg viewBox="0 0 320 110" style={{ width: '100%', height: '110px' }}>
                {/* Y-axis labels */}
                {['#1', '#2', '#3', '#4', '#5'].map((label, i) => (
                    <text key={label} x="0" y={yPositions[i]} dominantBaseline="middle"
                        fontSize="10" fill="var(--text-tertiary)" fontWeight={i === 0 ? '600' : undefined}>
                        {label}
                    </text>
                ))}

                {/* Grid lines */}
                {yPositions.map((y, i) => (
                    <line key={`grid-${i}`} x1="28" y1={y} x2="310" y2={y}
                        stroke="var(--border-light)" strokeWidth="1" />
                ))}

                {/* Category lines and points */}
                {bumpChartData.categories.map((cat, catIdx) => {
                    const points = cat.ranks.map((rank, monthIdx) => {
                        const y = yPositions[Math.min(rank - 1, 4)];
                        return `${xPositions[monthIdx]},${y}`;
                    }).join(' ');

                    return (
                        <g key={`${cat.name}-${animationKey}`}>
                            <polyline fill="none" stroke={cat.color} strokeWidth="3"
                                strokeLinecap="round" strokeLinejoin="round" points={points}
                                style={{
                                    strokeDasharray: 1000, strokeDashoffset: 1000,
                                    animation: 'drawLine 0.8s ease-out forwards',
                                    animationDelay: `${catIdx * 0.1}s`
                                }} />
                            {cat.ranks.map((rank, monthIdx) => {
                                const y = yPositions[Math.min(rank - 1, 4)];
                                const isSelected = bumpTooltip?.category === cat.name && bumpTooltip?.month === bumpChartMonthLabels[monthIdx];
                                return (
                                    <circle key={`${cat.name}-${monthIdx}-${animationKey}`}
                                        cx={xPositions[monthIdx]} cy={y}
                                        r={isSelected ? 8 : 6} fill={cat.color}
                                        stroke="white" strokeWidth={isSelected ? 3 : 2}
                                        style={{
                                            cursor: 'pointer', opacity: 0,
                                            animation: 'dotAppear 0.3s ease-out forwards',
                                            animationDelay: `${catIdx * 0.1 + monthIdx * 0.15 + 0.2}s`
                                        }}
                                        onClick={() => setBumpTooltip({
                                            category: cat.name,
                                            month: bumpChartMonthLabels[monthIdx],
                                            amount: cat.amounts[monthIdx],
                                            color: cat.color
                                        })} />
                                );
                            })}
                        </g>
                    );
                })}
            </svg>

            {/* X-axis labels */}
            <div className="flex justify-between mt-1 pl-5">
                {bumpChartMonthLabels.map((label, idx) => (
                    <span key={label} className="text-xs"
                        style={{ color: idx === 3 ? 'var(--primary)' : 'var(--text-tertiary)', fontWeight: idx === 3 ? 600 : 400 }}>
                        {label}
                    </span>
                ))}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t" style={{ borderColor: isDark ? '#334155' : '#e2e8f0' }}>
                {bumpChartData.categories.map((cat, idx) => (
                    <div key={`${cat.name}-${animationKey}`}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium"
                        style={{
                            backgroundColor: `${cat.color}20`, opacity: 0,
                            animation: 'fade-in 300ms ease-out forwards', animationDelay: `${800 + idx * 100}ms`
                        }}>
                        <span className="text-sm">{getTreemapEmoji(cat.name)}</span>
                        <span style={{ color: cat.color }}>
                            {cat.name === 'Otro' || cat.name === 'Other' || cat.name === 'otros' || cat.name === 'otros-item'
                                ? t('otherCategory')
                                : translateTreemapName(cat.name)} #{idx + 1}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};
