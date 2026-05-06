import type { HistoryFilterState, TemporalFilterState, CategoryFilterState } from '@/types/historyFilters';
import type { AnalyticsNavigationState } from '@/types/analytics';

// =============================================================================
// History filter ↔ search params
// =============================================================================

export interface HistorySearchParams {
  tLevel?: string;
  tYear?: string;
  tQuarter?: string;
  tMonth?: string;
  tWeek?: string;
  tDay?: string;
  cLevel?: string;
  cCategory?: string;
  cGroup?: string;
  cSubcategory?: string;
  cDrillPath?: string;
  lCountry?: string;
  lCity?: string;
  lCities?: string;
  sourceView?: string;
}

export function historyFilterToSearchParams(
  filters: HistoryFilterState,
  sourceDistributionView?: 'treemap' | 'donut' | null,
): HistorySearchParams {
  const params: HistorySearchParams = {};

  // Temporal
  const { temporal } = filters;
  if (temporal.level !== 'all') params.tLevel = temporal.level;
  if (temporal.year) params.tYear = temporal.year;
  if (temporal.quarter) params.tQuarter = temporal.quarter;
  if (temporal.month) params.tMonth = temporal.month;
  if (temporal.week != null) params.tWeek = String(temporal.week);
  if (temporal.day) params.tDay = temporal.day;

  // Category
  const { category } = filters;
  if (category.level !== 'all') params.cLevel = category.level;
  if (category.category) params.cCategory = category.category;
  if (category.group) params.cGroup = category.group;
  if (category.subcategory) params.cSubcategory = category.subcategory;
  if (category.drillDownPath) {
    params.cDrillPath = JSON.stringify(category.drillDownPath);
  }

  // Location
  const { location } = filters;
  if (location.country) params.lCountry = location.country;
  if (location.city) params.lCity = location.city;
  if (location.selectedCities) params.lCities = location.selectedCities;

  // Source view for back navigation
  if (sourceDistributionView) params.sourceView = sourceDistributionView;

  return params;
}

export function searchParamsToHistoryFilter(params: HistorySearchParams): HistoryFilterState | null {
  const hasTemporal = params.tLevel || params.tYear || params.tMonth;
  const hasCategory = params.cLevel || params.cCategory || params.cGroup;
  const hasLocation = params.lCountry || params.lCity;

  if (!hasTemporal && !hasCategory && !hasLocation) return null;

  const temporal: TemporalFilterState = {
    level: (params.tLevel as TemporalFilterState['level']) ?? 'all',
    ...(params.tYear && { year: params.tYear }),
    ...(params.tQuarter && { quarter: params.tQuarter }),
    ...(params.tMonth && { month: params.tMonth }),
    ...(params.tWeek != null && { week: Number(params.tWeek) }),
    ...(params.tDay && { day: params.tDay }),
  };

  const category: CategoryFilterState = {
    level: (params.cLevel as CategoryFilterState['level']) ?? 'all',
    ...(params.cCategory && { category: params.cCategory }),
    ...(params.cGroup && { group: params.cGroup }),
    ...(params.cSubcategory && { subcategory: params.cSubcategory }),
    ...(params.cDrillPath && { drillDownPath: JSON.parse(params.cDrillPath) }),
  };

  return {
    temporal,
    category,
    location: {
      ...(params.lCountry && { country: params.lCountry }),
      ...(params.lCity && { city: params.lCity }),
      ...(params.lCities && { selectedCities: params.lCities }),
    },
  };
}

export function searchParamsToSourceView(params: HistorySearchParams): 'treemap' | 'donut' | null {
  if (params.sourceView === 'treemap' || params.sourceView === 'donut') return params.sourceView;
  return null;
}

// =============================================================================
// Analytics state ↔ search params
// =============================================================================

export interface TrendsSearchParams {
  level?: string;
  year?: string;
  quarter?: string;
  month?: string;
  week?: string;
  day?: string;
  cLevel?: string;
  category?: string;
  group?: string;
  subcategory?: string;
  chartMode?: string;
  drillMode?: string;
}

export function analyticsStateToSearchParams(
  state: AnalyticsNavigationState,
): TrendsSearchParams {
  const params: TrendsSearchParams = {};

  params.level = state.temporal.level;
  params.year = state.temporal.year;
  if (state.temporal.quarter) params.quarter = state.temporal.quarter;
  if (state.temporal.month) params.month = state.temporal.month;
  if (state.temporal.week != null) params.week = String(state.temporal.week);
  if (state.temporal.day) params.day = state.temporal.day;

  if (state.category.level !== 'all') params.cLevel = state.category.level;
  if (state.category.category) params.category = state.category.category;
  if (state.category.group) params.group = state.category.group;
  if (state.category.subcategory) params.subcategory = state.category.subcategory;

  if (state.chartMode !== 'aggregation') params.chartMode = state.chartMode;
  if (state.drillDownMode !== 'temporal') params.drillMode = state.drillDownMode;

  return params;
}

export function searchParamsToAnalyticsState(params: TrendsSearchParams): AnalyticsNavigationState | null {
  if (!params.level || !params.year) return null;

  return {
    temporal: {
      level: params.level as AnalyticsNavigationState['temporal']['level'],
      year: params.year,
      ...(params.quarter && { quarter: params.quarter }),
      ...(params.month && { month: params.month }),
      ...(params.week != null && { week: Number(params.week) }),
      ...(params.day && { day: params.day }),
    },
    category: {
      level: (params.cLevel as AnalyticsNavigationState['category']['level']) ?? 'all',
      ...(params.category && { category: params.category }),
      ...(params.group && { group: params.group }),
      ...(params.subcategory && { subcategory: params.subcategory }),
    },
    chartMode: (params.chartMode as AnalyticsNavigationState['chartMode']) ?? 'aggregation',
    drillDownMode: (params.drillMode as AnalyticsNavigationState['drillDownMode']) ?? 'temporal',
  };
}
