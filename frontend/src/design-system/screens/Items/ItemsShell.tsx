import * as React from 'react';
import { Home, Receipt, Camera, BarChart3, User, Sliders } from 'lucide-react';
import { Chip } from '../../atoms/Chip';
import { SearchBar } from '../../molecules/SearchBar';
import { NavBottom } from '../../molecules/NavBottom';
import { NavSidebar } from '../../molecules/NavSidebar';
import { NavTop } from '../../molecules/NavTop';

type ItemsLayout = 'mobile' | 'tablet' | 'desktop';

interface ItemsShellProps {
  layout: ItemsLayout;
}

interface MockItem {
  readonly id: string;
  readonly name: string;
  readonly count: number;
  readonly avgPrice: string;
}

const MOCK_ITEMS: readonly MockItem[] = [
  { id: '1', name: 'Leche', count: 23, avgPrice: '$1.290' },
  { id: '2', name: 'Pan', count: 45, avgPrice: '$890' },
  { id: '3', name: 'Huevos', count: 12, avgPrice: '$3.490' },
  { id: '4', name: 'Arroz', count: 8, avgPrice: '$1.590' },
  { id: '5', name: 'Aceite', count: 6, avgPrice: '$4.290' },
  { id: '6', name: 'Coffee', count: 15, avgPrice: '$5.990' },
  { id: '7', name: 'Detergente', count: 4, avgPrice: '$6.790' },
  { id: '8', name: 'Toilet Paper', count: 3, avgPrice: '$4.890' },
];

const FILTER_TABS = [
  { id: 'all', label: 'Todos' },
  { id: 'frequent', label: 'Frecuentes' },
  { id: 'recent', label: 'Recientes' },
] as const;

const NAV_ITEMS = [
  { id: 'home', label: 'Inicio', icon: Home },
  { id: 'expenses', label: 'Gastos', icon: Receipt },
  { id: 'scan', label: 'Escanear', icon: Camera },
  { id: 'reports', label: 'Reportes', icon: BarChart3 },
  { id: 'profile', label: 'Perfil', icon: User },
] as const;

const SIDEBAR_ITEMS = [
  { id: 'home', label: 'Inicio', icon: Home },
  { id: 'expenses', label: 'Gastos', icon: Receipt },
  { id: 'scan', label: 'Escanear', icon: Camera },
  { id: 'reports', label: 'Reportes', icon: BarChart3 },
  { id: 'items', label: 'Items', icon: Sliders },
] as const;

const GRID_COLS: Record<ItemsLayout, string> = {
  mobile: 'grid-cols-2',
  tablet: 'grid-cols-3',
  desktop: 'grid-cols-4',
};

function ItemCard({ item }: { readonly item: MockItem }) {
  return (
    <div className="flex flex-col gap-1 p-4 rounded-xl cursor-pointer hover:opacity-90"
      style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
        {item.name}
      </p>
      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{item.count} compras</p>
      <p className="text-xs font-medium" style={{ color: 'var(--primary)' }}>
        {item.avgPrice} promedio
      </p>
    </div>
  );
}

function FilterBar({ active, onChange }: { readonly active: string; readonly onChange: (id: string) => void }) {
  return (
    <div className="flex gap-2 overflow-x-auto py-1 scrollbar-hide">
      {FILTER_TABS.map((tab) => (
        <Chip key={tab.id} label={tab.label}
          variant={active === tab.id ? 'selected' : 'default'}
          onClick={() => onChange(tab.id)} />
      ))}
    </div>
  );
}

function ItemsGrid({ layout }: { readonly layout: ItemsLayout }) {
  return (
    <div className={`grid ${GRID_COLS[layout]} gap-3`}>
      {MOCK_ITEMS.map((item) => <ItemCard key={item.id} item={item} />)}
    </div>
  );
}

/** Shared content area used by mobile, tablet, and the main panel of desktop. */
function ItemsContent({ layout, px }: { readonly layout: ItemsLayout; readonly px: string }) {
  const [search, setSearch] = React.useState('');
  const [activeFilter, setActiveFilter] = React.useState('all');

  return (
    <div className={`flex-1 overflow-y-auto ${px}`}>
      <div className="py-3">
        <SearchBar value={search} onChange={setSearch} placeholder="Search items..." />
      </div>
      <div className="pb-3">
        <FilterBar active={activeFilter} onChange={setActiveFilter} />
      </div>
      <ItemsGrid layout={layout} />
      <div className="h-4" />
    </div>
  );
}

function CompactItems({ layout }: { readonly layout: 'mobile' | 'tablet' }) {
  const px = layout === 'tablet' ? 'px-6' : 'px-4';
  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--background)' }}>
      <header className={`${px} py-3`}
        style={{ backgroundColor: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Items</h1>
      </header>
      <ItemsContent layout={layout} px={px} />
      <NavBottom items={NAV_ITEMS} activeItem="expenses" onItemChange={() => {}} />
    </div>
  );
}

function DesktopItems() {
  const [search, setSearch] = React.useState('');
  const [activeFilter, setActiveFilter] = React.useState('all');

  return (
    <div className="flex h-full" style={{ backgroundColor: 'var(--background)' }}>
      <NavSidebar items={SIDEBAR_ITEMS} activeItem="items"
        onItemChange={() => {}} collapsed={false} onToggleCollapse={() => {}} />
      <div className="flex-1 flex flex-col min-w-0">
        <NavTop />
        <div className="flex-1 flex min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h1 className="text-xl font-bold shrink-0" style={{ color: 'var(--text-primary)' }}>
                Items
              </h1>
              <SearchBar value={search} onChange={setSearch}
                placeholder="Search items..." className="max-w-sm" />
            </div>
            <div className="mb-4">
              <FilterBar active={activeFilter} onChange={setActiveFilter} />
            </div>
            <ItemsGrid layout="desktop" />
          </div>
          <div className="w-80 shrink-0 flex items-center justify-center"
            style={{ backgroundColor: 'var(--surface)', borderLeft: '1px solid var(--border)' }}>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
              Select an item
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ItemsShell({ layout }: ItemsShellProps) {
  if (layout === 'desktop') return <DesktopItems />;
  return <CompactItems layout={layout} />;
}
