/**
 * Story 15b-2d: Header component extracted from ItemsView.tsx
 * Internal to the ItemsView directory — NOT exported from the feature barrel.
 */

import React from 'react';
import { ChevronLeft, Loader2, Download, FileText, AlertTriangle } from 'lucide-react';
import { ProfileDropdown, ProfileAvatar, getInitials } from '@/components/ProfileDropdown';
import { SearchBar } from '@features/history/components/SearchBar';
import { TemporalBreadcrumb } from '@features/history/components/TemporalBreadcrumb';
import { IconFilterBar } from '@features/history/components/IconFilterBar';
import { FilterChips } from '@features/history/components/FilterChips';
import { SortControl } from '@features/history/components/SortControl';
import { ITEM_SORT_OPTIONS } from './itemsViewConstants';

export interface ItemsViewHeaderProps {
    lang: 'en' | 'es';
    isHeaderCollapsed: boolean;
    searchTerm: string;
    onSearchChange: (term: string) => void;
    availableFilters: ReturnType<typeof import('@shared/utils/historyFilterUtils').extractAvailableFilters>;
    t: (key: string) => string;
    sortBy: string;
    sortDirection: 'asc' | 'desc';
    onSortChange: (key: string, direction: 'asc' | 'desc') => void;
    aggregatedItemsCount: number;
    duplicateItemsCount: number;
    duplicateCount: number;
    showDuplicatesOnly: boolean;
    onToggleDuplicates: () => void;
    hasAnyDuplicates: boolean;
    hasActiveFilters: boolean;
    onClearFilters: () => void;
    temporalLevel: string;
    isExporting: boolean;
    onExport: () => void;
    onBack: () => void;
    userName: string;
    userEmail: string;
    isProfileOpen: boolean;
    onToggleProfile: () => void;
    onCloseProfile: () => void;
    onProfileNavigate: (view: string) => void;
    profileButtonRef: React.RefObject<HTMLButtonElement>;
    theme: string;
}

export const ItemsViewHeader: React.FC<ItemsViewHeaderProps> = (props) => {
    const {
        lang, isHeaderCollapsed, searchTerm, onSearchChange, availableFilters, t,
        sortBy, sortDirection, onSortChange, aggregatedItemsCount, duplicateItemsCount,
        duplicateCount, showDuplicatesOnly, onToggleDuplicates, hasAnyDuplicates,
        hasActiveFilters, onClearFilters, temporalLevel, isExporting, onExport, onBack,
        userName, userEmail, isProfileOpen, onToggleProfile, onCloseProfile,
        onProfileNavigate, profileButtonRef, theme,
    } = props;

    return (
        <div
            className="sticky px-4"
            style={{ top: 0, zIndex: 50, backgroundColor: 'var(--bg)', boxShadow: isHeaderCollapsed ? '0 2px 8px rgba(0,0,0,0.08)' : 'none' }}
        >
            <div
                className="flex items-center justify-between"
                style={{ height: '72px', paddingTop: 'max(env(safe-area-inset-top, 0px), 8px)' }}
            >
                <div className="flex items-center gap-0">
                    <button
                        onClick={onBack}
                        className="min-w-10 min-h-10 flex items-center justify-center -ml-1"
                        aria-label={lang === 'es' ? 'Volver' : 'Back'}
                        data-testid="back-button"
                        style={{ color: 'var(--text-primary)' }}
                    >
                        <ChevronLeft size={28} strokeWidth={2.5} />
                    </button>
                    <h1
                        className="font-semibold"
                        style={{ fontFamily: 'var(--font-family)', color: 'var(--text-primary)', fontWeight: 700, fontSize: '20px' }}
                    >
                        {lang === 'es' ? 'Productos' : 'Items'}
                    </h1>
                </div>
                <div className="flex items-center gap-3 relative">
                    <IconFilterBar availableFilters={availableFilters} t={t} locale={lang} />
                    <ProfileAvatar ref={profileButtonRef} initials={getInitials(userName)} onClick={onToggleProfile} />
                    <ProfileDropdown
                        isOpen={isProfileOpen} onClose={onCloseProfile} userName={userName}
                        userEmail={userEmail} onNavigate={onProfileNavigate} theme={theme}
                        t={t} triggerRef={profileButtonRef}
                    />
                </div>
            </div>

            <div
                className="transition-all duration-200 ease-out"
                style={{
                    maxHeight: isHeaderCollapsed ? '0px' : '300px',
                    opacity: isHeaderCollapsed ? 0 : 1,
                    overflow: isHeaderCollapsed ? 'hidden' : 'visible',
                    pointerEvents: isHeaderCollapsed ? 'none' : 'auto',
                }}
            >
                <div className="mb-3">
                    <SearchBar
                        value={searchTerm} onChange={onSearchChange}
                        placeholder={lang === 'es' ? 'Buscar productos...' : 'Search items...'}
                    />
                </div>
                <div className="relative" style={{ zIndex: 40 }}>
                    <TemporalBreadcrumb locale={lang} availableFilters={availableFilters} />
                </div>
                <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                        {hasAnyDuplicates && (
                            <button
                                onClick={onToggleDuplicates}
                                className={`flex items-center justify-center w-6 h-6 rounded-full transition-all ${showDuplicatesOnly ? 'ring-2 ring-offset-1 ring-amber-500' : ''}`}
                                style={{ backgroundColor: 'var(--warning-bg, #fef3c7)', color: 'var(--warning-text, #d97706)' }}
                                aria-label={showDuplicatesOnly
                                    ? (lang === 'es' ? 'Mostrar todos los productos' : 'Show all items')
                                    : (lang === 'es' ? `${duplicateCount} posibles duplicados - click para filtrar` : `${duplicateCount} potential duplicates - click to filter`)}
                                title={showDuplicatesOnly
                                    ? (lang === 'es' ? 'Mostrar todos' : 'Show all')
                                    : (lang === 'es' ? `${duplicateCount} posibles duplicados` : `${duplicateCount} potential duplicates`)}
                            >
                                <AlertTriangle size={14} />
                            </button>
                        )}
                        <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                            {showDuplicatesOnly ? duplicateItemsCount : aggregatedItemsCount} {lang === 'es' ? 'productos' : 'items'}
                        </span>
                        <SortControl
                            options={ITEM_SORT_OPTIONS} currentSort={sortBy}
                            sortDirection={sortDirection} onSortChange={onSortChange} lang={lang}
                        />
                    </div>
                    {aggregatedItemsCount > 0 && !showDuplicatesOnly && temporalLevel === 'month' && (
                        <button
                            onClick={onExport} disabled={isExporting}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-colors hover:bg-[var(--bg-tertiary)] disabled:opacity-50"
                            style={{ color: 'var(--text-tertiary)', backgroundColor: 'var(--bg-secondary)' }}
                            aria-label={lang === 'es' ? 'Descargar productos' : 'Download products'}
                            title={lang === 'es' ? 'Descargar productos (CSV)' : 'Download products (CSV)'}
                        >
                            <FileText size={16} />
                            {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                        </button>
                    )}
                </div>
                <FilterChips locale={lang} t={t} />
                {(searchTerm.trim() || showDuplicatesOnly) && (
                    <div className="flex flex-wrap gap-1.5 pb-2">
                        {showDuplicatesOnly && (
                            <button
                                onClick={onToggleDuplicates}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs"
                                style={{ backgroundColor: 'var(--warning-text, #d97706)', color: 'white' }}
                            >
                                <AlertTriangle size={10} />
                                {lang === 'es' ? 'Duplicados' : 'Duplicates'}
                                <span className="text-xs">&times;</span>
                            </button>
                        )}
                        {searchTerm.trim() && (
                            <button
                                onClick={() => onSearchChange('')}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs"
                                style={{ backgroundColor: 'var(--primary)', color: 'white' }}
                            >
                                &quot;{searchTerm}&quot;
                                <span className="text-xs">&times;</span>
                            </button>
                        )}
                    </div>
                )}
                {hasActiveFilters && (
                    <div className="pb-2">
                        <button onClick={onClearFilters} className="text-xs underline" style={{ color: 'var(--text-secondary)' }}>
                            {lang === 'es' ? 'Limpiar todo' : 'Clear all'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
