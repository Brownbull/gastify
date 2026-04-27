/**
 * LearnedDataView Sub-View (formerly DatosAprendidosView)
 * Story 14.22 AC #8, #11, #12: Learned data management
 *
 * Displays expandable sections for learned categories, merchants, subcategories, and trusted merchants
 * Layout matches mockup: icon (no background), title, description text, chevron
 * Includes confirmation dialog for clearing all learned data
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronUp, BookOpen, Home, Tag, CheckCircle2, Trash2, ChevronRight, X, AlertTriangle, Package } from 'lucide-react';
import { CategoryMappingsList } from '@features/settings/components/CategoryMappingsList';
import { MerchantMappingsList } from '@features/settings/components/MerchantMappingsList';
import { SubcategoryMappingsList } from '@features/settings/components/SubcategoryMappingsList';
import { TrustedMerchantsList } from '../TrustedMerchantsList';
import { ItemNameMappingsList } from '@features/settings/components/ItemNameMappingsList';
import type { CategoryMapping } from '@/types/categoryMapping';
import type { MerchantMapping } from '@/types/merchantMapping';
import type { SubcategoryMapping } from '@/types/subcategoryMapping';
import type { TrustedMerchant } from '@/types/trust';
import type { ItemNameMapping } from '@/types/itemNameMapping';

interface LearnedDataViewProps {
    t: (key: string) => string;
    theme: string;
    // Category mappings
    mappings?: CategoryMapping[];
    mappingsLoading?: boolean;
    onDeleteMapping?: (mappingId: string) => Promise<void>;
    onEditMapping?: (mappingId: string, newCategory: string) => Promise<void>;
    // Merchant mappings
    merchantMappings?: MerchantMapping[];
    merchantMappingsLoading?: boolean;
    onDeleteMerchantMapping?: (mappingId: string) => Promise<void>;
    onEditMerchantMapping?: (mappingId: string, newTarget: string) => Promise<void>;
    // Subcategory mappings
    subcategoryMappings?: SubcategoryMapping[];
    subcategoryMappingsLoading?: boolean;
    onDeleteSubcategoryMapping?: (mappingId: string) => Promise<void>;
    onUpdateSubcategoryMapping?: (mappingId: string, newSubcategory: string) => Promise<void>;
    // Trusted merchants
    trustedMerchants?: TrustedMerchant[];
    trustedMerchantsLoading?: boolean;
    onRevokeTrust?: (merchantName: string) => Promise<void>;
    // Item name mappings (Phase 5)
    itemNameMappings?: ItemNameMapping[];
    itemNameMappingsLoading?: boolean;
    onDeleteItemNameMapping?: (mappingId: string) => Promise<void>;
    onUpdateItemNameMapping?: (mappingId: string, newTarget: string) => Promise<void>;
    // Clear all learned data
    onClearAllLearnedData?: () => Promise<void>;
}

interface ExpandableSectionProps {
    title: string;
    description: string;
    icon: React.ReactNode;
    iconColor: string;
    count: number;
    isExpanded: boolean;
    onToggle: () => void;
    children: React.ReactNode;
    theme: string;
    t: (key: string) => string;
}

/**
 * Confirmation dialog for clearing all learned data
 */
interface ClearDataConfirmDialogProps {
    isOpen: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    isClearing: boolean;
    t: (key: string) => string;
    theme: string;
    // Counts to show in dialog
    categoryCount: number;
    merchantCount: number;
    subcategoryCount: number;
    trustedCount: number;
    itemNameCount: number;
}

const ClearDataConfirmDialog: React.FC<ClearDataConfirmDialogProps> = ({
    isOpen,
    onConfirm,
    onCancel,
    isClearing,
    t,
    theme,
    categoryCount,
    merchantCount,
    subcategoryCount,
    trustedCount,
    itemNameCount,
}) => {
    const modalRef = useRef<HTMLDivElement>(null);
    const cancelButtonRef = useRef<HTMLButtonElement>(null);
    const previousActiveElement = useRef<Element | null>(null);
    const isDark = theme === 'dark';

    useEffect(() => {
        if (isOpen) {
            previousActiveElement.current = document.activeElement;
            setTimeout(() => {
                cancelButtonRef.current?.focus();
            }, 0);
        }
    }, [isOpen]);

    const handleClose = useCallback(() => {
        if (isClearing) return; // Don't close while clearing
        onCancel();
        setTimeout(() => {
            (previousActiveElement.current as HTMLElement)?.focus?.();
        }, 0);
    }, [onCancel, isClearing]);

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !isClearing) {
                e.preventDefault();
                handleClose();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, handleClose, isClearing]);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const totalItems = categoryCount + merchantCount + subcategoryCount + trustedCount + itemNameCount;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={!isClearing ? handleClose : undefined}
            role="presentation"
        >
            <div className="absolute inset-0 bg-black/50" aria-hidden="true" />
            <div
                ref={modalRef}
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="clear-data-modal-title"
                aria-describedby="clear-data-modal-description"
                className="relative w-full max-w-sm rounded-2xl shadow-xl"
                style={{
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {!isClearing && (
                    <button
                        onClick={handleClose}
                        className="absolute right-4 top-4 p-1 rounded-full transition-colors"
                        style={{ color: 'var(--text-tertiary)' }}
                        aria-label={t('close') || 'Close'}
                    >
                        <X size={20} aria-hidden="true" />
                    </button>
                )}

                <div className="p-6 text-center">
                    {/* Warning icon */}
                    <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-red-500 flex items-center justify-center">
                        <AlertTriangle size={32} className="text-white" aria-hidden="true" />
                    </div>

                    {/* Title */}
                    <h2
                        id="clear-data-modal-title"
                        className="text-xl font-bold mb-3"
                    >
                        {t('clearAllLearnedDataTitle')}
                    </h2>

                    {/* Description with counts */}
                    <div
                        id="clear-data-modal-description"
                        className="text-sm text-left mb-4 p-3 rounded-lg"
                        style={{
                            backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2',
                            color: 'var(--text-secondary)',
                        }}
                    >
                        <p className="mb-2" style={{ color: 'var(--text-primary)' }}>
                            {t('clearAllLearnedDataConfirm')?.split('\n')[0] || 'This will permanently delete:'}
                        </p>
                        <ul className="space-y-1 ml-2">
                            {categoryCount > 0 && (
                                <li>• {t('learnedCategories')}: <strong>{categoryCount}</strong></li>
                            )}
                            {merchantCount > 0 && (
                                <li>• {t('learnedMerchants')}: <strong>{merchantCount}</strong></li>
                            )}
                            {subcategoryCount > 0 && (
                                <li>• {t('learnedSubcategories')}: <strong>{subcategoryCount}</strong></li>
                            )}
                            {trustedCount > 0 && (
                                <li>• {t('trustedMerchants')}: <strong>{trustedCount}</strong></li>
                            )}
                            {itemNameCount > 0 && (
                                <li>• {t('learnedItemNames')}: <strong>{itemNameCount}</strong></li>
                            )}
                        </ul>
                        <p className="mt-3 text-xs" style={{ color: '#22c55e' }}>
                            ✓ Your transaction data will NOT be affected
                        </p>
                    </div>

                    {/* Total count */}
                    <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                        Total: <strong style={{ color: '#ef4444' }}>{totalItems}</strong> items will be deleted
                    </p>

                    {/* Action buttons */}
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={onConfirm}
                            disabled={isClearing || totalItems === 0}
                            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold hover:from-red-600 hover:to-red-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isClearing ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Clearing...
                                </>
                            ) : (
                                <>
                                    <Trash2 size={18} />
                                    {t('confirm')}
                                </>
                            )}
                        </button>

                        <button
                            ref={cancelButtonRef}
                            onClick={handleClose}
                            disabled={isClearing}
                            className="w-full py-3 px-4 rounded-xl font-medium transition-colors disabled:opacity-50"
                            style={{
                                border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                                color: 'var(--text-primary)',
                            }}
                        >
                            {t('cancel')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ExpandableSection: React.FC<ExpandableSectionProps> = ({
    title,
    description,
    icon,
    iconColor,
    count,
    isExpanded,
    onToggle,
    children,
    theme,
    t,
}) => {
    const isDark = theme === 'dark';

    return (
        <div
            className="rounded-xl border overflow-hidden"
            style={{
                backgroundColor: 'var(--bg-secondary)',
                borderColor: isDark ? '#334155' : '#e2e8f0',
            }}
        >
            {/* Header - Mockup style: icon (no bg), title, description, chevron */}
            <button
                onClick={onToggle}
                className="w-full py-3.5 px-4 flex items-center justify-between"
                style={{ backgroundColor: 'transparent' }}
            >
                <div className="flex items-center gap-2.5">
                    {/* Icon with NO background - just colored icon per mockup */}
                    <div style={{ color: iconColor }}>
                        {icon}
                    </div>
                    <div className="text-left">
                        <span className="font-medium block text-sm" style={{ color: 'var(--text-primary)' }}>
                            {title}
                        </span>
                        {/* Description text - green per mockup */}
                        <span className="text-xs" style={{ color: 'var(--primary)' }}>
                            {description}
                        </span>
                    </div>
                </div>
                {isExpanded ? (
                    <ChevronUp size={20} style={{ color: 'var(--text-tertiary)' }} />
                ) : (
                    <ChevronDown size={20} style={{ color: 'var(--text-tertiary)' }} />
                )}
            </button>

            {/* Content */}
            {isExpanded && (
                <div
                    className="px-4 pb-3 pt-3"
                    style={{
                        borderTop: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                        backgroundColor: 'var(--bg-primary)',
                    }}
                >
                    {children}
                    {/* "Ver todos" footer link */}
                    {count > 0 && (
                        <div className="mt-3 pt-3 text-center" style={{ borderTop: `1px solid ${isDark ? '#334155' : '#e2e8f0'}` }}>
                            <button
                                className="text-sm font-medium"
                                style={{ color: 'var(--primary)' }}
                            >
                                {t('viewAll')} ({count})
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export const LearnedDataView: React.FC<LearnedDataViewProps> = ({
    t,
    theme,
    mappings = [],
    mappingsLoading = false,
    onDeleteMapping,
    onEditMapping,
    merchantMappings = [],
    merchantMappingsLoading = false,
    onDeleteMerchantMapping,
    onEditMerchantMapping,
    subcategoryMappings = [],
    subcategoryMappingsLoading = false,
    onDeleteSubcategoryMapping,
    onUpdateSubcategoryMapping,
    trustedMerchants = [],
    trustedMerchantsLoading = false,
    onRevokeTrust,
    itemNameMappings = [],
    itemNameMappingsLoading = false,
    onDeleteItemNameMapping,
    onUpdateItemNameMapping,
    onClearAllLearnedData,
}) => {
    const isDark = theme === 'dark';

    // Expansion state for each section
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        categories: false,
        merchants: false,
        itemNames: false,
        subcategories: false,
        trusted: false,
    });

    // Clear data dialog state
    const [showClearDialog, setShowClearDialog] = useState(false);
    const [isClearing, setIsClearing] = useState(false);

    const toggleSection = (section: string) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section],
        }));
    };

    // Helper to format item count description
    const formatItemCount = (count: number, type: string): string => {
        if (count === 0) return t(`${type}Empty`) || 'No items saved';
        if (count === 1) return `1 ${t('itemSaved') || 'item saved'}`;
        return `${count} ${t('itemsSaved') || 'items saved'}`;
    };

    // Handle clear all data
    const handleClearAllData = async () => {
        if (!onClearAllLearnedData) return;

        setIsClearing(true);
        try {
            await onClearAllLearnedData();
            setShowClearDialog(false);
        } catch {
            // Error silently caught — dialog stays open, isClearing resets in finally
        } finally {
            setIsClearing(false);
        }
    };

    // Icon colors per section - matching mockup exactly
    const SECTION_COLORS = {
        categories: '#22c55e',   // Green - for groups/categories
        merchants: '#8b5cf6',    // Purple - for merchants
        itemNames: '#3b82f6',    // Blue - for item names
        subcategories: '#f59e0b', // Amber - for subcategories
        trusted: '#10b981',      // Emerald/teal - for trusted merchants
    };

    return (
        <div className="space-y-3">
            {/* Learned Categories (Grupos) */}
            {onDeleteMapping && (
                <ExpandableSection
                    title={t('learnedCategories')}
                    description={formatItemCount(mappings.length, 'learnedCategories')}
                    icon={<BookOpen size={20} />}
                    iconColor={SECTION_COLORS.categories}
                    count={mappings.length}
                    isExpanded={expandedSections.categories}
                    onToggle={() => toggleSection('categories')}
                    theme={theme}
                    t={t}
                >
                    <CategoryMappingsList
                        mappings={mappings}
                        loading={mappingsLoading}
                        onDeleteMapping={onDeleteMapping}
                        onEditMapping={onEditMapping}
                        t={t}
                        theme={theme as 'light' | 'dark'}
                    />
                </ExpandableSection>
            )}

            {/* Learned Merchants (Comercios) */}
            {onDeleteMerchantMapping && onEditMerchantMapping && (
                <ExpandableSection
                    title={t('learnedMerchants')}
                    description={formatItemCount(merchantMappings.length, 'learnedMerchants')}
                    icon={<Home size={20} />}
                    iconColor={SECTION_COLORS.merchants}
                    count={merchantMappings.length}
                    isExpanded={expandedSections.merchants}
                    onToggle={() => toggleSection('merchants')}
                    theme={theme}
                    t={t}
                >
                    <MerchantMappingsList
                        mappings={merchantMappings}
                        loading={merchantMappingsLoading}
                        onDeleteMapping={onDeleteMerchantMapping}
                        onEditMapping={onEditMerchantMapping}
                        t={t}
                        theme={theme as 'light' | 'dark'}
                    />
                </ExpandableSection>
            )}

            {/* Learned Item Names (Phase 5) */}
            {onDeleteItemNameMapping && onUpdateItemNameMapping && (
                <ExpandableSection
                    title={t('learnedItemNames')}
                    description={formatItemCount(itemNameMappings.length, 'learnedItemNames')}
                    icon={<Package size={20} />}
                    iconColor={SECTION_COLORS.itemNames}
                    count={itemNameMappings.length}
                    isExpanded={expandedSections.itemNames}
                    onToggle={() => toggleSection('itemNames')}
                    theme={theme}
                    t={t}
                >
                    <ItemNameMappingsList
                        mappings={itemNameMappings}
                        loading={itemNameMappingsLoading}
                        onDeleteMapping={onDeleteItemNameMapping}
                        onEditMapping={onUpdateItemNameMapping}
                        t={t}
                        theme={theme as 'light' | 'dark'}
                    />
                </ExpandableSection>
            )}

            {/* Learned Subcategories */}
            {onDeleteSubcategoryMapping && onUpdateSubcategoryMapping && (
                <ExpandableSection
                    title={t('learnedSubcategories')}
                    description={formatItemCount(subcategoryMappings.length, 'learnedSubcategories')}
                    icon={<Tag size={20} />}
                    iconColor={SECTION_COLORS.subcategories}
                    count={subcategoryMappings.length}
                    isExpanded={expandedSections.subcategories}
                    onToggle={() => toggleSection('subcategories')}
                    theme={theme}
                    t={t}
                >
                    <SubcategoryMappingsList
                        mappings={subcategoryMappings}
                        loading={subcategoryMappingsLoading}
                        onDeleteMapping={onDeleteSubcategoryMapping}
                        onUpdateMapping={onUpdateSubcategoryMapping}
                        t={t}
                        theme={theme as 'light' | 'dark'}
                    />
                </ExpandableSection>
            )}

            {/* Trusted Merchants (Comercios de Confianza) - uses checkmark icon per mockup */}
            {onRevokeTrust && (
                <ExpandableSection
                    title={t('trustedMerchants')}
                    description={formatItemCount(trustedMerchants.length, 'trustedMerchants')}
                    icon={<CheckCircle2 size={20} />}
                    iconColor={SECTION_COLORS.trusted}
                    count={trustedMerchants.length}
                    isExpanded={expandedSections.trusted}
                    onToggle={() => toggleSection('trusted')}
                    theme={theme}
                    t={t}
                >
                    <TrustedMerchantsList
                        merchants={trustedMerchants}
                        loading={trustedMerchantsLoading}
                        onRevokeTrust={onRevokeTrust}
                        t={t}
                        theme={theme as 'light' | 'dark'}
                    />
                </ExpandableSection>
            )}

            {/* Clear All Learned Data - Destructive Action (always visible per mockup) */}
            {onClearAllLearnedData && (
                <button
                    onClick={() => setShowClearDialog(true)}
                    className="w-full py-3.5 px-4 rounded-xl border flex items-center justify-between"
                    style={{
                        backgroundColor: 'var(--bg-secondary)',
                        borderColor: isDark ? '#334155' : '#fecaca',
                    }}
                >
                    <div className="flex items-center gap-2.5">
                        {/* Trash icon with NO background - red color per mockup */}
                        <Trash2 size={20} color="#ef4444" />
                        <div className="text-left">
                            <span className="font-medium block text-sm" style={{ color: '#ef4444' }}>
                                {t('clearAllLearnedData')}
                            </span>
                            <span className="text-xs" style={{ color: '#f87171' }}>
                                {t('clearAllLearnedDataDesc')}
                            </span>
                        </div>
                    </div>
                    <ChevronRight size={20} color="#fca5a5" />
                </button>
            )}

            {/* Clear Data Confirmation Dialog */}
            <ClearDataConfirmDialog
                isOpen={showClearDialog}
                onConfirm={handleClearAllData}
                onCancel={() => setShowClearDialog(false)}
                isClearing={isClearing}
                t={t}
                theme={theme}
                categoryCount={mappings.length}
                merchantCount={merchantMappings.length}
                subcategoryCount={subcategoryMappings.length}
                trustedCount={trustedMerchants.length}
                itemNameCount={itemNameMappings.length}
            />
        </div>
    );
};

// Keep backward compatibility with old name
export const DatosAprendidosView = LearnedDataView;
