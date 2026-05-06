import * as React from 'react';
import { Search, Home, Receipt, Camera, BarChart3, User, Inbox } from 'lucide-react';
import { StateTabs } from '../../molecules/StateTabs';
import { SearchBar } from '../../molecules/SearchBar';
import { FilterStrip } from '../../molecules/FilterStrip';
import { SortControl } from '../../molecules/SortControl';
import { DateGroupHeader } from '../../molecules/DateGroupHeader';
import { CardTransaction } from '../../molecules/CardTransaction';
import { NavBottom } from '../../molecules/NavBottom';
import { NavSidebar } from '../../molecules/NavSidebar';
import { NavTop } from '../../molecules/NavTop';
import { Pagination } from '../../molecules/Pagination';
import { Skeleton } from '../../atoms/Skeleton';
import { ErrorFallback } from '../../molecules/ErrorFallback';

type HistoryLayout = 'mobile' | 'tablet' | 'desktop';
type HistoryState = 'default' | 'loading' | 'empty' | 'error' | 'filtered';

interface DateGroup {
  readonly date: Date;
  readonly transactions: readonly TransactionItem[];
}

interface TransactionItem {
  readonly id: string;
  readonly merchant: string;
  readonly amount: number;
  readonly category: string;
  readonly date: Date;
  readonly type: 'expense' | 'income';
}

interface HistoryShellProps {
  layout: HistoryLayout;
  state?: HistoryState;
  emptyTitle?: string;
  emptyMessage?: string;
  errorMessage?: string;
  onRetry?: () => void;
  onGoHome?: () => void;
}

const TABS = [
  { id: 'all', label: 'Todos' },
  { id: 'expense', label: 'Gastos' },
  { id: 'income', label: 'Ingresos' },
] as const;

const FILTERS = [
  { id: 'date', type: 'date' as const, label: 'Mayo 2026', active: false },
  { id: 'cat-super', type: 'category' as const, label: 'Supermercado', active: true },
  { id: 'cat-transport', type: 'category' as const, label: 'Transporte', active: false },
  { id: 'amount', type: 'amount' as const, label: '$10k – $50k', active: false },
];

const SORT_FIELDS = [
  { value: 'date', label: 'Fecha' },
  { value: 'amount', label: 'Monto' },
  { value: 'merchant', label: 'Comercio' },
] as const;

const NAV_ITEMS = [
  { id: 'home', label: 'Inicio', icon: Home },
  { id: 'history', label: 'Historial', icon: Receipt },
  { id: 'scan', label: 'Escanear', icon: Camera },
  { id: 'reports', label: 'Reportes', icon: BarChart3 },
  { id: 'profile', label: 'Perfil', icon: User },
] as const;

const MOCK_GROUPS: readonly DateGroup[] = [
  {
    date: new Date('2026-05-04'),
    transactions: [
      { id: 't1', merchant: 'Supermercado Lider', amount: 47_320, category: 'Food', date: new Date('2026-05-04'), type: 'expense' },
      { id: 't2', merchant: 'Uber', amount: 4_890, category: 'Transporte', date: new Date('2026-05-04'), type: 'expense' },
      { id: 't3', merchant: 'Transferencia recibida', amount: 1_250_000, category: 'Hogar', date: new Date('2026-05-04'), type: 'income' },
    ],
  },
  {
    date: new Date('2026-05-03'),
    transactions: [
      { id: 't4', merchant: 'Netflix', amount: 6_490, category: 'Entretenimiento', date: new Date('2026-05-03'), type: 'expense' },
      { id: 't5', merchant: 'Farmacia Ahumada', amount: 15_780, category: 'Salud', date: new Date('2026-05-03'), type: 'expense' },
      { id: 't6', merchant: 'Shell Estacion', amount: 38_000, category: 'Transporte', date: new Date('2026-05-03'), type: 'expense' },
      { id: 't7', merchant: 'Starbucks', amount: 5_200, category: 'Food', date: new Date('2026-05-03'), type: 'expense' },
    ],
  },
  {
    date: new Date('2026-04-28'),
    transactions: [
      { id: 't8', merchant: 'Falabella', amount: 89_990, category: 'Hogar', date: new Date('2026-04-28'), type: 'expense' },
      { id: 't9', merchant: 'Supermercado Lider', amount: 62_140, category: 'Food', date: new Date('2026-04-28'), type: 'expense' },
      { id: 't10', merchant: 'Freelance Design', amount: 350_000, category: 'Hogar', date: new Date('2026-04-28'), type: 'income' },
    ],
  },
];

const FILTERED_GROUPS: readonly DateGroup[] = [
  {
    date: new Date('2026-05-04'),
    transactions: [
      { id: 't1', merchant: 'Supermercado Lider', amount: 47_320, category: 'Food', date: new Date('2026-05-04'), type: 'expense' },
    ],
  },
  {
    date: new Date('2026-04-28'),
    transactions: [
      { id: 't9', merchant: 'Supermercado Lider', amount: 62_140, category: 'Food', date: new Date('2026-04-28'), type: 'expense' },
    ],
  },
];

const FILTERED_FILTERS = [
  { id: 'date', type: 'date' as const, label: 'Mayo 2026', active: false },
  { id: 'cat-super', type: 'category' as const, label: 'Supermercado', active: true },
  { id: 'cat-transport', type: 'category' as const, label: 'Transporte', active: false },
  { id: 'amount', type: 'amount' as const, label: '$10k – $50k', active: true },
];

const SKELETON_COUNT = 7;

function TransactionList({ groups }: { readonly groups: readonly DateGroup[] }) {
  return (
    <div className="flex flex-col">
      {groups.map((group) => (
        <div key={group.date.toISOString()}>
          <DateGroupHeader date={group.date} sticky />
          <div className="flex flex-col gap-2 p-4">
            {group.transactions.map((tx) => (
              <CardTransaction
                key={tx.id}
                merchant={tx.merchant}
                amount={tx.amount}
                currency="CLP"
                category={tx.category}
                date={tx.date}
                type={tx.type}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function LoadingContent() {
  return (
    <div className="flex flex-col gap-3 p-4">
      {Array.from({ length: SKELETON_COUNT }, (_, i) => (
        <Skeleton key={i} shape="list-item" />
      ))}
    </div>
  );
}

function EmptyContent({
  title = 'No transactions found',
  message = 'Try adjusting your filters or check back later.',
}: {
  readonly title?: string;
  readonly message?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-8 text-center min-h-75">
      <div
        className="flex items-center justify-center rounded-full p-4"
        style={{ backgroundColor: 'var(--surface-elevated, var(--surface))' }}
      >
        <Inbox size={40} style={{ color: 'var(--text-tertiary)' }} aria-hidden="true" />
      </div>
      <h2
        className="text-lg font-semibold"
        style={{ color: 'var(--text-primary)' }}
      >
        {title}
      </h2>
      <p
        className="text-sm max-w-xs"
        style={{ color: 'var(--text-secondary)' }}
      >
        {message}
      </p>
    </div>
  );
}

function ErrorContent({
  message = 'Could not load transactions. Please try again.',
  onRetry,
  onGoHome,
}: {
  readonly message?: string;
  readonly onRetry?: () => void;
  readonly onGoHome?: () => void;
}) {
  return (
    <div className="flex items-center justify-center min-h-75 p-4">
      <ErrorFallback
        error={message}
        onRetry={onRetry ?? (() => {})}
        onGoHome={onGoHome ?? (() => {})}
      />
    </div>
  );
}

function ContentArea({
  state,
  emptyTitle,
  emptyMessage,
  errorMessage,
  onRetry,
  onGoHome,
}: {
  readonly state: HistoryState;
  readonly emptyTitle?: string;
  readonly emptyMessage?: string;
  readonly errorMessage?: string;
  readonly onRetry?: () => void;
  readonly onGoHome?: () => void;
}) {
  switch (state) {
    case 'loading':
      return <LoadingContent />;
    case 'empty':
      return <EmptyContent title={emptyTitle} message={emptyMessage} />;
    case 'error':
      return <ErrorContent message={errorMessage} onRetry={onRetry} onGoHome={onGoHome} />;
    case 'filtered':
      return (
        <>
          <TransactionList groups={FILTERED_GROUPS} />
          <div className="px-4 py-4">
            <Pagination currentPage={1} totalPages={1} onPageChange={() => {}} />
          </div>
        </>
      );
    case 'default':
    default:
      return (
        <>
          <TransactionList groups={MOCK_GROUPS} />
          <div className="px-4 py-4">
            <Pagination currentPage={1} totalPages={5} onPageChange={() => {}} />
          </div>
        </>
      );
  }
}

export function HistoryShell({
  layout,
  state = 'default',
  emptyTitle,
  emptyMessage,
  errorMessage,
  onRetry,
  onGoHome,
}: HistoryShellProps) {
  const [activeTab, setActiveTab] = React.useState('all');
  const [search, setSearch] = React.useState('');
  const [sortField, setSortField] = React.useState('date');
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('desc');
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

  const noop = () => {};
  const activeFilters = state === 'filtered' ? FILTERED_FILTERS : FILTERS;

  if (layout === 'desktop') {
    return (
      <div className="flex h-full" style={{ backgroundColor: 'var(--background)' }}>
        <NavSidebar
          items={NAV_ITEMS}
          activeItem="history"
          onItemChange={noop}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
        />
        <div className="flex flex-col flex-1 min-w-0">
          <NavTop variant="default" onSearch={noop} />
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-3xl px-6 py-4">
              <h1
                className="text-xl font-bold mb-4"
                style={{ color: 'var(--text-primary)' }}
              >
                Historial
              </h1>
              <StateTabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
              <div className="flex items-center gap-4 mt-4">
                <FilterStrip filters={activeFilters} onToggle={noop} onClearAll={noop} className="flex-1" />
                <SearchBar value={search} onChange={setSearch} className="w-64" />
              </div>
              <div className="flex justify-end mt-3">
                <SortControl
                  field={sortField}
                  direction={sortDir}
                  fields={[...SORT_FIELDS]}
                  onSort={(f, d) => { setSortField(f); setSortDir(d); }}
                />
              </div>
              <ContentArea
                state={state}
                emptyTitle={emptyTitle}
                emptyMessage={emptyMessage}
                errorMessage={errorMessage}
                onRetry={onRetry}
                onGoHome={onGoHome}
              />
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Mobile & Tablet share the same vertical stack structure
  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--background)' }}>
      {/* Header */}
      <header
        className="flex items-center justify-between px-4 py-3"
        style={{ backgroundColor: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
      >
        <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
          Historial
        </h1>
        <button
          type="button"
          className="p-2 rounded-lg"
          style={{ color: 'var(--text-secondary)' }}
          aria-label="Buscar"
        >
          <Search size={20} aria-hidden="true" />
        </button>
      </header>

      {/* Tabs */}
      <div className="px-4 pt-3">
        <StateTabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* Filter strip */}
      <div className="px-4">
        <FilterStrip filters={activeFilters} onToggle={noop} onClearAll={noop} />
      </div>

      {/* Sort */}
      <div className="flex justify-end px-4 pb-2">
        <SortControl
          field={sortField}
          direction={sortDir}
          fields={[...SORT_FIELDS]}
          onSort={(f, d) => { setSortField(f); setSortDir(d); }}
        />
      </div>

      {/* Content area — switches by state */}
      <div className="flex-1 overflow-y-auto">
        <ContentArea
          state={state}
          emptyTitle={emptyTitle}
          emptyMessage={emptyMessage}
          errorMessage={errorMessage}
          onRetry={onRetry}
          onGoHome={onGoHome}
        />
      </div>

      {/* Bottom nav */}
      <NavBottom items={NAV_ITEMS} activeItem="history" onItemChange={noop} />
    </div>
  );
}
