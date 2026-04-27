/**
 * SuscripcionView Sub-View
 * Story 14.22 AC #7: Subscription plan and credits display
 *
 * Redesigned to match mockup with:
 * - Current plan card with ACTIVO badge
 * - Scan Credits (just shows available, no limit shown)
 * - Super Credits (don't expire)
 * - Three plan tiers: Freemium, Pro, Business
 *
 * NOTE: This is a placeholder UI. Credit enforcement is not yet implemented.
 * Currently all users get unlimited credits. Future development will:
 * - Enforce Freemium: 60 normal credits/month, 0 super credits
 * - Enable Pro and Business subscriptions via in-app purchase
 * - Add super credits purchase option
 */

import React from 'react';
import { Camera, Sparkles, Check } from 'lucide-react';
import { DEFAULT_CURRENCY } from '@/utils/currency';

// Plan tier configuration - placeholder for future implementation
interface PlanTier {
    id: 'freemium' | 'pro' | 'business';
    name: string;
    badge?: { text: string; bgColor: string; textColor: string };
    description: string;
    normalCredits: number | 'unlimited';
    superCredits: number;
    price: number;
    currency: string;
}

const PLAN_TIERS: PlanTier[] = [
    {
        id: 'freemium',
        name: 'Freemium',
        badge: undefined, // Will show "ACTUAL" if current
        description: '60 escaneos/mes',
        normalCredits: 60,
        superCredits: 0,
        price: 0,
        currency: DEFAULT_CURRENCY,
    },
    {
        id: 'pro',
        name: 'Pro',
        badge: { text: 'POPULAR', bgColor: '#fef3c7', textColor: '#f59e0b' },
        description: '500 escaneos/mes + 10 super creditos',
        normalCredits: 500,
        superCredits: 10,
        price: 4990,
        currency: DEFAULT_CURRENCY,
    },
    {
        id: 'business',
        name: 'Business',
        badge: undefined,
        description: 'Escaneos ilimitados + 50 super creditos + API',
        normalCredits: 'unlimited',
        superCredits: 50,
        price: 14990,
        currency: DEFAULT_CURRENCY,
    },
];

interface SuscripcionViewProps {
    t: (key: string) => string;
    lang: string;
    theme: string;
    /** Current subscription plan */
    plan?: 'freemium' | 'pro' | 'business';
    /** Available normal scan credits (directly from Firestore remaining field) */
    creditsRemaining?: number;
    /** Super credits remaining (purchased, don't expire) */
    superCreditsRemaining?: number;
    /** Days until credits reset (only shown if hasMonthlyLimit is true) */
    daysUntilReset?: number;
}

export const SuscripcionView: React.FC<SuscripcionViewProps> = ({
    // t available for future translations
    t: _t,
    lang,
    theme,
    plan = 'freemium',
    creditsRemaining = 0,
    superCreditsRemaining = 0,
    daysUntilReset = 15,
}) => {
    const isDark = theme === 'dark';
    const isSpanish = lang === 'es';

    // Get current plan info
    const currentPlan = PLAN_TIERS.find(p => p.id === plan) || PLAN_TIERS[0];

    // Determine if user has a monthly limit (future: freemium will have limit)
    // For now, everyone has unlimited so we don't show the limit UI
    const hasMonthlyLimit = false; // TODO: Set to true for freemium when enforced

    // Format price for display
    const formatPrice = (price: number) => {
        if (price === 0) return '$0';
        return `$${price.toLocaleString('es-CL')}`;
    };

    return (
        <div className="flex flex-col gap-3">
            {/* Current Plan Card */}
            <div
                className="p-4 rounded-xl"
                style={{
                    background: 'linear-gradient(135deg, var(--primary) 0%, #3d6b4a 100%)',
                    color: 'white',
                }}
            >
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <div
                            className="text-xs font-medium uppercase tracking-wide mb-1"
                            style={{ opacity: 0.8 }}
                        >
                            {isSpanish ? 'Plan Actual' : 'Current Plan'}
                        </div>
                        <div className="text-2xl font-bold">{currentPlan.name}</div>
                    </div>
                    <div
                        className="px-2 py-1 rounded-full text-xs font-semibold"
                        style={{
                            backgroundColor: 'rgba(255,255,255,0.2)',
                            color: 'white',
                        }}
                    >
                        {isSpanish ? 'ACTIVO' : 'ACTIVE'}
                    </div>
                </div>
                <div className="text-sm" style={{ opacity: 0.9 }}>
                    {isSpanish
                        ? 'Acceso basico con limite mensual de escaneos'
                        : 'Basic access with monthly scan limit'}
                </div>
            </div>

            {/* Scan Credits Card */}
            <div
                className="p-4 rounded-xl"
                style={{
                    backgroundColor: 'var(--bg-secondary)',
                    border: `1px solid ${isDark ? '#334155' : 'var(--border-light)'}`,
                }}
            >
                {/* Header */}
                <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                        <Camera size={20} style={{ color: 'var(--primary)' }} />
                        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                            {isSpanish ? 'Creditos de Escaneo' : 'Scan Credits'}
                        </span>
                    </div>
                    {hasMonthlyLimit && (
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                            {isSpanish
                                ? `Reinicia en ${daysUntilReset} dias`
                                : `Resets in ${daysUntilReset} days`}
                        </span>
                    )}
                </div>

                {/* Credits display - just show available credits */}
                <div className="flex justify-between items-baseline mb-2">
                    <div>
                        <span
                            className="text-3xl font-bold"
                            style={{ color: 'var(--primary)' }}
                        >
                            {creditsRemaining.toLocaleString()}
                        </span>
                    </div>
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {isSpanish ? 'disponibles' : 'available'}
                    </span>
                </div>

                {/* Progress bar - only show if there's a monthly limit (future feature) */}
            </div>

            {/* Super Credits Card */}
            <div
                className="p-4 rounded-xl"
                style={{
                    backgroundColor: 'var(--bg-secondary)',
                    border: `1px solid ${isDark ? '#334155' : 'var(--border-light)'}`,
                }}
            >
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Sparkles size={20} style={{ color: '#f59e0b' }} />
                        <div>
                            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                                {isSpanish ? 'Super Creditos' : 'Super Credits'}
                            </span>
                            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                {isSpanish ? 'No expiran' : "Don't expire"}
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <span
                            className="text-2xl font-bold"
                            style={{ color: '#f59e0b' }}
                        >
                            {superCreditsRemaining.toLocaleString()}
                        </span>
                        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                            {isSpanish ? 'disponibles' : 'available'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Plans Section Label */}
            <div
                className="text-xs font-semibold uppercase tracking-wide mt-2"
                style={{ color: 'var(--text-secondary)', letterSpacing: '0.5px' }}
            >
                {isSpanish ? 'Planes Disponibles' : 'Available Plans'}
            </div>

            {/* Plan Tiers */}
            {PLAN_TIERS.map((tier) => {
                const isCurrentPlan = tier.id === plan;

                return (
                    <div
                        key={tier.id}
                        className="p-4 rounded-xl cursor-pointer transition-all"
                        style={{
                            backgroundColor: 'var(--bg-secondary)',
                            border: isCurrentPlan
                                ? '2px solid var(--primary)'
                                : `1px solid ${isDark ? '#334155' : 'var(--border-light)'}`,
                        }}
                    >
                        <div className="flex justify-between items-start">
                            <div className="flex-1">
                                {/* Plan name and badges */}
                                <div className="flex items-center gap-2 mb-1">
                                    <span
                                        className="text-base font-semibold"
                                        style={{ color: 'var(--text-primary)' }}
                                    >
                                        {tier.name}
                                    </span>
                                    {isCurrentPlan && (
                                        <span
                                            className="px-2 py-0.5 rounded-full text-xs font-semibold"
                                            style={{
                                                backgroundColor: 'var(--primary-light)',
                                                color: 'var(--primary)',
                                            }}
                                        >
                                            {isSpanish ? 'ACTUAL' : 'CURRENT'}
                                        </span>
                                    )}
                                    {tier.badge && !isCurrentPlan && (
                                        <span
                                            className="px-2 py-0.5 rounded-full text-xs font-semibold"
                                            style={{
                                                backgroundColor: tier.badge.bgColor,
                                                color: tier.badge.textColor,
                                            }}
                                        >
                                            {tier.badge.text}
                                        </span>
                                    )}
                                </div>

                                {/* Description */}
                                <div
                                    className="text-xs mb-2"
                                    style={{ color: 'var(--text-secondary)' }}
                                >
                                    {tier.description}
                                </div>

                                {/* Price */}
                                <div style={{ color: 'var(--text-primary)' }}>
                                    <span className="text-xl font-bold">
                                        {formatPrice(tier.price)}
                                    </span>
                                    <span
                                        className="text-xs ml-1"
                                        style={{ color: 'var(--text-secondary)' }}
                                    >
                                        /{isSpanish ? 'mes' : 'mo'}
                                    </span>
                                </div>
                            </div>

                            {/* Selection indicator */}
                            {isCurrentPlan ? (
                                <div
                                    className="w-6 h-6 rounded-full flex items-center justify-center"
                                    style={{ backgroundColor: 'var(--primary)' }}
                                >
                                    <Check size={14} strokeWidth={3} color="white" />
                                </div>
                            ) : (
                                <div
                                    className="w-6 h-6 rounded-full"
                                    style={{
                                        border: `2px solid ${isDark ? '#475569' : 'var(--border-medium)'}`,
                                    }}
                                />
                            )}
                        </div>
                    </div>
                );
            })}

            {/* Payment Methods Section */}
            <div
                className="text-xs font-semibold uppercase tracking-wide mt-4"
                style={{ color: 'var(--text-secondary)', letterSpacing: '0.5px' }}
            >
                {isSpanish ? 'Metodos de Pago' : 'Payment Methods'}
            </div>

            {/* Mercado Pago */}
            <div
                className="p-4 rounded-xl cursor-pointer transition-all"
                style={{
                    backgroundColor: 'var(--bg-secondary)',
                    border: `1px solid ${isDark ? '#334155' : 'var(--border-light)'}`,
                }}
            >
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        {/* Mercado Pago logo placeholder */}
                        <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: '#00b1ea' }}
                        >
                            <span className="text-white font-bold text-sm">MP</span>
                        </div>
                        <div>
                            <span
                                className="font-medium"
                                style={{ color: 'var(--text-primary)' }}
                            >
                                Mercado Pago
                            </span>
                            <div
                                className="text-xs"
                                style={{ color: 'var(--text-secondary)' }}
                            >
                                {isSpanish ? 'No configurado' : 'Not configured'}
                            </div>
                        </div>
                    </div>
                    <div
                        className="px-3 py-1.5 rounded-lg text-xs font-medium"
                        style={{
                            backgroundColor: 'var(--primary-light)',
                            color: 'var(--primary)',
                        }}
                    >
                        {isSpanish ? 'Conectar' : 'Connect'}
                    </div>
                </div>
            </div>

            {/* Google Pay */}
            <div
                className="p-4 rounded-xl cursor-pointer transition-all"
                style={{
                    backgroundColor: 'var(--bg-secondary)',
                    border: `1px solid ${isDark ? '#334155' : 'var(--border-light)'}`,
                }}
            >
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        {/* Google Pay logo placeholder */}
                        <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: isDark ? '#3c4043' : '#f1f3f4' }}
                        >
                            <span
                                className="font-bold text-sm"
                                style={{ color: isDark ? '#fff' : '#5f6368' }}
                            >
                                G
                            </span>
                        </div>
                        <div>
                            <span
                                className="font-medium"
                                style={{ color: 'var(--text-primary)' }}
                            >
                                Google Pay
                            </span>
                            <div
                                className="text-xs"
                                style={{ color: 'var(--text-secondary)' }}
                            >
                                {isSpanish ? 'No configurado' : 'Not configured'}
                            </div>
                        </div>
                    </div>
                    <div
                        className="px-3 py-1.5 rounded-lg text-xs font-medium"
                        style={{
                            backgroundColor: 'var(--primary-light)',
                            color: 'var(--primary)',
                        }}
                    >
                        {isSpanish ? 'Conectar' : 'Connect'}
                    </div>
                </div>
            </div>

            {/* Placeholder notice */}
            <div
                className="text-xs text-center py-2"
                style={{ color: 'var(--text-tertiary)' }}
            >
                {isSpanish
                    ? 'Proximamente: compra de planes y creditos adicionales'
                    : 'Coming soon: plan purchases and additional credits'}
            </div>
        </div>
    );
};
