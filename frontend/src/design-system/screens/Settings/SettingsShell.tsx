import {
  Home, Receipt, Camera, BarChart3, User,
  UserCircle, Sliders, ScanLine, Gauge,
  CreditCard, Database, Users, Smartphone, LogOut,
} from 'lucide-react';
import { Avatar } from '../../atoms/Avatar';
import { Divider } from '../../atoms/Divider';
import { ListItem } from '../../molecules/ListItem';
import { NavBottom } from '../../molecules/NavBottom';
import { NavSidebar } from '../../molecules/NavSidebar';
import { NavTop } from '../../molecules/NavTop';

interface SettingsShellProps {
  layout: 'mobile' | 'desktop';
}

const PROFILE = { name: 'Carlos Munoz', email: 'carlos@email.cl' } as const;

const SETTING_GROUPS = [
  { label: 'Personal', items: [
    { id: 'perfil', label: 'Perfil' },
    { id: 'preferencias', label: 'Preferencias' },
  ]},
  { label: 'Funcionalidad', items: [
    { id: 'escaneo', label: 'Escaneo' },
    { id: 'limites', label: 'Limits' },
    { id: 'suscripcion', label: 'Subscription' },
  ]},
  { label: 'Datos y grupos', items: [
    { id: 'datos', label: 'Datos' },
    { id: 'grupos', label: 'Grupos' },
  ]},
  { label: 'Sistema', items: [
    { id: 'aplicacion', label: 'Application' },
    { id: 'cuenta', label: 'Cuenta' },
  ]},
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
  { id: 'settings', label: 'Ajustes', icon: Sliders },
] as const;

// Suppress unused-import warnings — icons reserved for future per-item rendering
void [UserCircle, ScanLine, Gauge, CreditCard, Database, Users, Smartphone, LogOut];

function ProfileCard() {
  return (
    <div className="flex items-center gap-3 px-4 py-5" style={{ backgroundColor: 'var(--surface)' }}>
      <Avatar name={PROFILE.name} size="lg" color="primary" />
      <div className="flex-1 min-w-0">
        <p className="text-base font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
          {PROFILE.name}
        </p>
        <p className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>
          {PROFILE.email}
        </p>
      </div>
    </div>
  );
}

function SettingsListGroups() {
  return (
    <div className="flex flex-col">
      {SETTING_GROUPS.map((group, idx) => (
        <div key={group.label}>
          {idx > 0 && <Divider className="my-1" />}
          <p className="px-4 pt-4 pb-1 text-xs font-semibold uppercase tracking-wider"
            style={{ color: 'var(--text-tertiary)' }}>
            {group.label}
          </p>
          {group.items.map((item) => (
            <ListItem key={item.id} variant="navigable" label={item.label} onClick={() => {}} />
          ))}
        </div>
      ))}
    </div>
  );
}

function SettingsSidebar() {
  return (
    <>
      <ProfileCard />
      <Divider />
      <SettingsListGroups />
    </>
  );
}

function MobileSettings() {
  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--background)' }}>
      <header className="px-4 py-3"
        style={{ backgroundColor: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Ajustes</h1>
      </header>
      <div className="flex-1 overflow-y-auto">
        <SettingsSidebar />
      </div>
      <NavBottom items={NAV_ITEMS} activeItem="profile" onItemChange={() => {}} />
    </div>
  );
}

function DesktopSettings() {
  return (
    <div className="flex h-full" style={{ backgroundColor: 'var(--background)' }}>
      <NavSidebar items={SIDEBAR_ITEMS} activeItem="settings"
        onItemChange={() => {}} collapsed={false} onToggleCollapse={() => {}} />
      <div className="flex-1 flex flex-col min-w-0">
        <NavTop />
        <div className="flex-1 flex min-h-0">
          <div className="w-72 shrink-0 overflow-y-auto"
            style={{ backgroundColor: 'var(--surface)', borderRight: '1px solid var(--border)' }}>
            <SettingsSidebar />
          </div>
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
              Select an option
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SettingsShell({ layout }: SettingsShellProps) {
  return layout === 'desktop' ? <DesktopSettings /> : <MobileSettings />;
}
