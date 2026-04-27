/// <reference types="@testing-library/jest-dom" />
/**
 * Story TD-18-15: Qty input and unitPrice display test coverage
 *
 * Covers: AC-1 through AC-7, AC-9, AC-10
 * Tests the always-visible qty/unitPrice fields in both grouped and original views.
 * @see docs/sprint-artifacts/epic18/stories/TD-18-15-item-editor-qty-test-coverage.md
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { Language } from '@/utils/translations';
import { EditViewItemsSection } from './EditViewItemsSection';
import type { Transaction } from './editViewHelpers';

vi.mock('@/hooks/useStaggeredReveal', () => ({
  useStaggeredReveal: () => ({ visibleItems: [], isComplete: true }),
}));

vi.mock('@/components/AnimatedItem', () => ({
  AnimatedItem: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@features/transaction-editor/components/CategoryBadge', () => ({
  CategoryBadge: ({ category }: { category: string }) => (
    <span data-testid="category-badge">{category}</span>
  ),
}));

vi.mock('@features/transaction-editor/components/CategoryCombobox', () => ({
  CategoryCombobox: ({ onChange }: { onChange: (v: string) => void }) => (
    <input data-testid="category-combobox" onChange={e => onChange(e.target.value)} />
  ),
}));

vi.mock('@/components/items/ItemViewToggle', () => ({
  ItemViewToggle: ({ onViewChange }: { onViewChange: (mode: string) => void }) => (
    <div data-testid="item-view-toggle">
      <button onClick={() => onViewChange('grouped')}>Grouped</button>
      <button onClick={() => onViewChange('original')}>Original</button>
    </div>
  ),
}));

vi.mock('@/utils/categoryTranslations', () => ({
  translateItemCategoryGroup: (key: string) => key,
  getItemCategoryGroupEmoji: () => '',
}));

vi.mock('@/config/categoryColors', () => ({
  getItemCategoryGroup: (cat: string) => cat,
  getItemGroupColors: () => ({ bg: '#fff', fg: '#000' }),
}));

vi.mock('@/utils/categoryNormalizer', () => ({
  normalizeItemCategory: (cat: string) => cat,
}));

vi.mock('@/utils/sanitize', () => ({
  sanitizeInput: (v: string) => v,
  sanitizeNumericInput: (v: string) => v,
}));

// --- Factories ---

function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    merchant: 'Test Store',
    date: '2026-01-01',
    total: 15,
    category: 'Groceries',
    items: [
      { name: 'Apple', totalPrice: 5, category: 'Produce' },
      { name: 'Steak', totalPrice: 10, category: 'Meat' },
    ],
    ...overrides,
  };
}

function makeProps() {
  return {
    currentTransaction: makeTransaction(),
    editingItemIndex: null as number | null,
    onSetEditingItemIndex: vi.fn(),
    onUpdateTransaction: vi.fn(),
    language: 'es' as Language,
    theme: 'light',
    t: (key: string) => key,
    formatCurrency: (amount: number, _currency?: string) => `$${amount}`,
    parseStrictNumber: vi.fn((val: unknown) => parseFloat(String(val)) || 0),
    displayCurrency: 'CLP',
    isDark: false,
    inputStyle: {} as React.CSSProperties,
  };
}

// --- Tests ---

describe('EditViewItemsSection — qty and unitPrice', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('Grouped edit view', () => {
    // AC-1: qty input always visible when editing
    it('renders qty input when editing an item', () => {
      render(<EditViewItemsSection {...makeProps()} editingItemIndex={0} />);
      expect(screen.getByPlaceholderText('qty')).toBeInTheDocument();
    });

    // AC-2: unitPrice read-only display rendered
    it('renders unitPrice span when editing an item', () => {
      const { container } = render(<EditViewItemsSection {...makeProps()} editingItemIndex={0} />);
      const unitPriceSpan = container.querySelector('span[aria-label^="unitPrice:"]');
      expect(unitPriceSpan).not.toBeNull();
    });

    // AC-3: qty blur triggers onUpdateTransaction with updated qty
    it('qty blur triggers onUpdateTransaction with clamped value', () => {
      const props = makeProps();
      render(<EditViewItemsSection {...props} editingItemIndex={0} />);

      const qtyInput = screen.getByPlaceholderText('qty');
      fireEvent.change(qtyInput, { target: { value: '3' } });
      fireEvent.blur(qtyInput);

      expect(props.onUpdateTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ items: expect.arrayContaining([expect.objectContaining({ qty: 3 })]) })
      );
    });

    // AC-2 (TD-18-16): qty=undefined renders input with default value 1
    it('renders qty input with default value 1 when item has qty=undefined', () => {
      const tx = makeTransaction({
        items: [{ name: 'Milk', totalPrice: 3, category: 'Dairy' }],
      });
      render(<EditViewItemsSection {...makeProps()} currentTransaction={tx} editingItemIndex={0} />);

      const qtyInput = screen.getByPlaceholderText('qty') as HTMLInputElement;
      expect(qtyInput).toBeInTheDocument();
      // Asserts defaultValue (not value) — component uses uncontrolled input (defaultValue={item.qty ?? 1}).
      // If refactored to controlled, switch to .value instead.
      expect(qtyInput.defaultValue).toBe('1');
    });

    // AC-4: totalPrice with qty > 1 shows correct derived unitPrice
    it('shows correct derived unitPrice for item with qty > 1', () => {
      const tx = makeTransaction({
        items: [{ name: 'Rice', totalPrice: 9, qty: 3, category: 'Grains' }],
      });
      const { container } = render(
        <EditViewItemsSection {...makeProps()} currentTransaction={tx} editingItemIndex={0} />
      );

      const unitPriceSpan = container.querySelector('span[aria-label^="unitPrice:"]');
      // deriveItemPrices({ totalPrice: 9, qty: 3 }) → unitPrice = Math.round(9/3) = 3
      expect(unitPriceSpan).toHaveAttribute('aria-label', 'unitPrice: 3');
    });
  });

  describe('Original edit view', () => {
    // AC-5: qty input present in original view
    it('renders qty input when editing in original view', () => {
      render(<EditViewItemsSection {...makeProps()} editingItemIndex={0} />);
      fireEvent.click(screen.getByText('Original'));
      expect(screen.getByPlaceholderText('qty')).toBeInTheDocument();
    });

    // AC-6: unitPrice display present in original view
    it('renders unitPrice span when editing in original view', () => {
      const { container } = render(<EditViewItemsSection {...makeProps()} editingItemIndex={0} />);
      fireEvent.click(screen.getByText('Original'));

      const unitPriceSpan = container.querySelector('span[aria-label^="unitPrice:"]');
      expect(unitPriceSpan).not.toBeNull();
    });
  });

  describe('Add Item rerender', () => {
    // AC-7: new item shows qty and unitPrice after rerender
    it('shows qty and unitPrice fields after Add Item and rerender', () => {
      const props = makeProps();
      const { container, rerender } = render(<EditViewItemsSection {...props} />);

      fireEvent.click(screen.getByRole('button', { name: 'addItem' }));

      expect(props.onUpdateTransaction).toHaveBeenCalled();
      expect(props.onSetEditingItemIndex).toHaveBeenCalled();
      const newTx = props.onUpdateTransaction.mock.calls[0][0] as Transaction;
      const newIdx = props.onSetEditingItemIndex.mock.calls[0][0] as number;

      rerender(
        <EditViewItemsSection {...props} currentTransaction={newTx} editingItemIndex={newIdx} />
      );

      expect(screen.getByPlaceholderText('qty')).toBeInTheDocument();
      expect(container.querySelector('span[aria-label^="unitPrice:"]')).not.toBeNull();
    });
  });

  describe('View mode qty badge', () => {
    // AC-9: hide when qty=1, show when qty > 1
    it('hides qty badge when qty is 1', () => {
      const tx = makeTransaction({
        items: [{ name: 'Apple', totalPrice: 5, qty: 1, category: 'Produce' }],
      });
      render(<EditViewItemsSection {...makeProps()} currentTransaction={tx} />);

      expect(screen.queryByText(/^x\d/)).not.toBeInTheDocument();
    });

    it('shows qty badge when qty is 2', () => {
      const tx = makeTransaction({
        items: [{ name: 'Apple', totalPrice: 5, qty: 2, category: 'Produce' }],
      });
      render(<EditViewItemsSection {...makeProps()} currentTransaction={tx} />);

      expect(screen.getByText(/x2/)).toBeInTheDocument();
    });
  });

  describe('Qty validation', () => {
    // AC-10: non-numeric clamped to 1
    it('clamps non-numeric input to 1 on blur', () => {
      const props = makeProps();
      render(<EditViewItemsSection {...props} editingItemIndex={0} />);

      const qtyInput = screen.getByPlaceholderText('qty');
      fireEvent.change(qtyInput, { target: { value: 'abc' } });
      fireEvent.blur(qtyInput);

      expect(props.onUpdateTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ items: expect.arrayContaining([expect.objectContaining({ qty: 1 })]) })
      );
    });

    // AC-10: zero rejected (clamped to 1)
    it('clamps zero to 1 on blur', () => {
      const props = makeProps();
      render(<EditViewItemsSection {...props} editingItemIndex={0} />);

      const qtyInput = screen.getByPlaceholderText('qty');
      fireEvent.change(qtyInput, { target: { value: '0' } });
      fireEvent.blur(qtyInput);

      expect(props.onUpdateTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ items: expect.arrayContaining([expect.objectContaining({ qty: 1 })]) })
      );
    });
  });
});
