/**
 * Story 16-2: UI slice tests — overlay state management
 *
 * Tests overlay fields, actions, ETA ring buffer, and atomic reset.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useScanStore } from '../useScanStore';

function act(fn: () => void) {
  fn();
}

function getState() {
  return useScanStore.getState();
}

describe('scanUISlice — overlay state', () => {
  beforeEach(() => {
    act(() => getState().reset());
  });

  // =========================================================================
  // Task 1.1: Overlay state fields exist with correct initial values
  // =========================================================================

  describe('initial state', () => {
    it('has overlay fields at default values', () => {
      const s = getState();
      expect(s.overlayState).toBe('idle');
      expect(s.overlayProgress).toBe(0);
      expect(s.overlayEta).toBeNull();
      expect(s.overlayError).toBeNull();
      expect(s.processingHistory).toEqual([]);
      expect(s.processingStartedAt).toBeNull();
    });
  });

  // =========================================================================
  // Task 1.2: Overlay actions
  // =========================================================================

  describe('startOverlayUpload', () => {
    it('transitions to uploading state with reset fields', () => {
      act(() => getState().startOverlayUpload());
      const s = getState();
      expect(s.overlayState).toBe('uploading');
      expect(s.overlayProgress).toBe(0);
      expect(s.overlayError).toBeNull();
      expect(s.overlayEta).toBeNull();
    });
  });

  describe('setOverlayProgress', () => {
    it('sets progress value', () => {
      act(() => getState().startOverlayUpload());
      act(() => getState().setOverlayProgress(50));
      expect(getState().overlayProgress).toBe(50);
    });

    it('clamps progress to 0-100 range', () => {
      act(() => getState().startOverlayUpload());
      act(() => getState().setOverlayProgress(150));
      expect(getState().overlayProgress).toBe(100);
      act(() => getState().setOverlayProgress(-10));
      expect(getState().overlayProgress).toBe(0);
    });
  });

  describe('startOverlayProcessing', () => {
    it('transitions to processing with progress=100 and ETA', () => {
      act(() => getState().startOverlayUpload());
      act(() => getState().startOverlayProcessing());
      const s = getState();
      expect(s.overlayState).toBe('processing');
      expect(s.overlayProgress).toBe(100);
      expect(s.overlayEta).toBe(4); // DEFAULT_ESTIMATED_TIME
      expect(s.processingStartedAt).toBeGreaterThan(0);
    });
  });

  describe('setOverlayReady', () => {
    it('transitions to ready and records processing time', () => {
      act(() => getState().startOverlayUpload());
      // Manually set processingStartedAt to simulate timing
      useScanStore.setState({ processingStartedAt: Date.now() - 3000 });
      act(() => getState().setOverlayReady());
      const s = getState();
      expect(s.overlayState).toBe('ready');
      expect(s.overlayEta).toBeNull();
      expect(s.processingStartedAt).toBeNull();
      expect(s.processingHistory.length).toBe(1);
      expect(s.processingHistory[0]).toBeGreaterThanOrEqual(2); // ~3 seconds
    });
  });

  describe('setOverlayError', () => {
    it('transitions to error with type and message', () => {
      act(() => getState().startOverlayUpload());
      act(() => getState().setOverlayError('network', 'Connection failed'));
      const s = getState();
      expect(s.overlayState).toBe('error');
      expect(s.overlayError).toEqual({ type: 'network', message: 'Connection failed' });
      expect(s.overlayEta).toBeNull();
      expect(s.processingStartedAt).toBeNull();
    });
  });

  describe('resetOverlay', () => {
    it('resets all overlay fields to initial values', () => {
      act(() => getState().startOverlayUpload());
      act(() => getState().setOverlayProgress(75));
      act(() => getState().resetOverlay());
      const s = getState();
      expect(s.overlayState).toBe('idle');
      expect(s.overlayProgress).toBe(0);
      expect(s.overlayEta).toBeNull();
      expect(s.overlayError).toBeNull();
      expect(s.processingStartedAt).toBeNull();
    });

    it('preserves processingHistory across resets', () => {
      // Push a processing time first
      act(() => getState().pushProcessingTime(5));
      act(() => getState().resetOverlay());
      expect(getState().processingHistory).toEqual([5]);
    });
  });

  describe('retryOverlay', () => {
    it('resets to idle from error state', () => {
      act(() => getState().setOverlayError('api', 'Server error'));
      act(() => getState().retryOverlay());
      const s = getState();
      expect(s.overlayState).toBe('idle');
      expect(s.overlayProgress).toBe(0);
      expect(s.overlayError).toBeNull();
      expect(s.overlayEta).toBeNull();
    });
  });

  // =========================================================================
  // Task 4.3: ETA ring buffer — pushProcessingTime
  // =========================================================================

  describe('pushProcessingTime (ring buffer)', () => {
    it('adds processing time to history', () => {
      act(() => getState().pushProcessingTime(3));
      act(() => getState().pushProcessingTime(5));
      expect(getState().processingHistory).toEqual([3, 5]);
    });

    it('keeps only last 10 entries (MAX_HISTORY_SIZE)', () => {
      for (let i = 1; i <= 12; i++) {
        act(() => getState().pushProcessingTime(i));
      }
      const history = getState().processingHistory;
      expect(history.length).toBe(10);
      expect(history[0]).toBe(3); // items 1,2 evicted
      expect(history[9]).toBe(12);
    });

    it('ETA uses average of last 5 recent times', () => {
      // Push 7 times: [1, 2, 3, 4, 5, 6, 7]
      for (let i = 1; i <= 7; i++) {
        act(() => getState().pushProcessingTime(i));
      }
      // Start processing — ETA should be avg of last 5: (3+4+5+6+7)/5 = 5
      act(() => getState().startOverlayUpload());
      act(() => getState().startOverlayProcessing());
      expect(getState().overlayEta).toBe(5);
    });

    it('returns default 4s when no history', () => {
      act(() => getState().startOverlayUpload());
      act(() => getState().startOverlayProcessing());
      expect(getState().overlayEta).toBe(4);
    });
  });

  // =========================================================================
  // Task 4.2: Atomic reset — reset() clears phase AND overlay
  // =========================================================================

  describe('atomic reset (AC-4)', () => {
    it('reset() clears both phase and overlay state', () => {
      // Set up non-idle state
      act(() => getState().startSingle('user-1'));
      act(() => getState().startOverlayUpload());
      act(() => getState().setOverlayProgress(50));

      // Reset
      act(() => getState().reset());

      const s = getState();
      // Phase state reset
      expect(s.phase).toBe('idle');
      expect(s.mode).toBe('single');
      // images now on workflow store (Story 16-6)
      // Overlay state reset
      expect(s.overlayState).toBe('idle');
      expect(s.overlayProgress).toBe(0);
      expect(s.overlayEta).toBeNull();
      expect(s.overlayError).toBeNull();
      expect(s.processingStartedAt).toBeNull();
    });

    it('cancel() clears both phase and overlay state', () => {
      act(() => getState().startSingle('user-1'));
      act(() => getState().startOverlayUpload());

      act(() => getState().cancel());

      expect(getState().phase).toBe('idle');
      expect(getState().overlayState).toBe('idle');
      expect(getState().overlayProgress).toBe(0);
    });
  });

  // =========================================================================
  // Existing UI slice tests (skipScanCompleteModal, isRescanning)
  // =========================================================================

  describe('existing UI flags', () => {
    it('setSkipScanCompleteModal updates flag', () => {
      act(() => getState().setSkipScanCompleteModal(true));
      expect(getState().skipScanCompleteModal).toBe(true);
      act(() => getState().setSkipScanCompleteModal(false));
      expect(getState().skipScanCompleteModal).toBe(false);
    });

    it('setIsRescanning updates flag', () => {
      act(() => getState().setIsRescanning(true));
      expect(getState().isRescanning).toBe(true);
      act(() => getState().setIsRescanning(false));
      expect(getState().isRescanning).toBe(false);
    });
  });
});
