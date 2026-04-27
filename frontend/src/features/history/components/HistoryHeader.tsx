/**
 * HistoryHeader - Sticky header for HistoryView
 *
 * Extracted from HistoryView.tsx (Story 15b-2c) for decomposition.
 * Contains: title bar (back, title, icon filter, profile) + collapsible section
 * (search, breadcrumb, sort/export, filter chips, duplicate chip).
 */

import React from 'react';
import { ChevronLeft, FileText, BarChart2, Loader2, Download, AlertTriangle } from 'lucide-react';
import { ProfileDropdown, ProfileAvatar, getInitials } from '@/components/ProfileDropdown';
import { IconFilterBar } from './IconFilterBar';
import { TemporalBreadcrumb } from './TemporalBreadcrumb';
import { SearchBar } from './SearchBar';
import { FilterChips } from './FilterChips';
import { SortControl } from './SortControl';
import type { SortOption } from './SortControl';
import type { AvailableFilters } from '@shared/utils/historyFilterUtils';

export interface HistoryHeaderProps {
    // Header bar
    lang: 'en' | 'es';
    t: (key: string) => string;
    onBack: () => void;
    userName: string;
    userEmail: string;
    isProfileOpen: boolean;
    setIsProfileOpen: (open: boolean) => void;
    handleProfileNavigate: (view: string) => void;
    profileButtonRef: React.RefObject<HTMLButtonElement>;
    theme: string;
    availableFilters: AvailableFilters;
    // Collapsible section
    isHeaderCollapsed: boolean;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    // Sort & export
    sortBy: string;
    sortDirection: 'asc' | 'desc';
    sortOptions: SortOption[];
    handleSortChange: (key: string, direction: 'asc' | 'desc') => void;
    filteredTransactionsLength: number;
    isStatisticsExport: boolean;
    isExporting: boolean;
    handleExport: () => void;
    // Duplicate filter
    hasAnyDuplicates: boolean;
    duplicateCount: number;
    showDuplicatesOnly: boolean;
    setShowDuplicatesOnly: (show: boolean) => void;
    duplicateTransactionsLength: number;
    setCurrentPage: (page: number) => void;
}

export const HistoryHeader: React.FC<HistoryHeaderProps> = ({
    lang,
    t,
    onBack,
    userName,
    userEmail,
    isProfileOpen,
    setIsProfileOpen,
    handleProfileNavigate,
    profileButtonRef,
    theme,
    availableFilters,
    isHeaderCollapsed,
    searchQuery,
    setSearchQuery,
    sortBy,
    sortDirection,
    sortOptions,
    handleSortChange,
    filteredTransactionsLength,
    isStatisticsExport,
    isExporting,
    handleExport,
    hasAnyDuplicates,
    duplicateCount,
    showDuplicatesOnly,
    setShowDuplicatesOnly,
    duplicateTransactionsLength,
    setCurrentPage,
}) => {
    return (
        <div
            className="sticky px-4"
            style={{
                top: 0,
                zIndex: 50,
                backgroundColor: 'var(--bg)',
                boxShadow: isHeaderCollapsed ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
            }}
        >
            {/* Fixed height header row */}
            <div
                className="flex items-center justify-between"
                style={{
                    height: '72px',
                    paddingTop: 'max(env(safe-area-inset-top, 0px), 8px)',
                }}
            >
                {/* Left side: Back button + Title */}
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
                        style={{
                            fontFamily: 'var(--font-family)',
                            color: 'var(--text-primary)',
                            fontWeight: 700,
                            fontSize: '20px',
                        }}
                    >
                        {t('purchases')}
                    </h1>
                </div>
                {/* Right side: Filters + Profile */}
                <div className="flex items-center gap-3 relative">
                    <IconFilterBar
                        availableFilters={availableFilters}
                        t={t}
                        locale={lang}
                    />
                    <ProfileAvatar
                        ref={profileButtonRef}
                        initials={getInitials(userName)}
                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                    />
                    <ProfileDropdown
                        isOpen={isProfileOpen}
                        onClose={() => setIsProfileOpen(false)}
                        userName={userName}
                        userEmail={userEmail}
                        onNavigate={handleProfileNavigate}
                        theme={theme}
                        t={t}
                        triggerRef={profileButtonRef}
                    />
                </div>
            </div>

            {/* Collapsible section */}
            <div
                className="transition-all duration-200 ease-out"
                style={{
                    maxHeight: isHeaderCollapsed ? '0px' : '300px',
                    opacity: isHeaderCollapsed ? 0 : 1,
                    overflow: isHeaderCollapsed ? 'hidden' : 'visible',
                    pointerEvents: isHeaderCollapsed ? 'none' : 'auto',
                }}
            >
                {/* Search bar */}
                <div className="mb-3">
                    <SearchBar
                        value={searchQuery}
                        onChange={setSearchQuery}
                        placeholder={lang === 'es' ? 'Buscar transacciones...' : 'Search transactions...'}
                    />
                </div>

                {/* Temporal breadcrumb navigation */}
                <div className="relative" style={{ zIndex: 40 }}>
                    <TemporalBreadcrumb locale={lang} availableFilters={availableFilters} />
                </div>

                {/* Filter count with duplicate warning, sort control and download button */}
                <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                        {/* Duplicate warning icon */}
                        {hasAnyDuplicates && (
                            <button
                                onClick={() => {
                                    setShowDuplicatesOnly(!showDuplicatesOnly);
                                    setCurrentPage(1);
                                }}
                                className={`flex items-center justify-center w-6 h-6 rounded-full transition-all ${
                                    showDuplicatesOnly ? 'ring-2 ring-offset-1 ring-amber-500' : ''
                                }`}
                                style={{
                                    backgroundColor: 'var(--warning-bg, #fef3c7)',
                                    color: 'var(--warning-text, #d97706)',
                                }}
                                aria-label={
                                    showDuplicatesOnly
                                        ? (lang === 'es' ? 'Mostrar todas las compras' : 'Show all purchases')
                                        : (lang === 'es' ? `${duplicateCount} posibles duplicados - click para filtrar` : `${duplicateCount} potential duplicates - click to filter`)
                                }
                                title={
                                    showDuplicatesOnly
                                        ? (lang === 'es' ? 'Mostrar todos' : 'Show all')
                                        : (lang === 'es' ? `${duplicateCount} posibles duplicados` : `${duplicateCount} potential duplicates`)
                                }
                            >
                                <AlertTriangle size={14} />
                            </button>
                        )}
                        {/* Transaction count */}
                        <span
                            className="text-sm"
                            style={{ color: 'var(--text-tertiary)' }}
                        >
                            {showDuplicatesOnly ? duplicateTransactionsLength : filteredTransactionsLength} {lang === 'es' ? 'compras' : 'purchases'}
                        </span>
                        {/* Sort control */}
                        <SortControl
                            options={sortOptions}
                            currentSort={sortBy}
                            sortDirection={sortDirection}
                            onSortChange={handleSortChange}
                            lang={lang}
                        />
                    </div>
                    {/* Download pill */}
                    {filteredTransactionsLength > 0 && (
                        <button
                            onClick={handleExport}
                            disabled={isExporting}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-colors hover:bg-[var(--bg-tertiary)] disabled:opacity-50"
                            style={{
                                color: 'var(--text-tertiary)',
                                backgroundColor: 'var(--bg-secondary)',
                            }}
                            aria-label={isStatisticsExport
                                ? (lang === 'es' ? 'Descargar estadísticas' : 'Download statistics')
                                : (lang === 'es' ? 'Descargar transacciones' : 'Download transactions')
                            }
                            title={isStatisticsExport
                                ? (lang === 'es' ? 'Descargar estadísticas (CSV)' : 'Download statistics (CSV)')
                                : (lang === 'es' ? 'Descargar con detalle de productos (CSV)' : 'Download with product details (CSV)')
                            }
                        >
                            {isStatisticsExport ? (
                                <BarChart2 size={16} />
                            ) : (
                                <FileText size={16} />
                            )}
                            {isExporting ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                <Download size={16} />
                            )}
                        </button>
                    )}
                </div>

                {/* Filter chips for active filters */}
                <FilterChips locale={lang} t={t} />

                {/* Duplicate filter chip */}
                {showDuplicatesOnly && (
                    <div className="flex flex-wrap gap-1.5 pb-2">
                        <button
                            onClick={() => {
                                setShowDuplicatesOnly(false);
                                setCurrentPage(1);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs"
                            style={{
                                backgroundColor: 'var(--warning-text, #d97706)',
                                color: 'white',
                            }}
                        >
                            <AlertTriangle size={10} />
                            {lang === 'es' ? 'Duplicados' : 'Duplicates'}
                            <span className="text-xs">&times;</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
