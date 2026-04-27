/**
 * Story 15b-2d: Empty state component extracted from ItemsView.tsx
 *
 * Displays contextual empty state when no items match filters or no items exist.
 * Internal to the ItemsView directory — NOT exported from the feature barrel.
 */

import React from 'react';
import { Inbox, Package } from 'lucide-react';

export interface EmptyStateProps {
    hasFilters: boolean;
    lang: 'en' | 'es';
}

export const EmptyState: React.FC<EmptyStateProps> = ({ hasFilters, lang }) => {
    return (
        <div
            className="flex flex-col items-center justify-center py-16 px-4"
            role="status"
            aria-label={hasFilters
                ? (lang === 'es' ? 'No se encontraron productos' : 'No items found')
                : (lang === 'es' ? 'No hay productos' : 'No items')
            }
        >
            <div
                className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                style={{ backgroundColor: 'var(--bg-tertiary)' }}
            >
                {hasFilters ? (
                    <Inbox size={32} style={{ color: 'var(--text-tertiary)' }} />
                ) : (
                    <Package size={32} style={{ color: 'var(--text-tertiary)' }} />
                )}
            </div>
            <h3
                className="text-lg font-semibold mb-2"
                style={{ color: 'var(--text-primary)' }}
            >
                {hasFilters
                    ? (lang === 'es' ? 'No se encontraron productos' : 'No items found')
                    : (lang === 'es' ? 'Sin productos' : 'No items yet')
                }
            </h3>
            <p
                className="text-center text-sm max-w-xs"
                style={{ color: 'var(--text-secondary)' }}
            >
                {hasFilters
                    ? (lang === 'es'
                        ? 'Intenta ajustar tus filtros o busca algo diferente.'
                        : 'Try adjusting your filters or search for something different.')
                    : (lang === 'es'
                        ? 'Escanea un recibo para comenzar a registrar tus compras.'
                        : 'Scan a receipt to start tracking your purchases.')
                }
            </p>
        </div>
    );
};
