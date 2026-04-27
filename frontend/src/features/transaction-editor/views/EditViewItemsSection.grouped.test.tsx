/// <reference types="@testing-library/jest-dom" />
/**
 * Story TD-15b-8: EditViewItemsSection test file split (grouped view behaviors)
 *
 * Covers: Handlers, Grouping, Keyboard navigation.
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

  describe('Handlers', () => {
    // Task 2.1 — AC3
    it('handleAddItem — appends empty item and sets editingItemIndex to items.length', () => {
      const props = makeProps();
      render(<EditViewItemsSection {...props} />);

      fireEvent.click(screen.getByRole('button', { name: 'addItem' }));

      const tx = props.currentTransaction;
      expect(props.onUpdateTransaction).toHaveBeenCalledWith({
        ...tx,
        items: [...tx.items, { name: '', totalPrice: 0, qty: 1, category: 'Other', subcategory: '' }],
      });
      expect(props.onSetEditingItemIndex).toHaveBeenCalledWith(tx.items.length);
    });

    // Task 2.2 — AC4 (name field)
    it('handleUpdateItem name — calls onUpdateTransaction with updated name', () => {
      const props = makeProps();
      render(<EditViewItemsSection {...props} editingItemIndex={0} />);

      fireEvent.change(screen.getByPlaceholderText('itemName'), { target: { value: 'Banana' } });

      expect(props.onUpdateTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          items: expect.arrayContaining([expect.objectContaining({ name: 'Banana' })]),
        })
      );
    });

    // Task 2.3 — AC4 (price field uses parseStrictNumber)
    it('handleUpdateItem price — passes sanitized numeric value through parseStrictNumber prop', () => {
      const props = makeProps();
      const parseStrictNumber = vi.fn().mockReturnValue(12.5);
      render(<EditViewItemsSection {...props} editingItemIndex={0} parseStrictNumber={parseStrictNumber} />);

      fireEvent.change(screen.getByPlaceholderText('price'), { target: { value: '12.5' } });

      expect(parseStrictNumber).toHaveBeenCalledWith('12.5');
      expect(props.onUpdateTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          items: expect.arrayContaining([expect.objectContaining({ totalPrice: 12.5 })]),
        })
      );
    });

    // AC4 (category field)
    it('handleUpdateItem category — calls onUpdateTransaction with updated category', () => {
      const props = makeProps();
      render(<EditViewItemsSection {...props} editingItemIndex={0} />);

      fireEvent.change(screen.getByTestId('category-combobox'), { target: { value: 'Beverages' } });

      expect(props.onUpdateTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          items: expect.arrayContaining([expect.objectContaining({ category: 'Beverages' })]),
        })
      );
    });

    // AC4 (subcategory field — input at source line 172)
    it('handleUpdateItem subcategory — calls onUpdateTransaction with updated subcategory', () => {
      const props = makeProps();
      render(<EditViewItemsSection {...props} editingItemIndex={0} />);

      fireEvent.change(screen.getByPlaceholderText('itemSubcat'), { target: { value: 'Organic' } });

      expect(props.onUpdateTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          items: expect.arrayContaining([expect.objectContaining({ subcategory: 'Organic' })]),
        })
      );
    });

    // Task 2.4 — AC5
    // Selector note: aria-label='deleteItem' matches because t() is identity fn in tests;
    // unique in context because editingItemIndex=0 renders exactly one delete button.
    it('handleDeleteItem — removes item by index and clears editingItemIndex', () => {
      const props = makeProps();
      render(<EditViewItemsSection {...props} editingItemIndex={0} />);

      fireEvent.click(screen.getByRole('button', { name: 'deleteItem' }));

      expect(props.onUpdateTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          items: [expect.objectContaining({ name: 'Steak' })],
        })
      );
      expect(props.onSetEditingItemIndex).toHaveBeenCalledWith(null);
    });
  });

  describe('Grouping', () => {
    // Task 3.1 — AC2
    it('itemsByGroup — items with same category appear under one group header', () => {
      const tx = makeTransaction({
        items: [
          { name: 'Apple', totalPrice: 5, category: 'Produce' },
          { name: 'Banana', totalPrice: 3, category: 'Produce' },
          { name: 'Cola', totalPrice: 2, category: 'Beverages' },
        ],
      });
      const { container } = render(<EditViewItemsSection {...makeProps()} currentTransaction={tx} />);

      const groupHeaders = container.querySelectorAll('button[aria-expanded]');
      expect(groupHeaders).toHaveLength(2); // Produce + Beverages
    });

    // Task 3.2 — AC2
    it('itemsByGroup — groups sorted alphabetically; items within group sorted by price desc', () => {
      const tx = makeTransaction({
        items: [
          { name: 'Apple', totalPrice: 5, category: 'Produce' },
          { name: 'Mango', totalPrice: 10, category: 'Produce' },
          { name: 'Cola', totalPrice: 2, category: 'Beverages' },
        ],
      });
      const { container } = render(<EditViewItemsSection {...makeProps()} currentTransaction={tx} />);

      const groupHeaders = container.querySelectorAll('button[aria-expanded]');
      expect(groupHeaders[0]).toHaveTextContent('Beverages'); // B < P alphabetically
      expect(groupHeaders[1]).toHaveTextContent('Produce');

      // span[title] selects item-name display spans (title={item.name} per source line 182/241).
      // Coupled to source impl detail; if title attr moves, update selector here.
      const itemNameSpans = container.querySelectorAll('span[title]');
      expect(itemNameSpans[0]).toHaveTextContent('Cola');  // Beverages group
      expect(itemNameSpans[1]).toHaveTextContent('Mango'); // Produce: $10 first
      expect(itemNameSpans[2]).toHaveTextContent('Apple'); // then $5
    });

    // Task 3.3 — AC6
    // Default fixture has Meat + Produce groups; with identity mock getItemCategoryGroup(cat)=cat,
    // alphabetical sort puts Meat (M) first — so querySelector returns the Meat group header.
    it('toggleGroupCollapse — collapses on first click, expands on second click', () => {
      const { container } = render(<EditViewItemsSection {...makeProps()} />);

      const groupHeader = container.querySelector('button[aria-expanded]') as HTMLElement;
      expect(groupHeader).toHaveAttribute('aria-expanded', 'true');

      fireEvent.click(groupHeader);
      expect(groupHeader).toHaveAttribute('aria-expanded', 'false');

      fireEvent.click(groupHeader);
      expect(groupHeader).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('Keyboard navigation (AC2)', () => {
    // item rows are div[role="button"] — actual <button> elements are group headers,
    // the view toggle buttons, and the Add Item button.
    // container.querySelectorAll avoids ambiguity from getAllByRole + tagName filter.
    const getItemRows = (container: HTMLElement) =>
      Array.from(container.querySelectorAll<HTMLElement>('div[role="button"]'));

    it.each(['Enter', ' '])('grouped view: key %s triggers onSetEditingItemIndex', (key) => {
      const props = makeProps();
      const { container } = render(<EditViewItemsSection {...props} />);
      const rows = getItemRows(container);
      expect(rows.length).toBeGreaterThan(0); // guard: selector must return actual elements
      fireEvent.keyDown(rows[0], { key });
      // Grouped view sorts groups alphabetically: Meat (M) < Produce (P).
      // The first visible row is Steak, which has originalIndex 1 in the items array.
      expect(props.onSetEditingItemIndex).toHaveBeenCalledWith(1);
    });

    it('grouped view: unrelated key does not trigger edit', () => {
      const props = makeProps();
      const { container } = render(<EditViewItemsSection {...props} />);
      const rows = getItemRows(container);
      expect(rows.length).toBeGreaterThan(0); // guard: selector must return actual elements
      fireEvent.keyDown(rows[0], { key: 'Tab' });
      expect(props.onSetEditingItemIndex).not.toHaveBeenCalled();
    });

    it.each(['Enter', ' '])('original view: key %s triggers onSetEditingItemIndex', (key) => {
      const props = makeProps();
      const { container } = render(<EditViewItemsSection {...props} />);
      fireEvent.click(screen.getByText('Original'));
      const rows = getItemRows(container);
      expect(rows.length).toBeGreaterThan(0); // guard: selector must return actual elements
      fireEvent.keyDown(rows[0], { key });
      // Original view renders items in array order: Apple at index 0 is the first row.
      expect(props.onSetEditingItemIndex).toHaveBeenCalledWith(0);
    });
  });
});
