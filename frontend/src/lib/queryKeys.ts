/**
 * React Query Key Constants
 *
 * Story 14.29: React Query Migration
 * Epic 14: Core Implementation
 *
 * Hierarchical query keys for smart cache invalidation.
 * Pattern: [resource, ...identifiers]
 *
 * Using array factories allows:
 * - Type-safe key generation
 * - Partial invalidation (e.g., invalidate all mappings)
 * - Consistent key structure across the app
 */

export const QUERY_KEYS = {
    /**
     * Transaction queries - real-time listener (limited to 100)
     * Key: ['transactions', userId, appId]
     */
    transactions: (userId: string, appId: string) =>
        ['transactions', userId, appId] as const,

    /**
     * Story 14.27: Paginated transactions for infinite scroll
     * Key: ['transactions', 'paginated', userId, appId]
     * Used with useInfiniteQuery for loading older transactions beyond listener limit
     */
    transactionsPaginated: (userId: string, appId: string) =>
        ['transactions', 'paginated', userId, appId] as const,

    /**
     * v9.7.0: Recent scans for "Últimos Escaneados" carousel
     * Key: ['transactions', 'recentScans', userId, appId]
     * Orders by createdAt (scan timestamp) instead of date (transaction date)
     * to show recently scanned receipts regardless of their transaction date.
     */
    recentScans: (userId: string, appId: string) =>
        ['transactions', 'recentScans', userId, appId] as const,

    /**
     * Mapping queries - hierarchical for partial invalidation
     * All mappings: ['mappings', userId, appId]
     * Specific type: ['mappings', type, userId, appId]
     */
    mappings: {
        /** All mappings for a user (for bulk invalidation) */
        all: (userId: string, appId: string) =>
            ['mappings', userId, appId] as const,
        /** Category mappings */
        category: (userId: string, appId: string) =>
            ['mappings', 'category', userId, appId] as const,
        /** Merchant mappings */
        merchant: (userId: string, appId: string) =>
            ['mappings', 'merchant', userId, appId] as const,
        /** Subcategory mappings */
        subcategory: (userId: string, appId: string) =>
            ['mappings', 'subcategory', userId, appId] as const,
        /** Item name mappings (v9.7.0: per-store item name learning) */
        itemName: (userId: string, appId: string) =>
            ['mappings', 'itemName', userId, appId] as const,
    },

    /**
     * Trusted merchants queries
     * Key: ['trustedMerchants', userId, appId]
     */
    trustedMerchants: (userId: string, appId: string) =>
        ['trustedMerchants', userId, appId] as const,

    /**
     * User preferences query
     * Story 14.28: App-level preferences caching
     * Key: ['userPreferences', userId, appId]
     * Uses one-time fetch (not subscription) since preferences rarely change
     */
    userPreferences: (userId: string, appId: string) =>
        ['userPreferences', userId, appId] as const,

    /**
     * Story 14.31: Derived items from transactions
     * Key: ['items', 'derived', userId, appId]
     * Items are flattened from transactions, cached via React Query select transform.
     */
    items: (userId: string, appId: string) =>
        ['items', 'derived', userId, appId] as const,

    /**
     * Story 14.35: Localized location data
     * Not user-specific - same data for all users
     * Key: ['locations', 'countries']
     */
    locations: {
        /** All countries with translations */
        countries: () => ['locations', 'countries'] as const,
    },

    /**
     * Story 14.33c.1: Airlock Generation & Persistence
     * AI-generated spending insights
     * Key: ['airlocks', userId, appId]
     */
    airlocks: (userId: string, appId: string) =>
        ['airlocks', userId, appId] as const,
} as const;

/**
 * Type helper for extracting query key types
 */
export type QueryKeyFactory<T extends (...args: never[]) => readonly unknown[]> = ReturnType<T>;
