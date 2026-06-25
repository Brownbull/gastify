import type { ReactNode } from "react";

/**
 * Emulated device frame for Storybook inspection — Playful Geometric grammar
 * (DM-1): cream canvas, 3px ink border, 40px bezel radius, hard offset shadow,
 * phone notch. Frame sizes follow shared/design-tokens.ts `frame` (phone
 * 390×844, tablet 820, desktop 1280).
 *
 * `chromeless` drops the frame entirely: in the real app the device/browser
 * IS the frame, so production consumers render the same children with no
 * bezel. Stories default to framed mode. Emits `data-app-surface` for smoke
 * checks. Driven from the Storybook Platform toolbar via `platformFromGlobals`.
 */
export type Platform = "mobile" | "tablet" | "desktop";

export interface AppSurfaceProps {
  platform: Platform;
  chromeless?: boolean;
  className?: string;
  children: ReactNode;
}

/** Read the toolbar Platform global in a screen story's render fn. */
export function platformFromGlobals(globals: { platform?: string } | undefined): Platform {
  const p = globals?.platform;
  return p === "tablet" || p === "desktop" ? p : "mobile";
}

// FIXED heights (not min-h): the frame is a real device, so taller screens
// scroll INSIDE it (the scaffold/screen content area is overflow-y-auto) rather
// than growing the frame off-proportion.
const frameClasses: Record<Platform, string> = {
  mobile:
    "relative mx-auto flex h-[844px] w-[390px] flex-col overflow-hidden rounded-gt-frame border-[3px] border-gt-line-strong bg-gt-bg shadow-gt-2xl",
  tablet:
    "relative mx-auto flex h-[1100px] w-full max-w-[820px] flex-col overflow-hidden rounded-gt-6xl border-[3px] border-gt-line-strong bg-gt-bg shadow-gt-2xl",
  desktop:
    "relative mx-auto flex h-[800px] w-full max-w-[1280px] flex-col overflow-hidden rounded-gt-4xl border-[3px] border-gt-line-strong bg-gt-bg shadow-gt-2xl",
};

export function AppSurface({ platform, chromeless = false, className = "", children }: AppSurfaceProps) {
  if (chromeless) {
    return (
      <div data-app-surface={platform} className={`flex min-h-dvh flex-col bg-gt-bg ${className}`}>
        {children}
      </div>
    );
  }
  return (
    <div data-app-surface={platform} className={`${frameClasses[platform]} ${className}`}>
      {platform === "mobile" ? (
        <span
          aria-hidden="true"
          className="absolute left-1/2 top-0 z-20 h-[26px] w-[148px] -translate-x-1/2 rounded-b-gt-xl bg-gt-line-strong"
        />
      ) : null}
      {children}
    </div>
  );
}
