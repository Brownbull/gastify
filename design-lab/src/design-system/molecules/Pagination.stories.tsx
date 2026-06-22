import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Pagination } from "./Pagination";

/**
 * Design System/Molecules/Pagination — first/prev arrows · current ± neighbours ·
 * next/last arrows. Hidden at a single page.
 */
const meta: Meta<typeof Pagination> = {
  title: "Design System/Molecules/Pagination",
  component: Pagination,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof meta>;

function Demo({ pageCount, start = 1 }: { pageCount: number; start?: number }) {
  const [page, setPage] = useState(start);
  return (
    <div className="flex flex-col items-center gap-gt-12 bg-gt-bg p-gt-16">
      <Pagination page={page} pageCount={pageCount} onPage={setPage} />
      <p className="font-gt-display text-gt-sm font-bold text-gt-ink-3">Página {page} de {pageCount}</p>
    </div>
  );
}

export const Default: Story = { render: () => <Demo pageCount={3} /> };
export const Middle: Story = { render: () => <Demo pageCount={11} start={6} /> };
export const LastPage: Story = { render: () => <Demo pageCount={3} start={3} /> };
