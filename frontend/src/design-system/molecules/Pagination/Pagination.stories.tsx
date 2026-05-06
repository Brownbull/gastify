import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within, fn } from 'storybook/test';
import { Pagination } from './Pagination';

function PaginationDemo({ totalPages }: { totalPages: number }) {
  const [page, setPage] = React.useState(1);
  return <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />;
}

function PaginationWithSizeDemo() {
  const [page, setPage] = React.useState(1);
  const [size, setSize] = React.useState(10);
  return (
    <Pagination
      currentPage={page}
      totalPages={20}
      onPageChange={setPage}
      pageSize={size}
      pageSizeOptions={[10, 25, 50]}
      onPageSizeChange={setSize}
    />
  );
}

const meta: Meta<typeof Pagination> = {
  title: 'Design System/Molecules/Pagination',
  component: Pagination,
  args: {
    currentPage: 1,
    totalPages: 10,
    onPageChange: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof Pagination>;

export const Default: Story = {};

export const MiddlePage: Story = {
  args: { currentPage: 5 },
};

export const LastPage: Story = {
  args: { currentPage: 10 },
};

export const FewPages: Story = {
  args: { currentPage: 2, totalPages: 3 },
};

export const ManyPages: Story = {
  args: { currentPage: 8, totalPages: 20 },
};

export const WithPageSize: Story = {
  args: {
    currentPage: 1,
    totalPages: 20,
    pageSize: 10,
    pageSizeOptions: [10, 25, 50],
    onPageSizeChange: fn(),
  },
};

export const PageChange: Story = {
  args: {
    currentPage: 3,
    totalPages: 10,
    onPageChange: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const nextBtn = canvas.getByRole('button', { name: 'Página siguiente' });
    await userEvent.click(nextBtn);
    await expect(args.onPageChange).toHaveBeenCalledWith(4);
  },
};

export const BoundaryDisabled: Story = {
  args: {
    currentPage: 1,
    totalPages: 5,
    onPageChange: fn(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const prevBtn = canvas.getByRole('button', { name: 'Página anterior' });
    await expect(prevBtn).toBeDisabled();
  },
};

export const Interactive: Story = {
  render: () => <PaginationDemo totalPages={15} />,
};

export const AllStates: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <PaginationDemo totalPages={3} />
      <PaginationDemo totalPages={10} />
      <PaginationWithSizeDemo />
    </div>
  ),
};
