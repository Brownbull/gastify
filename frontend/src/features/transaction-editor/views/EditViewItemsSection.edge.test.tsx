/// <reference types="@testing-library/jest-dom" />
/**
 * Story TD-15b-8: EditViewItemsSection test file split (edge cases & sanitization)
 *
 * Covers: Edge cases, Input sanitization, View mode.
 * @see docs/sprint-artifacts/epic15b/stories/TD-15b-8-editviewitems-test-file-split.md
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
    <input
      data-testid="category-combobox"
      onChange={e => onChange(e.target.value)}
    />
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

// Mock: getItemCategoryGroup returns the category itself as the group key
// This enables predictable alphabetical group ordering in tests
vi.mock('@/config/categoryColors', () => ({
  getItemCategoryGroup: (cat: string) => cat,
  getItemGroupColors: () => ({ bg: '#fff', fg: '#000' }),
}));

vi.mock('@/utils/categoryNormalizer', () => ({
  normalizeItemCategory: (cat: string) => cat,
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

// NOTE: makeProps() creates fresh vi.fn() instances per call, so vi.resetAllMocks()
// in beforeEach only resets mocks from the PREVIOUS test, not the current test's props.
// The parseStrictNumber implementation is re-applied each time makeProps() is called.
// NOTE: makeProps() creates fresh vi.fn() instances per call, so vi.resetAllMocks()
// in beforeEach only resets mocks from the PREVIOUS test, not the current test's props.
// The parseStrictNumber implementation is re-applied each time makeProps() is called.
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

describe('EditViewItemsSection', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('Edge cases', () => {
    // TD-15b-6 AC2: handleAddItem with empty items — editingItemIndex should be 0
    it('handleAddItem with empty items — sets editingItemIndex to 0', () => {
      const props = makeProps();
      const tx = makeTransaction({ items: [] });
      render(<EditViewItemsSection {...props} currentTransaction={tx} />);

      fireEvent.click(screen.getByRole('button', { name: 'addItem' }));

      expect(props.onSetEditingItemIndex).toHaveBeenCalledWith(0);
      expect(props.onUpdateTransaction).toHaveBeenCalledWith({
        ...tx,
        items: [{ name: '', totalPrice: 0, qty: 1, category: 'Other', subcategory: '' }],
      });
    });

    // TD-15b-6 AC3: collapsing group A must not affect group B aria-expanded state
    it('toggleGroupCollapse — collapsing group A does not affect group B', () => {
      const tx = makeTransaction({
        items: [
          { name: 'Apple', totalPrice: 5, category: 'Produce' },
          { name: 'Cola', totalPrice: 2, category: 'Beverages' },
        ],
      });
      const { container } = render(<EditViewItemsSection {...makeProps()} currentTransaction={tx} />);

      const groupHeaders = container.querySelectorAll('button[aria-expanded]');
      // Alphabetical order: Beverages (0), Produce (1)
      const groupA = groupHeaders[0] as HTMLElement;
      const groupB = groupHeaders[1] as HTMLElement;

      expect(groupA).toHaveAttribute('aria-expanded', 'true');
      expect(groupB).toHaveAttribute('aria-expanded', 'true');

      fireEvent.click(groupA);

      expect(groupA).toHaveAttribute('aria-expanded', 'false');
      expect(groupB).toHaveAttribute('aria-expanded', 'true');
    });

    // TD-15b-6 AC4: delete last item — ItemViewToggle no longer rendered after rerender with empty items
    it('handleDeleteItem on last item — ItemViewToggle absent after parent re-renders with empty items', () => {
      const props = makeProps();
      const tx = makeTransaction({ items: [{ name: 'Solo', totalPrice: 5, category: 'Other' }] });
      const { rerender } = render(
        <EditViewItemsSection {...props} currentTransaction={tx} editingItemIndex={0} />
      );

      expect(screen.getByTestId('item-view-toggle')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'deleteItem' }));

      // Simulate parent re-rendering with updated empty items
      rerender(
        <EditViewItemsSection {...props} currentTransaction={{ ...tx, items: [] }} editingItemIndex={null} />
      );
      expect(screen.queryByTestId('item-view-toggle')).not.toBeInTheDocument();
    });
  });

  describe('Input sanitization (TD-15b-7 AC1, AC2)', () => {
    // AC1: grouped view name — XSS stripped
    it('grouped view name input — strips XSS before calling handleUpdateItem', () => {
      const props = makeProps();
      render(<EditViewItemsSection {...props} editingItemIndex={0} />);

      fireEvent.change(screen.getByPlaceholderText('itemName'), {
        target: { value: '<script>alert(1)</script>Clean' },
      });

      // Direct index check: editing item 0 in default fixture
      const updatedTx = props.onUpdateTransaction.mock.calls[0][0];
      expect(updatedTx.items[0].name).toBe('Clean');
    });

    // AC1: grouped view name — maxLength 100 enforced
    it('grouped view name input — truncates to maxLength 100', () => {
      const props = makeProps();
      render(<EditViewItemsSection {...props} editingItemIndex={0} />);

      fireEvent.change(screen.getByPlaceholderText('itemName'), {
        target: { value: 'a'.repeat(105) },
      });

      const updatedTx = props.onUpdateTransaction.mock.calls[0][0];
      expect(updatedTx.items[0].name).toBe('a'.repeat(100));
    });

    // AC2: grouped view subcategory — XSS stripped
    it('grouped view subcategory input — strips XSS before calling handleUpdateItem', () => {
      const props = makeProps();
      render(<EditViewItemsSection {...props} editingItemIndex={0} />);

      fireEvent.change(screen.getByPlaceholderText('itemSubcat'), {
        target: { value: '<script>alert(1)</script>Organic' },
      });

      const updatedTx = props.onUpdateTransaction.mock.calls[0][0];
      expect(updatedTx.items[0].subcategory).toBe('Organic');
    });

    // AC2: grouped view subcategory — maxLength 50 enforced
    it('grouped view subcategory input — truncates to maxLength 50', () => {
      const props = makeProps();
      render(<EditViewItemsSection {...props} editingItemIndex={0} />);

      fireEvent.change(screen.getByPlaceholderText('itemSubcat'), {
        target: { value: 'b'.repeat(55) },
      });

      const updatedTx = props.onUpdateTransaction.mock.calls[0][0];
      expect(updatedTx.items[0].subcategory).toBe('b'.repeat(50));
    });

    // AC1: original-order view name — XSS stripped
    it('original-order view name input — strips XSS before calling handleUpdateItem', () => {
      const props = makeProps();
      render(<EditViewItemsSection {...props} editingItemIndex={0} />);

      fireEvent.click(screen.getByText('Original'));

      fireEvent.change(screen.getByPlaceholderText('itemName'), {
        target: { value: '<script>alert(1)</script>Cleaned' },
      });

      const updatedTx = props.onUpdateTransaction.mock.calls[0][0];
      expect(updatedTx.items[0].name).toBe('Cleaned');
    });

    // Finding #6: event-handler attribute injection vector
    it('grouped view name input — strips onerror attribute injection', () => {
      const props = makeProps();
      render(<EditViewItemsSection {...props} editingItemIndex={0} />);

      fireEvent.change(screen.getByPlaceholderText('itemName'), {
        target: { value: '<img onerror=alert(1)>Safe' },
      });

      const updatedTx = props.onUpdateTransaction.mock.calls[0][0];
      expect(updatedTx.items[0].name).not.toContain('onerror');
    });

    // AC2 (original-order view): no subcategory input — Task 2.2 confirmation
    it('original-order view does not render subcategory input', () => {
      render(<EditViewItemsSection {...makeProps()} editingItemIndex={0} />);

      fireEvent.click(screen.getByText('Original'));

      expect(screen.queryByPlaceholderText('itemSubcat')).not.toBeInTheDocument();
    });
  });

  describe('View mode', () => {
    // AC7
    it('renders ItemViewToggle when items.length > 0', () => {
      render(<EditViewItemsSection {...makeProps()} />);
      expect(screen.getByTestId('item-view-toggle')).toBeInTheDocument();
    });

    // AC7
    it('does not render ItemViewToggle when items.length === 0', () => {
      const props = makeProps();
      render(<EditViewItemsSection {...props} currentTransaction={makeTransaction({ items: [] })} />);
      expect(screen.queryByTestId('item-view-toggle')).not.toBeInTheDocument();
    });

    // Task 3.4
    it('renders original order view with position numbers after switching to original mode', () => {
      render(<EditViewItemsSection {...makeProps()} />);

      fireEvent.click(screen.getByText('Original'));

      // Original view shows 1-based index numbers (not present in grouped view)
      expect(screen.getByText('1.')).toBeInTheDocument();
      expect(screen.getByText('2.')).toBeInTheDocument();
    });
  });
});
