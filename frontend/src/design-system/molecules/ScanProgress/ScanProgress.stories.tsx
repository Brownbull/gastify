import type { Meta, StoryObj } from '@storybook/react-vite';
import { ScanProgress } from './ScanProgress';

const meta: Meta<typeof ScanProgress> = {
  title: 'Design System/Molecules/ScanProgress',
  component: ScanProgress,
  decorators: [(Story) => <div style={{ maxWidth: '360px' }}><Story /></div>],
  args: { uploadProgress: 50, stage: 'uploading', uploadLabel: 'Subida', extractionLabel: 'Extracción' },
};

export default meta;
type Story = StoryObj<typeof ScanProgress>;

export const Uploading: Story = {
  args: { uploadProgress: 45, stage: 'uploading', stageLabel: 'Subiendo imagen...' },
};

export const Extracting: Story = {
  args: { uploadProgress: 100, extractionProgress: 30, stage: 'extracting', stageLabel: 'Extrayendo datos...' },
};

export const Complete: Story = {
  args: { uploadProgress: 100, extractionProgress: 100, stage: 'complete', stageLabel: 'Listo' },
};

export const AllStates: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <ScanProgress uploadProgress={45} stage="uploading" uploadLabel="Subida" extractionLabel="Extracción" stageLabel="Subiendo imagen..." />
      <ScanProgress uploadProgress={100} extractionProgress={30} stage="extracting" uploadLabel="Subida" extractionLabel="Extracción" stageLabel="Extrayendo datos..." />
      <ScanProgress uploadProgress={100} extractionProgress={100} stage="complete" uploadLabel="Subida" extractionLabel="Extracción" stageLabel="Listo" />
    </div>
  ),
};
