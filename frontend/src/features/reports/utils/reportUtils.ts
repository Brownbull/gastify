/**
 * Report Generation Utilities
 *
 * Re-exports from domain-specific modules.
 * Maintains backward compatibility for all consumers.
 *
 * Dependency chain (one-directional):
 *   reportDateUtils         (leaf — date/period utilities)
 *   reportCategoryGrouping  (category breakdown + grouping)
 *   reportGeneration        (core summaries + report cards)
 *   reportInsights          (internal — only consumed by reportYearGeneration)
 *   reportYearGeneration    (year-based generation)
 */
export * from './reportDateUtils';
export * from './reportCategoryGrouping';
export * from './reportGeneration';
export * from './reportYearGeneration';
