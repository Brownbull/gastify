/**
 * Story 14e-9c: State Components Barrel Exports
 *
 * Phase-gated state components for the scan feature orchestrator.
 * Each component renders only for its designated phase.
 *
 * @see docs/sprint-artifacts/epic14e-feature-architecture/stories/14e-9c-state-components-tests.md
 * Review follow-up 14e-10: Added SavingState and StatementPlaceholder exports
 */

export { IdleState } from './IdleState';
export type { IdleStateProps } from './IdleState';

export { ProcessingState } from './ProcessingState';
export type { ProcessingStateProps } from './ProcessingState';

export { ReviewingState } from './ReviewingState';
export type { ReviewingStateProps } from './ReviewingState';

export { ErrorState } from './ErrorState';
export type { ErrorStateProps } from './ErrorState';

// 14e-10 review follow-up: Extracted from ScanFeature.tsx
export { SavingState } from './SavingState';
export type { SavingStateProps } from './SavingState';

export { StatementPlaceholder } from './StatementPlaceholder';
export type { StatementPlaceholderProps } from './StatementPlaceholder';
