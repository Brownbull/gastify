/**
 * Story 16-7: Application Event Bus
 *
 * Typed mitt instance for cross-feature communication.
 * Features emit events instead of importing other feature stores directly.
 */

import mitt from 'mitt';
import type { AppEvents } from './eventTypes';

/**
 * Singleton typed event bus.
 *
 * Usage:
 * ```typescript
 * // Emit (in feature handler)
 * appEvents.emit('scan:completed', { transactionIds: ['tx-1'] });
 *
 * // Subscribe (in useEffect)
 * useEffect(() => {
 *   appEvents.on('scan:completed', handleScanComplete);
 *   return () => appEvents.off('scan:completed', handleScanComplete);
 * }, []);
 * ```
 */
export const appEvents = mitt<AppEvents>();
