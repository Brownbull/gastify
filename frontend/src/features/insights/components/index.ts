/**
 * Insights Components Barrel Export
 *
 * Story 14.17: Intentional or Accidental Pattern
 * Story 14.33b: View Switcher & Carousel Mode
 * Story 14.33c.1: Airlock Generation & Persistence
 */

export {
  IntentionalPrompt,
  shouldShowIntentionalPrompt,
  type IntentionalPromptProps,
  type IntentionalResponse,
  type IntentionalResponseType,
} from './IntentionalPrompt';

export {
  InsightsViewSwitcher,
  type InsightsViewSwitcherProps,
  type InsightsViewMode,
} from './InsightsViewSwitcher';

export {
  InsightsCarousel,
  selectHighlightedInsights,
  type InsightsCarouselProps,
} from './InsightsCarousel';

export {
  InsightCardLarge,
  type InsightCardLargeProps,
} from './InsightCardLarge';

export {
  AirlockSequence,
  type AirlockSequenceProps,
} from './AirlockSequence';

// Story 14.33c.1: Airlock Generation & Persistence
export {
  AirlockGenerateButton,
} from './AirlockGenerateButton';

export {
  AirlockHistoryCard,
} from './AirlockHistoryCard';

export {
  AirlockHistoryList,
} from './AirlockHistoryList';

export {
  AirlockTemporalFilter,
  filterAirlocksByTemporal,
  type AirlockTemporalFilterState,
  type AirlockTemporalLevel,
} from './AirlockTemporalFilter';

// Story 14.33d: Celebration & Personal Records Display
export {
  CelebrationCard,
  type CelebrationCardProps,
  type CelebrationStat,
} from './CelebrationCard';

export {
  BadgeUnlock,
  type BadgeUnlockProps,
} from './BadgeUnlock';

export {
  CelebrationView,
  type CelebrationViewProps,
} from './CelebrationView';

// Story 10.6: Scan Complete Insight Card
export { InsightCard } from './InsightCard';
export { BuildingProfileCard } from './BuildingProfileCard';

// Story 10.7: Batch Mode Summary
export { BatchSummary } from './BatchSummary';

// Story 10a.4: Insights History
export { InsightHistoryCard } from './InsightHistoryCard';
export { InsightDetailModal } from './InsightDetailModal';
export {
  InsightsTemporalFilter,
  type InsightTemporalFilter,
  type InsightTemporalLevel,
} from './InsightsTemporalFilter';
