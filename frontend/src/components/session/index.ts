/**
 * Session Components Barrel Export
 *
 * Story 14.20: Session Completion Messaging
 * Story 15b-0c: Types re-exported from @/types/session (canonical location)
 */

export {
  SessionComplete,
  selectMessage,
  getSuggestions,
  type SessionCompleteProps,
} from './SessionComplete';

// Story 15b-0c: Re-export session types from canonical location
export type { SessionContext, SessionAction, Suggestion } from '@/types/session';
