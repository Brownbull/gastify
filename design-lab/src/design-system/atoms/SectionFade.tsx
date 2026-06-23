/**
 * SectionFade — a slim vertical gradient that softens the seam between a white
 * (gt-surface) band above and the gt-bg page below, replacing a hard divider
 * line. Used at the bottom of sticky search/period bands so the white control
 * area melts into the page instead of stepping abruptly.
 *
 * The gradient is an inline style on the CSS color vars (not Tailwind
 * `from-*`/`to-*`) so it renders reliably regardless of arbitrary-gradient JIT.
 */
export interface SectionFadeProps {
  /** height of the fade strip, as a Tailwind height class. Defaults to h-6. */
  heightClassName?: string;
}

export function SectionFade({ heightClassName = "h-6" }: SectionFadeProps) {
  return (
    <div
      aria-hidden="true"
      className={`shrink-0 ${heightClassName}`}
      style={{ background: "linear-gradient(to bottom, var(--color-gt-surface), var(--color-gt-bg))" }}
    />
  );
}
