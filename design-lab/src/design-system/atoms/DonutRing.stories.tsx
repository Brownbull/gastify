import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { DonutRing } from "./DonutRing";
import { DonutCenterLabel } from "./DonutCenterLabel";
import { getCategoryToken } from "@lib/categoryTokens";
import { SEGMENTS, TOTAL_SPEND, clpK } from "@lib/analyticsFixtures";

const meta = {
  title: "Design System/Atoms/DonutRing",
  parameters: { layout: "padded" },
  tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function Interactive({ inkBorder = false }: { inkBorder?: boolean }) {
  const [sel, setSel] = useState<string | null>(null);
  const seg = sel ? SEGMENTS.find((s) => s.id === sel) : null;
  return (
    <div className="bg-gt-bg p-gt-16">
      <DonutRing segments={SEGMENTS} selected={sel} onSelect={setSel} inkBorder={inkBorder}>
        <DonutCenterLabel
          primary={seg ? clpK(seg.value) : clpK(TOTAL_SPEND)}
          label={seg ? getCategoryToken(seg.id).label : "Total"}
          hint={seg ? `${seg.pct}%` : undefined}
        />
      </DonutRing>
      <p className="mt-gt-8 text-gt-sm font-bold text-gt-ink-3">Toca un segmento para seleccionarlo.</p>
    </div>
  );
}

export const Flat: Story = { render: () => <Interactive /> };
export const InkBorder: Story = { render: () => <Interactive inkBorder /> };
