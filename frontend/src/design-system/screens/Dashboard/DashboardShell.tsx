import { Home, Receipt, Camera, TrendingUp, Settings } from 'lucide-react';
import { CardStat } from '../../molecules/CardStat';
import { NavBottom } from '../../molecules/NavBottom';
import { NavSidebar } from '../../molecules/NavSidebar';
import { NavTop } from '../../molecules/NavTop';
import { Avatar } from '../../atoms/Avatar';
import { Badge } from '../../atoms/Badge';
import { CardTransaction } from '../../molecules/CardTransaction';
import { FAB } from '../../molecules/FAB';

type Viewport = 'mobile' | 'tablet' | 'desktop';

interface DashboardShellProps {
  viewport: Viewport;
}

const MOCK_USER = 'Carlos Munoz';

const MOCK_STATS = [
  { title: 'Total gastado', value: '$245.890', delta: { direction: 'down' as const, label: '-8% vs mes anterior' } },
  { title: 'Transacciones', value: '47', delta: { direction: 'up' as const, label: '+5 esta semana' } },
  { title: 'Promedio', value: '$5.230', delta: { direction: 'flat' as const, label: 'Sin cambio' } },
];

const MOCK_TRANSACTIONS = [
  { merchant: 'Supermercado Lider', amount: 34520, category: 'Food', date: new Date(2026, 4, 3) },
  { merchant: 'Farmacia Cruz Verde', amount: 12890, category: 'Salud', date: new Date(2026, 4, 2) },
  { merchant: 'Metro de Santiago', amount: 1500, category: 'Transporte', date: new Date(2026, 4, 2) },
  { merchant: 'Cafe Colonia', amount: 4200, category: 'Food', date: new Date(2026, 4, 1) },
  { merchant: 'Falabella', amount: 67800, category: 'Hogar', date: new Date(2026, 3, 30) },
];

const NAV_ITEMS = [
  { id: 'home', label: 'Inicio', icon: Home },
  { id: 'transactions', label: 'Gastos', icon: Receipt },
  { id: 'scan', label: 'Escanear', icon: Camera },
  { id: 'analytics', label: 'Analytics', icon: TrendingUp },
  { id: 'settings', label: 'Ajustes', icon: Settings },
] as const;

const FAB_ITEMS = [
  { id: 'scan', label: 'Escanear boleta', icon: Camera },
  { id: 'manual', label: 'Ingreso manual', icon: Receipt },
] as const;

const NOOP = () => {};

function MobileHeader() {
  return (
    <header
      className="flex items-center justify-between px-4 py-3"
      style={{ backgroundColor: 'var(--surface)' }}
    >
      <div>
        <p className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
          Hola,
        </p>
        <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
          {MOCK_USER}
        </p>
      </div>
      <div className="relative">
        <Avatar name={MOCK_USER} size="md" />
        <span className="absolute -top-1 -right-1">
          <Badge count={3} variant="danger" />
        </span>
      </div>
    </header>
  );
}

function StatGrid({ columns }: { columns: number }) {
  const stats = columns === 3 ? MOCK_STATS : MOCK_STATS.slice(0, 2);
  return (
    <div
      className="grid gap-3"
      style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
    >
      {stats.map((s) => (
        <CardStat key={s.title} title={s.title} value={s.value} delta={s.delta} />
      ))}
    </div>
  );
}

function TransactionList() {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
        Transacciones recientes
      </h2>
      {MOCK_TRANSACTIONS.map((tx) => (
        <CardTransaction
          key={`${tx.merchant}-${tx.amount}`}
          merchant={tx.merchant}
          amount={tx.amount}
          currency="CLP"
          category={tx.category}
          date={tx.date}
          type="expense"
        />
      ))}
    </section>
  );
}

function MobileLayout() {
  return (
    <div
      className="flex flex-col min-h-screen"
      style={{ backgroundColor: 'var(--background)' }}
    >
      <MobileHeader />
      <main className="flex-1 flex flex-col gap-4 px-4 py-3 pb-20">
        <StatGrid columns={2} />
        <TransactionList />
      </main>
      <FAB items={[...FAB_ITEMS]} onSelect={NOOP} />
      <div className="fixed bottom-0 left-0 right-0">
        <NavBottom items={[...NAV_ITEMS]} activeItem="home" onItemChange={NOOP} />
      </div>
    </div>
  );
}

function TabletLayout() {
  return (
    <div
      className="flex flex-col min-h-screen"
      style={{ backgroundColor: 'var(--background)' }}
    >
      <NavTop onSearch={NOOP}>
        <div className="relative">
          <Avatar name={MOCK_USER} size="sm" />
          <span className="absolute -top-1 -right-1">
            <Badge count={3} variant="danger" />
          </span>
        </div>
      </NavTop>
      <main className="flex-1 flex flex-col gap-4 px-6 py-4">
        <StatGrid columns={2} />
        <TransactionList />
      </main>
      <div className="fixed bottom-0 left-0 right-0">
        <NavBottom items={[...NAV_ITEMS]} activeItem="home" onItemChange={NOOP} />
      </div>
    </div>
  );
}

function DesktopLayout() {
  return (
    <div
      className="flex min-h-screen"
      style={{ backgroundColor: 'var(--background)' }}
    >
      <NavSidebar
        items={[...NAV_ITEMS]}
        activeItem="home"
        onItemChange={NOOP}
        collapsed={false}
        onToggleCollapse={NOOP}
      />
      <div className="flex-1 flex flex-col">
        <NavTop onSearch={NOOP}>
          <div className="relative">
            <Avatar name={MOCK_USER} size="sm" />
            <span className="absolute -top-1 -right-1">
              <Badge count={3} variant="danger" />
            </span>
          </div>
        </NavTop>
        <main className="flex-1 flex flex-col gap-6 px-8 py-6">
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Hola, {MOCK_USER}
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
              Resumen de mayo 2026
            </p>
          </div>
          <StatGrid columns={3} />
          <TransactionList />
        </main>
      </div>
    </div>
  );
}

const LAYOUTS: Record<Viewport, () => JSX.Element> = {
  mobile: MobileLayout,
  tablet: TabletLayout,
  desktop: DesktopLayout,
};

export function DashboardShell({ viewport }: DashboardShellProps) {
  const Layout = LAYOUTS[viewport];
  return <Layout />;
}
