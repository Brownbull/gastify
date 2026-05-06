import type { View } from '@app/types';
import type { SettingsSubView } from '@/types/settings';

const URL_TO_VIEW: Record<string, View> = {
  '/': 'dashboard',
  '/history': 'history',
  '/items': 'items',
  '/trends': 'trends',
  '/insights': 'insights',
  '/reports': 'reports',
  '/alerts': 'alerts',
  '/recent-scans': 'recent-scans',
  '/statement-scan': 'statement-scan',
  '/scan': 'scan',
  '/batch/capture': 'batch-capture',
  '/batch/review': 'batch-review',
  '/settings': 'settings',
};

const VIEW_TO_URL: Record<string, string> = {
  'dashboard': '/',
  'history': '/history',
  'items': '/items',
  'trends': '/trends',
  'insights': '/insights',
  'reports': '/reports',
  'alerts': '/alerts',
  'recent-scans': '/recent-scans',
  'statement-scan': '/statement-scan',
  'scan': '/scan',
  'batch-capture': '/batch/capture',
  'batch-review': '/batch/review',
  'settings': '/settings',
  'transaction-editor': '/scan',
  'scan-result': '/scan',
  'edit': '/scan',
};

export function pathToView(pathname: string): View | null {
  if (URL_TO_VIEW[pathname]) return URL_TO_VIEW[pathname];
  if (pathname.startsWith('/settings/')) return 'settings';
  if (pathname.startsWith('/transactions/')) return 'transaction-editor';
  return null;
}

export function viewToPath(view: View): string {
  return VIEW_TO_URL[view] ?? '/';
}

export function normalizePath(pathname: string): string {
  if (pathname.startsWith('/settings/')) return '/settings';
  if (pathname.startsWith('/transactions/')) return '/scan';
  return pathname;
}

// Settings subview ↔ URL path mapping (reuses SettingsSubView from @/types/settings)
const SETTINGS_PATH_TO_SUBVIEW: Record<string, SettingsSubView> = {
  'limits': 'limites',
  'profile': 'perfil',
  'preferences': 'preferencias',
  'scanning': 'escaneo',
  'subscription': 'suscripcion',
  'data': 'datos',
  'groups': 'grupos',
  'app': 'app',
  'account': 'cuenta',
};

const SETTINGS_SUBVIEW_TO_PATH: Record<SettingsSubView, string> = {
  'main': '/settings',
  'limites': '/settings/limits',
  'perfil': '/settings/profile',
  'preferencias': '/settings/preferences',
  'escaneo': '/settings/scanning',
  'suscripcion': '/settings/subscription',
  'datos': '/settings/data',
  'grupos': '/settings/groups',
  'app': '/settings/app',
  'cuenta': '/settings/account',
};

export function pathToSettingsSubview(pathname: string): SettingsSubView {
  const segment = pathname.replace('/settings/', '').replace(/\/$/, '');
  return SETTINGS_PATH_TO_SUBVIEW[segment] ?? 'main';
}

export function settingsSubviewToPath(subview: SettingsSubView): string {
  return SETTINGS_SUBVIEW_TO_PATH[subview] ?? '/settings';
}
