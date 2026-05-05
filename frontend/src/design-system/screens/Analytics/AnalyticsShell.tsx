import * as React from 'react';
import { Home, Receipt, BarChart3, Settings, Tag, TrendingUp } from 'lucide-react';
import { TimeSelector } from '../../molecules/TimeSelector';
import { StateTabs } from '../../molecules/StateTabs';
import { CardStat } from '../../molecules/CardStat';
import { CategoryBadge } from '../../molecules/CategoryBadge';
import { NavBottom } from '../../molecules/NavBottom';
import { NavSidebar } from '../../molecules/NavSidebar';
import { NavTop } from '../../molecules/NavTop';
import { Progress } from '../../atoms/Progress';
import { Skeleton } from '../../atoms/Skeleton';
import { ErrorFallback } from '../../molecules/ErrorFallback';

type AnalyticsLayout = 'mobile' | 'tablet' | 'desktop';
type AnalyticsState = 'default' | 'loading' | 'empty' | 'error';

interface CategoryRow {
  readonly category: 'supermercado' | 'transporte' | 'restaurante' | 'salud' | 'otro';
  readonly label: string;
  readonly amount: string;
  readonly percent: number;
  readonly color: 'primary' | 'green' | 'orange' | 'red' | 'blue';
}

interface AnalyticsShellProps {
  readonly layout: AnalyticsLayout;
  readonly state?: AnalyticsState;
  readonly emptyTitle?: string;
  readonly emptyMessage?: string;
  readonly errorMessage?: string;
  readonly onRetry?: () => void;
  readonly onGoHome?: () => void;
}

const PERIODS = [
  { id: 'semana', label: 'Week' },
  { id: 'mes', label: 'Month' },
  { id: 'trimestre', label: 'Quarter' },
  { id: 'year', label: 'Year' },
] as const;

const CHART_TABS = [
  { id: 'barras', label: 'Bars' },
  { id: 'lineas', label: 'Lines' },
  { id: 'donut', label: 'Donut' },
] as const;

const STATS = [
  { title: 'Gasto total', value: '$345.200', delta: { direction: 'up' as const, label: '+12% vs mes anterior' } },
  { title: 'Ingreso', value: '$890.000', delta: { direction: 'flat' as const, label: 'Sin cambio' } },
  { title: 'Ahorro', value: '$544.800', delta: { direction: 'up' as const, label: '+8% vs mes anterior' } },
];

const CATEGORIES: readonly CategoryRow[] = [
  { category: 'supermercado', label: 'Supermercado', amount: '$120.820', percent: 35, color: 'blue' },
  { category: 'transporte', label: 'Transporte', amount: '$69.040', percent: 20, color: 'green' },
  { category: 'restaurante', label: 'Restaurante', amount: '$51.780', percent: 15, color: 'orange' },
  { category: 'salud', label: 'Salud', amount: '$41.424', percent: 12, color: 'red' },
  { category: 'otro', label: 'Otros', amount: '$62.136', percent: 18, color: 'primary' },
];

const NAV_ITEMS = [
  { id: 'home', label: 'Inicio', icon: Home },
  { id: 'expenses', label: 'Gastos', icon: Receipt },
  { id: 'analytics', label: 'Tendencias', icon: BarChart3 },
  { id: 'categories', label: 'Categories', icon: Tag },
  { id: 'settings', label: 'Ajustes', icon: Settings },
] as const;

function ChartPlaceholder({ className = '' }: { className?: string }) {
  return (
    <div
      className={['flex items-center justify-center rounded-xl', className].filter(Boolean).join(' ')}
      style={{
        background: 'linear-gradient(135deg, var(--primary) 0%, var(--info) 50%, var(--positive) 100%)',
        opacity: 0.15,
        minHeight: '200px',
      }}
    >
      <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)', opacity: 1 }}>
        Chart area
      </span>
    </div>
  );
}

function LoadingChart() {
  return <Skeleton shape="rect" height="200px" />;
}

function LoadingStats({ columns }: { columns: 1 | 3 }) {
  return (
    <div className={columns === 3 ? 'grid grid-cols-3 gap-4' : 'flex gap-3 overflow-x-auto pb-1'}>
      {[0, 1, 2].map((i) => (
        <div key={i} className={columns === 1 ? 'min-w-[140px] flex-shrink-0' : ''}>
          <Skeleton shape="card" height="96px" />
        </div>
      ))}
    </div>
  );
}

function LoadingCategories({ count }: { count: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} shape="list-item" height="48px" />
      ))}
    </div>
  );
}

function EmptyContent({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12 px-6 text-center">
      <div
        className="flex items-center justify-center rounded-full p-4"
        style={{ backgroundColor: 'var(--surface-elevated, var(--surface))' }}
      >
        <TrendingUp size={40} style={{ color: 'var(--text-tertiary)' }} aria-hidden="true" />
      </div>
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h2>
        <p className="text-sm max-w-sm" style={{ color: 'var(--text-secondary)' }}>
          {message}
        </p>
      </div>
    </div>
  );
}

function CategoryList({ columns }: { columns: 1 | 2 }) {
  return (
    <div className={columns === 2 ? 'grid grid-cols-2 gap-3' : 'flex flex-col gap-3'}>
      {CATEGORIES.map((cat) => (
        <div key={cat.category} className="flex items-center gap-3">
          <CategoryBadge category={cat.category} label={cat.label} />
          <div className="flex-1 min-w-0">
            <Progress value={cat.percent} size="sm" color={cat.color} />
          </div>
          <span className="text-sm font-semibold whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>
            {cat.amount}
          </span>
          <span className="text-xs whitespace-nowrap" style={{ color: 'var(--text-tertiary)' }}>
            {cat.percent}%
          </span>
        </div>
      ))}
    </div>
  );
}

export function AnalyticsShell({
  layout,
  state = 'default',
  emptyTitle = 'Not enough data for analytics',
  emptyMessage = 'Start scanning receipts or adding transactions to see your spending trends here.',
  errorMessage = 'We could not load your analytics data. Please try again.',
  onRetry = () => {},
  onGoHome = () => {},
}: AnalyticsShellProps) {
  const [period, setPeriod] = React.useState('mes');
  const [chartTab, setChartTab] = React.useState('barras');
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

  if (layout === 'desktop') {
    return (
      <div className="flex h-full" style={{ backgroundColor: 'var(--background)' }}>
        <NavSidebar
          items={NAV_ITEMS}
          activeItem="analytics"
          onItemChange={() => {}}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
        />
        <div className="flex flex-col flex-1 min-w-0">
          <NavTop>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Mayo 2026</span>
          </NavTop>
          {state === 'error' ? (
            <div className="flex flex-1 items-center justify-center p-6">
              <ErrorFallback error={errorMessage} onRetry={onRetry} onGoHome={onGoHome} />
            </div>
          ) : (
            <div className="flex flex-1 gap-6 p-6 overflow-auto">
              <div className="flex flex-col gap-6 flex-[2] min-w-0">
                <div className="flex items-center justify-between">
                  <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Tendencias</h1>
                  {state !== 'loading' && (
                    <StateTabs tabs={CHART_TABS} activeTab={chartTab} onTabChange={setChartTab} />
                  )}
                </div>
                {state === 'loading' && (
                  <>
                    <LoadingChart />
                    <LoadingStats columns={3} />
                  </>
                )}
                {state === 'empty' && <EmptyContent title={emptyTitle} message={emptyMessage} />}
                {state === 'default' && (
                  <>
                    <ChartPlaceholder className="flex-1" />
                    <div className="grid grid-cols-3 gap-4">
                      {STATS.map((s) => <CardStat key={s.title} {...s} />)}
                    </div>
                  </>
                )}
              </div>
              <aside className="flex flex-col gap-6 w-72 shrink-0">
                <TimeSelector activePeriod={period} periods={PERIODS} onPeriodChange={setPeriod} />
                <div>
                  <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
                    Category breakdown
                  </h2>
                  {state === 'loading' ? (
                    <LoadingCategories count={5} />
                  ) : state === 'empty' ? null : (
                    <CategoryList columns={1} />
                  )}
                </div>
              </aside>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (layout === 'tablet') {
    return (
      <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--background)' }}>
        <header className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Tendencias</h1>
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Mayo 2026</span>
        </header>
        <div className="flex-1 overflow-auto p-6 flex flex-col gap-6">
          {state === 'error' ? (
            <div className="flex flex-1 items-center justify-center">
              <ErrorFallback error={errorMessage} onRetry={onRetry} onGoHome={onGoHome} />
            </div>
          ) : state === 'loading' ? (
            <>
              <Skeleton shape="rect" height="36px" width="280px" />
              <Skeleton shape="rect" height="36px" width="220px" />
              <LoadingChart />
              <LoadingStats columns={3} />
              <div>
                <Skeleton shape="text" width="140px" className="mb-3" />
                <LoadingCategories count={5} />
              </div>
            </>
          ) : state === 'empty' ? (
            <>
              <TimeSelector activePeriod={period} periods={PERIODS} onPeriodChange={setPeriod} />
              <EmptyContent title={emptyTitle} message={emptyMessage} />
            </>
          ) : (
            <>
              <TimeSelector activePeriod={period} periods={PERIODS} onPeriodChange={setPeriod} />
              <StateTabs tabs={CHART_TABS} activeTab={chartTab} onTabChange={setChartTab} />
              <ChartPlaceholder />
              <div className="grid grid-cols-3 gap-4">
                {STATS.map((s) => <CardStat key={s.title} {...s} />)}
              </div>
              <div>
                <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
                  Category breakdown
                </h2>
                <CategoryList columns={2} />
              </div>
            </>
          )}
        </div>
        <NavBottom items={NAV_ITEMS} activeItem="analytics" onItemChange={() => {}} />
      </div>
    );
  }

  // Mobile
  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--background)' }}>
      <header className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Tendencias</h1>
        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Mayo 2026</span>
      </header>
      <div className="flex-1 overflow-auto px-4 py-4 flex flex-col gap-4">
        {state === 'error' ? (
          <div className="flex flex-1 items-center justify-center">
            <ErrorFallback error={errorMessage} onRetry={onRetry} onGoHome={onGoHome} />
          </div>
        ) : state === 'loading' ? (
          <>
            <Skeleton shape="rect" height="36px" width="100%" />
            <Skeleton shape="rect" height="36px" width="200px" />
            <LoadingChart />
            <LoadingStats columns={1} />
            <div>
              <Skeleton shape="text" width="140px" className="mb-3" />
              <LoadingCategories count={5} />
            </div>
          </>
        ) : state === 'empty' ? (
          <>
            <TimeSelector activePeriod={period} periods={PERIODS} onPeriodChange={setPeriod} />
            <EmptyContent title={emptyTitle} message={emptyMessage} />
          </>
        ) : (
          <>
            <TimeSelector activePeriod={period} periods={PERIODS} onPeriodChange={setPeriod} />
            <StateTabs tabs={CHART_TABS} activeTab={chartTab} onTabChange={setChartTab} />
            <ChartPlaceholder />
            <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollSnapType: 'x mandatory' }}>
              {STATS.map((s) => (
                <div key={s.title} className="min-w-[140px] flex-shrink-0" style={{ scrollSnapAlign: 'start' }}>
                  <CardStat {...s} />
                </div>
              ))}
            </div>
            <div>
              <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
                Category breakdown
              </h2>
              <CategoryList columns={1} />
            </div>
          </>
        )}
      </div>
      <NavBottom items={NAV_ITEMS} activeItem="analytics" onItemChange={() => {}} />
    </div>
  );
}
