import type { View } from '@app/types';

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
