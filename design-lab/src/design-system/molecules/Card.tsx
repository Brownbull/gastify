import type { ReactNode } from "react";

/**
 * Card — Playful Geometric product surface: 2px ink border + hard offset
 * shadow. The only place a visible bordered/elevated wrapper belongs (layout-
 * only wrappers get no border). Title is extrabold.
 */
export interface CardProps {
  title?: ReactNode;
  action?: ReactNode;
  padded?: boolean;
  className?: string;
  children: ReactNode;
}

export function Card({ title, action, padded = true, className = "", children }: CardProps) {
  return (
    <section
      className={`rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface shadow-gt-md ${padded ? "p-gt-16" : ""} ${className}`}
    >
      {title || action ? (
        <header className={`flex items-center justify-between gap-gt-8 ${padded ? "mb-gt-12" : "p-gt-16 pb-gt-0"}`}>
          {title ? <h3 className="text-gt-lg font-extrabold text-gt-ink">{title}</h3> : <span />}
          {action}
        </header>
      ) : null}
      {children}
    </section>
  );
}
