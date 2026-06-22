import type { ReactNode } from "react";
import { AppSurface, type Platform } from "@design-system/organisms/AppSurface";
import { Option, SpikeGrid } from "./spikeLayout";

/**
 * Interactive variation-spike harness (DM-6: spike-first iteration is the
 * DEFAULT mode for every component tier — assets → atoms → molecules →
 * organisms → screens — each built on the decided tier below). Gustify view
 * pattern: an `option` picker (A/B/C/D + Compare) and a `platform` picker
 * (mobile/tablet/desktop) as Controls-panel radios. Picking an option renders
 * that variation inside the device frame; "Compare" shows the all-options grid.
 *
 * Exported as both `AtomSpike` (historical) and `Spike` (generic). Use `Spike`
 * for molecule/organism/screen spikes.
 */
export interface SpikeOption {
  id: string;
  label: string;
  note: string;
  render: () => ReactNode;
}

export interface SpikeArgs {
  option: string;
  platform: Platform;
}

export const PLATFORM_ARGTYPE = {
  control: "radio" as const,
  options: ["mobile", "tablet", "desktop"] as Platform[],
};

/** Build the `option` argType with friendly dropdown labels (A · Pop, …, Compare all). */
export function optionArgType(options: SpikeOption[]) {
  const labels: Record<string, string> = { compare: "Compare all" };
  for (const o of options) labels[o.id] = `${o.id} · ${o.label}`;
  return {
    control: { type: "select" as const, labels },
    options: [...options.map((o) => o.id), "compare"],
  };
}

export function AtomSpike({
  title,
  intro,
  options,
  option,
  platform,
}: {
  title: string;
  intro: string;
  options: SpikeOption[];
} & SpikeArgs) {
  if (option === "compare") {
    return (
      <SpikeGrid title={title} intro={intro}>
        {options.map((o) => (
          <Option key={o.id} id={o.id} label={o.label} note={o.note}>
            {o.render()}
          </Option>
        ))}
      </SpikeGrid>
    );
  }
  const opt = options.find((o) => o.id === option) ?? options[0];
  return (
    <div className="bg-gt-bg p-gt-32">
      <AppSurface platform={platform}>
        <div className="flex flex-col gap-gt-16 p-gt-24">
          <div className="flex items-center gap-gt-8">
            <span className="grid h-6 w-6 place-items-center rounded-gt-md bg-gt-primary text-gt-sm font-extrabold text-white">
              {opt.id}
            </span>
            <span className="text-gt-md font-extrabold text-gt-ink">{opt.label}</span>
          </div>
          <p className="text-gt-sm leading-snug text-gt-ink-3">{opt.note}</p>
          <div className="flex flex-wrap items-center gap-gt-12 pt-gt-4">{opt.render()}</div>
        </div>
      </AppSurface>
    </div>
  );
}

/** Generic alias — preferred name for molecule/organism/screen spikes. */
export const Spike = AtomSpike;
