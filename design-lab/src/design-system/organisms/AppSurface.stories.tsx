import type { Meta, StoryObj } from "@storybook/react-vite";
import { AppSurface } from "./AppSurface";

const Filler = () => (
  <div className="flex flex-1 flex-col gap-4 p-6">
    <div className="h-24 rounded-gt-2xl border border-gt-line bg-gt-surface shadow-gt-sm" />
    <div className="h-40 rounded-gt-2xl border border-gt-line bg-gt-surface shadow-gt-sm" />
    <div className="flex-1 rounded-gt-2xl border-2 border-dashed border-gt-line text-center text-gt-md text-gt-ink-3">
      <p className="p-6">contenido de pantalla</p>
    </div>
  </div>
);

const meta = {
  title: "Design System/Organisms/App Surface",
  component: AppSurface,
  parameters: {
    docs: {
      description: {
        component:
          "Emulated device frame for inspection — phone 390×844 (legacy mockup convention), tablet 820, desktop 1280. `chromeless` drops the frame for live-app consumers; stories stay framed. Pattern: Gustify AppSurface, gastify-themed.",
      },
    },
  },
  tags: ["autodocs"],
  args: { platform: "mobile", chromeless: false, children: <Filler /> },
  argTypes: { platform: { control: "radio", options: ["mobile", "tablet", "desktop"] } },
} satisfies Meta<typeof AppSurface>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Mobile: Story = { args: { platform: "mobile" } };
export const Tablet: Story = { args: { platform: "tablet" } };
export const Desktop: Story = { args: { platform: "desktop" } };
export const MobileChromeless: Story = {
  args: { platform: "mobile", chromeless: true },
  parameters: {
    docs: { description: { story: "Live-app mode — the browser/device IS the frame." } },
  },
};
