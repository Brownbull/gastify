import * as React from 'react';
import { Search, Home, Receipt, Camera, BarChart3, User } from 'lucide-react';
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

type HistoryLayout = 'mobile' | 'tablet' | 'desktop';

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

function TransactionList() {
  return (
    <div className="flex flex-col">
      {MOCK_GROUPS.map((group) => (
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

export function HistoryShell({ layout }: HistoryShellProps) {
  const [activeTab, setActiveTab] = React.useState('all');
  const [search, setSearch] = React.useState('');
  const [sortField, setSortField] = React.useState('date');
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('desc');
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

  const noop = () => {};

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
                <FilterStrip filters={FILTERS} onToggle={noop} onClearAll={noop} className="flex-1" />
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
              <TransactionList />
              <div className="py-4">
                <Pagination currentPage={1} totalPages={5} onPageChange={noop} />
              </div>
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
        <FilterStrip filters={FILTERS} onToggle={noop} onClearAll={noop} />
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

      {/* Transaction list */}
      <div className="flex-1 overflow-y-auto">
        <TransactionList />
        <div className="px-4 py-4">
          <Pagination currentPage={1} totalPages={5} onPageChange={noop} />
        </div>
      </div>

      {/* Bottom nav */}
      <NavBottom items={NAV_ITEMS} activeItem="history" onItemChange={noop} />
    </div>
  );
}
