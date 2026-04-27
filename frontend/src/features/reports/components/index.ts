/**
 * Reports Components
 *
 * Story 14.16: Weekly Report Story Format
 * Epic 14: Core Implementation
 *
 * Reports Hub with collapsible accordion sections for displaying
 * weekly, monthly, quarterly, and yearly spending summaries.
 */

// Original components (kept for potential reuse)
export { ReportCard, type ReportCardProps } from './ReportCard';
export { ReportCarousel, type ReportCarouselProps } from './ReportCarousel';

// New Reports Hub components
export { ReportSection, type ReportSectionProps } from './ReportSection';
export { ReportRow, type ReportRowProps } from './ReportRow';
export { TimeSelector, type TimeSelectorProps } from './TimeSelector';
export {
  ReportDetailOverlay,
  type ReportDetailOverlayProps,
  type ReportDetailData,
  type ReportHighlight,
} from './ReportDetailOverlay';

// Story 14.16: Grouped category display components
export { CategoryGroupCard, type CategoryGroupCardProps } from './CategoryGroupCard';
export { ItemGroupCard, type ItemGroupCardProps } from './ItemGroupCard';
export {
  SpendingDonutChart,
  type SpendingDonutChartProps,
  type DonutSegment,
} from './SpendingDonutChart';
