/**
 * LimitesView Sub-View
 * Story 14.22 AC #3: Spending Limits placeholder for Epic 15
 *
 * Shows placeholder UI matching mockup design:
 * - Global monthly limit with toggle and progress
 * - Category limits section with sample categories
 * - Limit alerts toggle
 *
 * NOTE: This is placeholder UI. Limit enforcement not yet implemented.
 * Will be functional in Epic 15.
 */

import React from 'react';
import { Clock, Bell, PlusCircle, Coffee, Car, Gift, ChevronDown } from 'lucide-react';

interface LimitesViewProps {
    t: (key: string) => string;
    lang?: string;
    theme?: string;
}

// Sample category limits for placeholder
const SAMPLE_CATEGORY_LIMITS = [
    {
        id: 'alimentacion',
        name: 'Alimentacion',
        nameEn: 'Food',
        icon: Coffee,
        iconBg: '#dcfce7',
        iconColor: '#22c55e',
        spent: 120000,
        limit: 150000,
    },
    {
        id: 'transporte',
        name: 'Transporte',
        nameEn: 'Transport',
        icon: Car,
        iconBg: '#dbeafe',
        iconColor: '#3b82f6',
        spent: 45000,
        limit: 80000,
    },
    {
        id: 'entretenimiento',
        name: 'Entretenimiento',
        nameEn: 'Entertainment',
        icon: Gift,
        iconBg: '#fce7f3',
        iconColor: '#ec4899',
        spent: 28000,
        limit: 50000,
    },
];

export const LimitesView: React.FC<LimitesViewProps> = ({
    t: _t,
    lang = 'es',
    theme = 'light',
}) => {
    const isDark = theme === 'dark';
    const isSpanish = lang === 'es';

    // Placeholder global limit values
    const globalLimit = 500000;
    const globalSpent = 325000;
    const globalAvailable = globalLimit - globalSpent;
    const globalPercent = (globalSpent / globalLimit) * 100;

    // Format currency for display
    const formatAmount = (amount: number) => {
        return `$${amount.toLocaleString('es-CL')}`;
    };

    return (
        <div className="flex flex-col gap-3">
            {/* Global Monthly Limit Card */}
            <div
                className="p-4 rounded-xl"
                style={{
                    backgroundColor: 'var(--bg-secondary)',
                    border: `1px solid ${isDark ? '#334155' : 'var(--border-light)'}`,
                }}
            >
                {/* Header with toggle */}
                <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                        <Clock size={20} style={{ color: 'var(--primary)' }} />
                        <span
                            className="font-medium"
                            style={{ color: 'var(--text-primary)' }}
                        >
                            {isSpanish ? 'Limite Mensual Global' : 'Global Monthly Limit'}
                        </span>
                    </div>
                    {/* Toggle placeholder - ON state */}
                    <div
                        className="w-12 h-7 rounded-full relative cursor-pointer"
                        style={{ backgroundColor: 'var(--primary)' }}
                    >
                        <div
                            className="w-5 h-5 rounded-full absolute top-1 bg-white transition-all"
                            style={{ right: '4px' }}
                        />
                    </div>
                </div>

                {/* Limit amount display */}
                <div className="mb-3">
                    <span
                        className="text-3xl font-bold"
                        style={{ color: 'var(--text-primary)' }}
                    >
                        {formatAmount(globalLimit)}
                    </span>
                </div>

                {/* Progress bar */}
                <div
                    className="h-2 rounded-full overflow-hidden mb-2"
                    style={{ backgroundColor: isDark ? '#334155' : '#e2e8f0' }}
                >
                    <div
                        className="h-full rounded-full transition-all"
                        style={{
                            width: `${globalPercent}%`,
                            backgroundColor: globalPercent > 80
                                ? 'var(--warning, #f59e0b)'
                                : 'var(--primary)',
                        }}
                    />
                </div>

                {/* Stats */}
                <div className="flex justify-between text-sm">
                    <span style={{ color: 'var(--text-secondary)' }}>
                        {isSpanish ? 'Gastado' : 'Spent'}: {formatAmount(globalSpent)}
                    </span>
                    <span style={{ color: 'var(--text-secondary)' }}>
                        {isSpanish ? 'Disponible' : 'Available'}: {formatAmount(globalAvailable)}
                    </span>
                </div>
            </div>

            {/* Category Limits Section */}
            <div className="mt-2">
                {/* Header */}
                <div className="flex justify-between items-center mb-3">
                    <span
                        className="text-xs font-semibold uppercase tracking-wide"
                        style={{ color: 'var(--text-secondary)', letterSpacing: '0.5px' }}
                    >
                        {isSpanish ? 'Limites por Categoria' : 'Limits by Category'}
                    </span>
                    <button
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
                        style={{
                            backgroundColor: 'var(--primary-light)',
                            color: 'var(--primary)',
                        }}
                    >
                        <PlusCircle size={14} />
                        <span>{isSpanish ? 'Agregar' : 'Add'}</span>
                    </button>
                </div>

                {/* Category limit items */}
                {SAMPLE_CATEGORY_LIMITS.map((category) => {
                    const percent = (category.spent / category.limit) * 100;
                    const IconComponent = category.icon;

                    return (
                        <div
                            key={category.id}
                            className="p-3 rounded-xl mb-2 cursor-pointer"
                            style={{
                                backgroundColor: 'var(--bg-secondary)',
                                border: `1px solid ${isDark ? '#334155' : 'var(--border-light)'}`,
                            }}
                        >
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    {/* Category icon */}
                                    <div
                                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                                        style={{ backgroundColor: category.iconBg }}
                                    >
                                        <IconComponent
                                            size={16}
                                            style={{ color: category.iconColor }}
                                        />
                                    </div>
                                    {/* Category info */}
                                    <div>
                                        <span
                                            className="font-medium text-sm"
                                            style={{ color: 'var(--text-primary)' }}
                                        >
                                            {isSpanish ? category.name : category.nameEn}
                                        </span>
                                        <div
                                            className="text-xs"
                                            style={{ color: 'var(--text-secondary)' }}
                                        >
                                            {formatAmount(category.spent)} / {formatAmount(category.limit)}
                                        </div>
                                    </div>
                                </div>
                                {/* Progress mini bar and chevron */}
                                <div className="flex items-center gap-2">
                                    <div
                                        className="w-10 h-1 rounded-full overflow-hidden"
                                        style={{ backgroundColor: isDark ? '#334155' : 'var(--bg-tertiary)' }}
                                    >
                                        <div
                                            className="h-full rounded-full"
                                            style={{
                                                width: `${percent}%`,
                                                backgroundColor: percent > 80
                                                    ? 'var(--warning, #f59e0b)'
                                                    : 'var(--primary)',
                                            }}
                                        />
                                    </div>
                                    <ChevronDown
                                        size={16}
                                        style={{ color: 'var(--text-tertiary)' }}
                                    />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Limit Alerts Toggle */}
            <div
                className="p-4 rounded-xl mt-2"
                style={{
                    backgroundColor: 'var(--bg-secondary)',
                    border: `1px solid ${isDark ? '#334155' : 'var(--border-light)'}`,
                }}
            >
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Bell size={20} style={{ color: 'var(--text-secondary)' }} />
                        <div>
                            <span
                                className="font-medium"
                                style={{ color: 'var(--text-primary)' }}
                            >
                                {isSpanish ? 'Alertas de Limite' : 'Limit Alerts'}
                            </span>
                            <div
                                className="text-xs"
                                style={{ color: 'var(--text-secondary)' }}
                            >
                                {isSpanish
                                    ? 'Notificar al 80% del limite'
                                    : 'Notify at 80% of limit'}
                            </div>
                        </div>
                    </div>
                    {/* Toggle placeholder - ON state */}
                    <div
                        className="w-12 h-7 rounded-full relative cursor-pointer"
                        style={{ backgroundColor: 'var(--primary)' }}
                    >
                        <div
                            className="w-5 h-5 rounded-full absolute top-1 bg-white transition-all"
                            style={{ right: '4px' }}
                        />
                    </div>
                </div>
            </div>

            {/* Coming soon notice */}
            <div
                className="text-xs text-center py-2"
                style={{ color: 'var(--text-tertiary)' }}
            >
                {isSpanish
                    ? 'Proximamente: configuracion y alertas de limites'
                    : 'Coming soon: limit configuration and alerts'}
            </div>
        </div>
    );
};
