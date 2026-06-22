import type { ReactNode } from "react";

/**
 * Shared layout for atom variation spikes (Design System/Spikes/*). Decision
 * surfaces only — each shows named alternative geometric treatments for one
 * atom so a treatment can be PICKED, then folded into the production atom and
 * the spike archived. Story-only; production atoms stay at their baseline.
 */
export function Option({
  id,
  label,
  note,
  children,
}: {
  id: string;
  label: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <figure className="flex flex-col gap-gt-12 rounded-gt-2xl border-2 border-gt-line bg-gt-surface p-gt-20">
      <figcaption className="flex items-center gap-gt-8">
        <span className="grid h-6 w-6 place-items-center rounded-gt-md bg-gt-primary text-gt-sm font-extrabold text-white">
          {id}
        </span>
        <span className="text-gt-md font-extrabold text-gt-ink">{label}</span>
      </figcaption>
      <div className="flex flex-wrap items-center gap-gt-12">{children}</div>
      {note ? <p className="text-gt-sm leading-snug text-gt-ink-3">{note}</p> : null}
    </figure>
  );
}

export function SpikeGrid({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-gt-16 bg-gt-bg p-gt-24">
      <div>
        <h2 className="font-gt-display text-gt-2xl font-extrabold text-gt-primary">{title}</h2>
        <p className="text-gt-md text-gt-ink-2">{intro}</p>
      </div>
      <div className="grid grid-cols-1 gap-gt-16 md:grid-cols-2">{children}</div>
    </div>
  );
}
