import type { Meta, StoryObj } from "@storybook/react-vite";
import { SectionFade } from "./SectionFade";

/**
 * Design System/Atoms/SectionFade — the slim white→page gradient that softens
 * the seam where a sticky white (gt-surface) band meets the gt-bg page below,
 * replacing a hard divider line. Shown over a white band + a gt-bg area so the
 * fade is visible; default height is h-6, overridable via `heightClassName`.
 */
const meta = {
  title: "Design System/Atoms/SectionFade",
  parameters: { layout: "padded" },
  tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function Demo({ heightClassName }: { heightClassName?: string }) {
  return (
    <div className="w-72 overflow-hidden rounded-gt-xl border-2 border-gt-line-strong">
      <div className="bg-gt-surface px-gt-12 pb-gt-12 pt-gt-12">
        <p className="font-gt-display text-gt-sm font-extrabold text-gt-ink">Banda blanca (gt-surface)</p>
        <p className="mt-gt-4 text-gt-xs font-bold text-gt-ink-2">4 productos · $142.300</p>
      </div>
      <SectionFade heightClassName={heightClassName} />
      <div className="bg-gt-bg px-gt-12 pb-gt-24 pt-gt-12">
        <p className="text-gt-xs font-bold text-gt-ink-2">Página (gt-bg) — la banda se funde aquí, sin línea.</p>
      </div>
    </div>
  );
}

export const Default: Story = { render: () => <Demo /> };
export const Tall: Story = { render: () => <Demo heightClassName="h-12" /> };
