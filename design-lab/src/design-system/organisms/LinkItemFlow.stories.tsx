import type { Meta, StoryObj } from "@storybook/react-vite";
import { LinkSourcePopup, AddItemSheet } from "./LinkItemFlow";
import { sampleHistoryItems } from "@lib/transactionFixtures";

const meta: Meta = {
  title: "Design System/Organisms/LinkItemFlow",
  parameters: { layout: "centered" },
};

export default meta;
type Story = StoryObj;

// the unmatched item (Café molido has no gustifyIcon)
const unmatched = sampleHistoryItems.find((it) => !it.gustifyIcon) ?? sampleHistoryItems[0];

export const SourcePopup: Story = {
  render: () => (
    <div className="relative h-[560px] w-[360px] overflow-hidden rounded-gt-frame border-2 border-gt-line-strong bg-gt-bg">
      <LinkSourcePopup item={unmatched} onPick={() => {}} onClose={() => {}} />
    </div>
  ),
};

export const GustifySheet: Story = {
  render: () => (
    <div className="w-[360px] bg-gt-bg p-gt-16">
      <AddItemSheet item={unmatched} source="gustify" onClose={() => {}} onConfirm={() => {}} className="h-[520px]" />
    </div>
  ),
};

export const GastifySheet: Story = {
  render: () => (
    <div className="w-[360px] bg-gt-bg p-gt-16">
      <AddItemSheet item={unmatched} source="gastify" onClose={() => {}} onConfirm={() => {}} className="h-[520px]" />
    </div>
  ),
};
