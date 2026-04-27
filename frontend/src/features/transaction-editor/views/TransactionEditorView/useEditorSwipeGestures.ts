/**
 * Custom hook for swipe gesture navigation in batch transaction editing.
 *
 * Story 15b-2o: Extracted from TransactionEditorViewInternal.tsx
 * Encapsulates touch start/move/end handlers, swipe offset for CSS transforms,
 * and fade-in animation key that increments on transaction changes.
 */

import { useState, useRef, useEffect, useCallback } from 'react';

export interface UseEditorSwipeGesturesProps {
  batchContext: { index: number; total: number } | null;
  onBatchPrevious?: () => void;
  onBatchNext?: () => void;
  transactionId?: string;
}

export interface UseEditorSwipeGesturesReturn {
  swipeOffset: number;
  swipeTouchStart: number | null;
  fadeInKey: number;
  handleSwipeTouchStart: (e: React.TouchEvent) => void;
  handleSwipeTouchMove: (e: React.TouchEvent) => void;
  handleSwipeTouchEnd: () => void;
}

const MIN_SWIPE_DISTANCE = 50;

export function useEditorSwipeGestures({
  batchContext,
  onBatchPrevious,
  onBatchNext,
  transactionId,
}: UseEditorSwipeGesturesProps): UseEditorSwipeGesturesReturn {
  const [swipeTouchStart, setSwipeTouchStart] = useState<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [fadeInKey, setFadeInKey] = useState(0);
  const prevTransactionIdRef = useRef<string | undefined>(transactionId);

  // Detect transaction change and trigger fade-in animation
  useEffect(() => {
    if (transactionId !== prevTransactionIdRef.current) {
      prevTransactionIdRef.current = transactionId;
      setFadeInKey(prev => prev + 1);
    }
  }, [transactionId]);

  const canSwipePrevious = batchContext && batchContext.index > 1 && onBatchPrevious;
  const canSwipeNext = batchContext && batchContext.index < batchContext.total && onBatchNext;
  const canSwipe = canSwipePrevious || canSwipeNext;

  const handleSwipeTouchStart = useCallback((e: React.TouchEvent) => {
    if (!canSwipe) return;
    setSwipeTouchStart(e.targetTouches[0].clientX);
    setSwipeOffset(0);
  }, [canSwipe]);

  const handleSwipeTouchMove = useCallback((e: React.TouchEvent) => {
    if (!canSwipe || swipeTouchStart === null) return;
    const currentX = e.targetTouches[0].clientX;
    let offset = currentX - swipeTouchStart;

    // Apply resistance at boundaries (20% movement when can't swipe that direction)
    if (offset > 0 && !canSwipePrevious) {
      offset = offset * 0.2;
    } else if (offset < 0 && !canSwipeNext) {
      offset = offset * 0.2;
    }

    setSwipeOffset(offset);
  }, [canSwipe, swipeTouchStart, canSwipePrevious, canSwipeNext]);

  const handleSwipeTouchEnd = useCallback(() => {
    if (!canSwipe || swipeTouchStart === null) {
      setSwipeTouchStart(null);
      setSwipeOffset(0);
      return;
    }

    const distance = -swipeOffset; // Negative offset = left swipe = next

    if (distance > MIN_SWIPE_DISTANCE && canSwipeNext && onBatchNext) {
      onBatchNext();
    } else if (distance < -MIN_SWIPE_DISTANCE && canSwipePrevious && onBatchPrevious) {
      onBatchPrevious();
    }

    // Reset touch state
    setSwipeTouchStart(null);
    setSwipeOffset(0);
  }, [canSwipe, swipeTouchStart, swipeOffset, canSwipeNext, canSwipePrevious, onBatchNext, onBatchPrevious]);

  return {
    swipeOffset,
    swipeTouchStart,
    fadeInKey,
    handleSwipeTouchStart,
    handleSwipeTouchMove,
    handleSwipeTouchEnd,
  };
}
