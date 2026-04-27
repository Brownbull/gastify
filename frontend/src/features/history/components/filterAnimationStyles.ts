/**
 * filterAnimationStyles — CSS string constants for IconCategoryFilter
 *
 * Story 15b-2p: Extracted from IconCategoryFilter.tsx
 * Pure string constants — no React imports, no hooks, no side effects.
 */

export const ICON_SIZE_CSS = `
  .filter-tab-icon {
    width: 22px;
    height: 22px;
  }
  .filter-tab-icon-clear {
    width: 20px;
    height: 20px;
  }
  [data-font-size="normal"] .filter-tab-icon {
    width: 26px;
    height: 26px;
  }
  [data-font-size="normal"] .filter-tab-icon-clear {
    width: 24px;
    height: 24px;
  }
`;

export const PENDING_ANIMATION_CSS = `
  @keyframes pendingShine {
    0% {
      background-position: -100% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }
  .pending-pulse {
    position: relative;
    overflow: hidden;
  }
  .pending-pulse::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.4) 25%,
      rgba(255, 255, 255, 0.6) 50%,
      rgba(255, 255, 255, 0.4) 75%,
      transparent 100%
    );
    background-size: 200% 100%;
    animation: pendingShine 2.5s ease-in-out infinite;
    pointer-events: none;
    border-radius: inherit;
  }
`;
