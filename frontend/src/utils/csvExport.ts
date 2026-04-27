/**
 * CSV Export Utilities
 *
 * Reusable CSV generation utilities with proper formatting for Excel-compatible output.
 * Implements RFC 4180 compliant CSV formatting with security protections.
 *
 * @module csvExport
 * @see Story 5.1: CSV Export Utilities
 */

import type { Transaction } from '../types/transaction';
import { roundTo, calcPercent } from './numberFormat';

/**
 * Column configuration for CSV generation
 * @template T - The type of data objects being exported
 */
export interface Column<T> {
  /** Key in the data object to extract value from */
  key: keyof T;
  /** Header name to display in the CSV */
  header: string;
}

/** UTF-8 BOM character for Excel compatibility */
const UTF8_BOM = '\ufeff';

/** Characters that could trigger formula injection in spreadsheets */
const FORMULA_INJECTION_CHARS = ['=', '+', '-', '@', '\t', '\r'];

/**
 * Sanitizes a string value to prevent CSV formula injection attacks.
 * Escapes leading characters that could be interpreted as formulas in Excel/Google Sheets.
 *
 * @param value - The string value to sanitize
 * @returns The sanitized string with dangerous leading characters escaped
 *
 * @example
 * sanitizeCSVValue('=SUM(A1:A10)') // Returns "'=SUM(A1:A10)"
 * sanitizeCSVValue('Normal text') // Returns "Normal text"
 */
export function sanitizeCSVValue(value: string): string {
  if (!value || value.length === 0) return value;

  const firstChar = value.charAt(0);
  if (FORMULA_INJECTION_CHARS.includes(firstChar)) {
    return `'${value}`;
  }
  return value;
}

/**
 * Escapes a value for safe inclusion in a CSV file.
 * Handles null, undefined, quotes, commas, and newlines per RFC 4180.
 *
 * @param value - Any value to be converted to a CSV-safe string
 * @returns The escaped string suitable for CSV inclusion
 *
 * @example
 * escapeCSVValue(null) // Returns ""
 * escapeCSVValue('Hello, World') // Returns '"Hello, World"'
 * escapeCSVValue('Say "Hi"') // Returns '"Say ""Hi"""'
 */
export function escapeCSVValue(value: unknown): string {
  if (value === null || value === undefined) return '';

  const str = String(value);

  // Apply formula injection sanitization first
  const sanitized = sanitizeCSVValue(str);

  // Quote if contains comma, newline, or quote (RFC 4180)
  if (sanitized.includes(',') || sanitized.includes('\n') || sanitized.includes('"')) {
    return `"${sanitized.replace(/"/g, '""')}"`;
  }

  return sanitized;
}

/**
 * Generates a CSV string from an array of data objects.
 * Output is RFC 4180 compliant with UTF-8 BOM for Excel compatibility.
 *
 * @template T - The type of data objects being exported
 * @param data - Array of data objects to convert to CSV
 * @param columns - Column configuration defining which fields to export and their headers
 * @returns CSV string with UTF-8 BOM, header row, and data rows
 *
 * @example
 * const data = [{ name: 'Alice', age: 30 }, { name: 'Bob', age: 25 }];
 * const columns = [
 *   { key: 'name', header: 'Name' },
 *   { key: 'age', header: 'Age' }
 * ];
 * generateCSV(data, columns);
 * // Returns: '\ufeffName,Age\nAlice,30\nBob,25'
 */
export function generateCSV<T>(data: T[], columns: Column<T>[]): string {
  const header = columns.map((c) => c.header).join(',');
  const rows = data.map((row) =>
    columns.map((c) => escapeCSVValue(row[c.key])).join(',')
  );

  // UTF-8 BOM for Excel compatibility
  return UTF8_BOM + [header, ...rows].join('\n');
}

/**
 * Triggers a browser file download for CSV content.
 * Creates a temporary Blob and anchor element, then cleans up after download.
 *
 * @param content - The CSV content string to download
 * @param filename - The filename for the downloaded file
 *
 * @example
 * downloadCSV('\ufeffName,Age\nAlice,30', 'boletapp-export-2025-01-01.csv');
 */
export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url); // Clean up
}

/**
 * Formats a date string to ISO 8601 format (YYYY-MM-DD).
 * If already in correct format, returns as-is.
 *
 * @param dateStr - Date string to format
 * @returns Date in YYYY-MM-DD format
 */
function formatDateForCSV(dateStr: string): string {
  // If already in YYYY-MM-DD format, return as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  // Try to parse and format
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }

  return dateStr;
}

/**
 * Generates a formatted filename for CSV exports.
 *
 * @param type - The type of export (e.g., 'transactions', 'statistics', 'basic')
 * @param date - Optional date string to include in filename
 * @returns Filename in format: boletapp-{type}-{date}.csv
 */
function generateFilename(type: string, date?: string): string {
  const dateStr = date || new Date().toISOString().split('T')[0];
  return `boletapp-${type}-${dateStr}.csv`;
}

/** Column definitions for basic data export (Settings - minimal: Date, Merchant, Total only) */
const BASIC_DATA_COLUMNS: Column<Transaction>[] = [
  { key: 'date', header: 'Date' },
  { key: 'merchant', header: 'Merchant' },
  { key: 'total', header: 'Total' },
];

/** Extended transaction row with item count for year-level export */
interface YearTransactionRow {
  date: string;
  merchant: string;
  alias: string;
  category: string;
  total: number;
  itemCount: number;
}

/** Column definitions for year-level transaction export */
const YEAR_TRANSACTION_COLUMNS: Column<YearTransactionRow>[] = [
  { key: 'date', header: 'Date' },
  { key: 'merchant', header: 'Merchant' },
  { key: 'alias', header: 'Alias' },
  { key: 'category', header: 'Category' },
  { key: 'total', header: 'Total' },
  { key: 'itemCount', header: 'Items' },
];

/** Row structure for monthly item-level export (exploded by items) */
interface MonthlyItemRow {
  transactionId: string;
  date: string;
  merchant: string;
  alias: string;
  category: string;
  transactionTotal: number;
  itemName: string;
  itemQty: number;
  itemUnitPrice: number;
  itemPrice: number;
  itemCategory: string;
  itemSubcategory: string;
}

/** Column definitions for monthly item-level export */
const MONTHLY_ITEM_COLUMNS: Column<MonthlyItemRow>[] = [
  { key: 'transactionId', header: 'Transaction ID' },
  { key: 'date', header: 'Date' },
  { key: 'merchant', header: 'Merchant' },
  { key: 'alias', header: 'Alias' },
  { key: 'category', header: 'Category' },
  { key: 'transactionTotal', header: 'Transaction Total' },
  { key: 'itemName', header: 'Item Name' },
  { key: 'itemQty', header: 'Qty' },
  { key: 'itemUnitPrice', header: 'Unit Price' },
  { key: 'itemPrice', header: 'Item Price' },
  { key: 'itemCategory', header: 'Item Category' },
  { key: 'itemSubcategory', header: 'Item Subcategory' },
];

/**
 * Downloads basic transaction data as CSV (for Settings "Download All Data").
 * Minimal export with only: Date, Merchant, Total.
 *
 * @param transactions - Array of transactions to export
 *
 * @example
 * downloadBasicData(transactions);
 * // Downloads: boletapp-basic-2025-01-01.csv with columns: Date, Merchant, Total
 */
export function downloadBasicData(transactions: Transaction[]): void {
  if (!transactions || transactions.length === 0) {
    return;
  }

  // Format dates to YYYY-MM-DD
  const formattedData = transactions.map((t) => ({
    ...t,
    date: formatDateForCSV(t.date),
  }));

  const csv = generateCSV(formattedData, BASIC_DATA_COLUMNS);
  const filename = generateFilename('basic');
  downloadCSV(csv, filename);
}

/**
 * Downloads year-level transaction data as CSV.
 * Includes transaction summary: Date, Merchant, Alias, Category, Total, Items count.
 * Each row is one transaction.
 *
 * @param transactions - Array of transactions to export
 * @param year - Year string (e.g., '2025')
 *
 * @example
 * downloadYearTransactions(transactions, '2025');
 * // Downloads: boletapp-year-2025.csv
 */
export function downloadYearTransactions(
  transactions: Transaction[],
  year: string
): void {
  if (!transactions || transactions.length === 0) {
    return;
  }

  // Transform to year transaction rows with item count
  const formattedData: YearTransactionRow[] = transactions.map((t) => ({
    date: formatDateForCSV(t.date),
    merchant: t.merchant,
    alias: t.alias || '',
    category: t.category,
    total: t.total,
    itemCount: t.items?.length || 0,
  }));

  const csv = generateCSV(formattedData, YEAR_TRANSACTION_COLUMNS);
  const filename = `boletapp-year-${year}.csv`;
  downloadCSV(csv, filename);
}

/**
 * Downloads monthly transaction data as CSV with item-level detail.
 * Each row is one item from a transaction (exploded view).
 * Transaction ID groups items belonging to the same transaction.
 *
 * @param transactions - Array of transactions to export
 * @param year - Year string (e.g., '2025')
 * @param month - Month string (e.g., '01' for January)
 *
 * @example
 * downloadMonthlyTransactions(transactions, '2025', '11');
 * // Downloads: boletapp-month-2025-11.csv with item-level rows
 */
export function downloadMonthlyTransactions(
  transactions: Transaction[],
  year: string,
  month: string
): void {
  if (!transactions || transactions.length === 0) {
    return;
  }

  // Explode transactions into item-level rows
  const itemRows: MonthlyItemRow[] = [];

  transactions.forEach((t, index) => {
    const transactionId = t.id || `T${index + 1}`;
    const baseRow = {
      transactionId,
      date: formatDateForCSV(t.date),
      merchant: t.merchant,
      alias: t.alias || '',
      category: t.category,
      transactionTotal: t.total,
    };

    if (t.items && t.items.length > 0) {
      // Add one row per item
      t.items.forEach((item) => {
        itemRows.push({
          ...baseRow,
          itemName: item.name,
          itemQty: item.qty || 1,
          itemUnitPrice: item.unitPrice ?? item.totalPrice,
          itemPrice: item.totalPrice,
          itemCategory: item.category || '',
          itemSubcategory: item.subcategory || '',
        });
      });
    } else {
      // Transaction has no items - add single row with empty item fields
      itemRows.push({
        ...baseRow,
        itemName: '',
        itemQty: 0,
        itemUnitPrice: 0,
        itemPrice: 0,
        itemCategory: '',
        itemSubcategory: '',
      });
    }
  });

  const csv = generateCSV(itemRows, MONTHLY_ITEM_COLUMNS);
  const filename = `boletapp-month-${year}-${month}.csv`;
  downloadCSV(csv, filename);
}

/** Statistics data structure for CSV export (category aggregation) */
export interface StatisticsRow {
  category: string;
  transactionCount: number;
  totalAmount: number;
  averageAmount: number;
  percentageOfTotal: number;
}

/**
 * Yearly statistics row structure for Story 5.5 (AC#9)
 * Aggregates by month and category with percentage of monthly spend
 */
export interface YearlyStatisticsRow {
  month: string;
  category: string;
  total: number;
  transactionCount: number;
  percentageOfMonthlySpend: number;
}

/** Column definitions for statistics export */
const STATISTICS_COLUMNS: Column<StatisticsRow>[] = [
  { key: 'category', header: 'Category' },
  { key: 'transactionCount', header: 'Transaction Count' },
  { key: 'totalAmount', header: 'Total Amount' },
  { key: 'averageAmount', header: 'Average Amount' },
  { key: 'percentageOfTotal', header: '% of Total' },
];

/**
 * Downloads statistics data for a specific year as CSV.
 * Aggregates transactions by category and includes counts, totals, and percentages.
 *
 * @param transactions - Array of transactions to aggregate
 * @param year - Year string (e.g., '2025')
 *
 * @example
 * downloadStatistics(transactions, '2025');
 * // Downloads: boletapp-statistics-2025.csv
 */
export function downloadStatistics(
  transactions: Transaction[],
  year: string
): void {
  if (!transactions || transactions.length === 0) {
    return;
  }

  // Aggregate by category
  const categoryMap = new Map<
    string,
    { count: number; total: number }
  >();

  transactions.forEach((t) => {
    const existing = categoryMap.get(t.category) || { count: 0, total: 0 };
    categoryMap.set(t.category, {
      count: existing.count + 1,
      total: existing.total + t.total,
    });
  });

  // Calculate grand total for percentages
  const grandTotal = transactions.reduce((sum, t) => sum + t.total, 0);

  // Build statistics rows
  const statisticsData: StatisticsRow[] = Array.from(categoryMap.entries())
    .map(([category, data]) => ({
      category,
      transactionCount: data.count,
      totalAmount: roundTo(data.total),
      averageAmount: roundTo(data.total / data.count),
      percentageOfTotal: calcPercent(data.total, grandTotal, 2),
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount); // Sort by total descending

  const csv = generateCSV(statisticsData, STATISTICS_COLUMNS);
  const filename = `boletapp-statistics-${year}.csv`;
  downloadCSV(csv, filename);
}

/** Column definitions for yearly statistics export (Story 5.5 - AC#9) */
const YEARLY_STATISTICS_COLUMNS: Column<YearlyStatisticsRow>[] = [
  { key: 'month', header: 'Month' },
  { key: 'category', header: 'Category' },
  { key: 'total', header: 'Total' },
  { key: 'transactionCount', header: 'Transaction Count' },
  { key: 'percentageOfMonthlySpend', header: '% of Monthly Spend' },
];

/**
 * Downloads yearly statistics data as CSV with monthly breakdown.
 * Aggregates transactions by month and category, sorted chronologically.
 * Includes a summary row showing yearly totals per category.
 *
 * @see Story 5.5 AC#9: Statistics CSV Content
 *
 * Columns: Month, Category, Total, Transaction Count, Percentage of Monthly Spend
 * - Data is grouped by month, then by category within each month
 * - Months are sorted chronologically (January to December)
 * - A summary row shows yearly totals per category
 *
 * @param transactions - Array of transactions to aggregate
 * @param year - Year string (e.g., '2025')
 *
 * @example
 * downloadYearlyStatistics(transactions, '2025');
 * // Downloads: boletapp-statistics-2025.csv with monthly breakdown
 */
export function downloadYearlyStatistics(
  transactions: Transaction[],
  year: string
): void {
  if (!transactions || transactions.length === 0) {
    return;
  }

  // Step 1: Filter to selected year
  const yearTransactions = transactions.filter((t) =>
    t.date.startsWith(year)
  );

  if (yearTransactions.length === 0) {
    return;
  }

  // Step 2: Group by month and category
  // Key: "YYYY-MM-Category"
  const grouped = new Map<
    string,
    { month: string; category: string; total: number; count: number }
  >();

  yearTransactions.forEach((t) => {
    const month = t.date.substring(0, 7); // YYYY-MM
    const key = `${month}-${t.category}`;
    const existing = grouped.get(key) || {
      month,
      category: t.category,
      total: 0,
      count: 0,
    };
    grouped.set(key, {
      ...existing,
      total: existing.total + t.total,
      count: existing.count + 1,
    });
  });

  // Step 3: Calculate monthly totals for percentage calculation
  const monthlyTotals = new Map<string, number>();
  yearTransactions.forEach((t) => {
    const month = t.date.substring(0, 7);
    monthlyTotals.set(month, (monthlyTotals.get(month) || 0) + t.total);
  });

  // Step 4: Build statistics rows sorted by month (chronological), then by total within month (descending)
  const statisticsData: YearlyStatisticsRow[] = Array.from(grouped.values())
    .map((data) => {
      const monthTotal = monthlyTotals.get(data.month) || 1;
      return {
        month: data.month,
        category: data.category,
        total: roundTo(data.total),
        transactionCount: data.count,
        percentageOfMonthlySpend: calcPercent(data.total, monthTotal, 2),
      };
    })
    .sort((a, b) => {
      // Primary sort: by month (chronological)
      const monthCompare = a.month.localeCompare(b.month);
      if (monthCompare !== 0) return monthCompare;
      // Secondary sort: by total within month (descending)
      return b.total - a.total;
    });

  // Step 5: Add summary rows - yearly totals per category
  // Calculate yearly totals per category
  const yearlyByCategory = new Map<
    string,
    { total: number; count: number }
  >();
  yearTransactions.forEach((t) => {
    const existing = yearlyByCategory.get(t.category) || {
      total: 0,
      count: 0,
    };
    yearlyByCategory.set(t.category, {
      total: existing.total + t.total,
      count: existing.count + 1,
    });
  });

  const yearTotal = yearTransactions.reduce((sum, t) => sum + t.total, 0);

  // Add summary rows with "YEARLY" as month identifier
  const summaryRows: YearlyStatisticsRow[] = Array.from(
    yearlyByCategory.entries()
  )
    .map(([category, data]) => ({
      month: 'YEARLY TOTAL',
      category,
      total: roundTo(data.total),
      transactionCount: data.count,
      percentageOfMonthlySpend: calcPercent(data.total, yearTotal, 2),
    }))
    .sort((a, b) => b.total - a.total); // Sort summary by total descending

  // Combine monthly data with summary
  const allRows = [...statisticsData, ...summaryRows];

  const csv = generateCSV(allRows, YEARLY_STATISTICS_COLUMNS);
  const filename = `boletapp-statistics-${year}.csv`;
  downloadCSV(csv, filename);
}

// ============================================================================
// Story 14.31: Items Export (Aggregated)
// ============================================================================

import type { AggregatedItem } from '../types/item';
import type { Language } from './translations';
import { translateItemGroup, translateSubcategory } from './categoryTranslations';

/** Row structure for aggregated items export */
interface AggregatedItemExportRow {
  itemName: string;
  totalAmount: number;
  category: string;
  subcategory: string;
  transactionCount: number;
}

/** Column definitions for aggregated items export (English) */
const AGGREGATED_ITEM_COLUMNS_EN: Column<AggregatedItemExportRow>[] = [
  { key: 'itemName', header: 'Product' },
  { key: 'totalAmount', header: 'Price' },
  { key: 'category', header: 'Category' },
  { key: 'subcategory', header: 'Subcategory' },
  { key: 'transactionCount', header: 'Transactions' },
];

/** Column definitions for aggregated items export (Spanish) */
const AGGREGATED_ITEM_COLUMNS_ES: Column<AggregatedItemExportRow>[] = [
  { key: 'itemName', header: 'Producto' },
  { key: 'totalAmount', header: 'Precio' },
  { key: 'category', header: 'Categoría' },
  { key: 'subcategory', header: 'Subcategoría' },
  { key: 'transactionCount', header: 'Transacciones' },
];

/**
 * Downloads aggregated items data as CSV.
 * Story 14.31: Items History View - Aggregated export
 *
 * Exports one row per unique product with:
 * - Product name
 * - Total price (sum across all transactions in period)
 * - Category (translated based on language)
 * - Subcategory (translated based on language)
 * - Transaction count
 *
 * @param items - Array of aggregated items to export
 * @param lang - Language for column headers and category names
 * @param monthLabel - Optional month label for filename (e.g., '2026-01')
 *
 * @example
 * downloadAggregatedItemsCSV(aggregatedItems, 'es', '2026-01');
 * // Downloads: boletapp-productos-2026-01.csv
 */
export function downloadAggregatedItemsCSV(
  items: AggregatedItem[],
  lang: Language = 'en',
  monthLabel?: string
): void {
  if (!items || items.length === 0) {
    return;
  }

  // Transform aggregated items to export row format with translated categories
  const exportData: AggregatedItemExportRow[] = items.map((item) => ({
    itemName: item.displayName,
    totalAmount: roundTo(item.totalAmount),
    category: item.category ? translateItemGroup(item.category, lang) : '',
    subcategory: item.subcategory ? translateSubcategory(item.subcategory, lang) : '',
    transactionCount: item.transactionCount,
  }));

  // Use localized column headers
  const columns = lang === 'es' ? AGGREGATED_ITEM_COLUMNS_ES : AGGREGATED_ITEM_COLUMNS_EN;

  const csv = generateCSV(exportData, columns);
  const fileLabel = lang === 'es' ? 'productos' : 'products';
  const dateSuffix = monthLabel || new Date().toISOString().slice(0, 7);
  const filename = `boletapp-${fileLabel}-${dateSuffix}.csv`;
  downloadCSV(csv, filename);
}
