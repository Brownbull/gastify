import { useState } from "react";
import { ReportCard } from "@design-system/molecules/ReportCard";
import type { ReportCardDatum } from "@lib/reportFixtures";

/**
 * ProgressDots (DM-32) — the story-progress rail: a row of dots where the active
 * one widens into a pill. `role=tablist`; click a dot to jump. Ported from legacy
 * `ProgressDots`, re-skinned (dots `bg-gt-line`, active `bg-gt-primary` pill).
 */
export interface ProgressDotsProps {
  count: number;
  active: number;
  onSelect?: (i: number) => void;
  className?: string;
}

export function ProgressDots({ count, active, onSelect, className = "" }: ProgressDotsProps) {
  return (
    <div role="tablist" aria-label="Progreso" className={`flex items-center justify-center gap-gt-6 ${className}`}>
      {Array.from({ length: count }, (_, i) => {
        const on = i === active;
        return (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={on}
            aria-label={`Tarjeta ${i + 1}`}
            onClick={() => onSelect?.(i)}
            className={`h-2.5 rounded-gt-pill transition-all duration-300 ease-gt-bounce ${on ? "w-6 bg-gt-primary" : "w-2.5 bg-gt-line hover:bg-gt-ink-3"}`}
          />
        );
      })}
    </div>
  );
}

/**
 * ReportCarousel (DM-32, light) — a story stack of `ReportCard`s. Shows one card
 * at a time with `isActive` opacity/scale; prev/next + a `ProgressDots` rail jump
 * between them. Keyboard ←/→. NO timed auto-advance (deferred). Swipe is left to
 * the screen layer; here the dots + arrows drive it.
 */
export interface ReportCarouselProps {
  cards: ReportCardDatum[];
  className?: string;
}

export function ReportCarousel({ cards, className = "" }: ReportCarouselProps) {
  const [index, setIndex] = useState(0);
  const go = (i: number) => setIndex(Math.max(0, Math.min(cards.length - 1, i)));

  return (
    <div
      className={`flex flex-col items-center gap-gt-12 ${className}`}
      data-testid="report-carousel"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(index + 1);
        if (e.key === "ArrowLeft") go(index - 1);
      }}
    >
      {/* card viewport — only the current card is rendered active */}
      <div className="relative w-full">
        {cards.map((c, i) => (
          <div key={c.id} className={i === index ? "block" : "hidden"}>
            <ReportCard
              type={c.type}
              title={c.title}
              primaryValue={c.primaryValue}
              secondaryValue={c.secondaryValue}
              trend={c.trend}
              icon={c.icon}
              description={c.description}
              isActive={i === index}
            />
          </div>
        ))}
      </div>

      <ProgressDots count={cards.length} active={index} onSelect={go} />
    </div>
  );
}
