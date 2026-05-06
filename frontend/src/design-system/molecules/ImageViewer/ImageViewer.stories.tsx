import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within, fn } from 'storybook/test';
import { ImageViewer } from './ImageViewer';

const PLACEHOLDER_SRC = 'https://placehold.co/400x600/e2e8f0/64748b?text=Boleta+Jumbo';

const meta: Meta<typeof ImageViewer> = {
  title: 'Design System/Molecules/ImageViewer',
  component: ImageViewer,
  decorators: [(Story) => <div style={{ maxWidth: '420px' }}><Story /></div>],
  args: {
    src: PLACEHOLDER_SRC,
    alt: 'Boleta de Jumbo',
    onRotate: fn(),
    onClose: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof ImageViewer>;

export const Default: Story = {};

export const WithoutRotate: Story = {
  args: { onRotate: undefined },
};

export const WithoutClose: Story = {
  args: { onClose: undefined },
};

export const Minimal: Story = {
  args: { onRotate: undefined, onClose: undefined },
};

export const ZoomInteraction: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const zoomInBtn = canvas.getByRole('button', { name: /acercar/i });
    const zoomOutBtn = canvas.getByRole('button', { name: /alejar/i });

    await userEvent.click(zoomInBtn);
    await expect(canvas.getByText('125%')).toBeTruthy();

    await userEvent.click(zoomInBtn);
    await expect(canvas.getByText('150%')).toBeTruthy();

    await userEvent.click(zoomOutBtn);
    await expect(canvas.getByText('125%')).toBeTruthy();
  },
};

export const ClickRotate: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const rotateBtn = canvas.getByRole('button', { name: /rotar/i });
    await userEvent.click(rotateBtn);
    await expect(args.onRotate).toHaveBeenCalledTimes(1);
  },
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '420px' }}>
      <ImageViewer src={PLACEHOLDER_SRC} alt="Boleta completa" onRotate={fn()} onClose={fn()} />
      <ImageViewer src={PLACEHOLDER_SRC} alt="Solo zoom" />
    </div>
  ),
};
