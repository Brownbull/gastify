import { describe, it, expect } from 'vitest';
import {
  viewToPath,
  pathToView,
  normalizePath,
  pathToSettingsSubview,
  settingsSubviewToPath,
} from '../routeMapping';
import type { View } from '@app/types';
import { VALID_VIEWS } from '@app/types';

// =============================================================================
// viewToPath — every View enum value maps to a URL
// =============================================================================

describe('viewToPath', () => {
  const cases: [View, string][] = [
    ['dashboard', '/'],
    ['history', '/history'],
    ['items', '/items'],
    ['trends', '/trends'],
    ['insights', '/insights'],
    ['reports', '/reports'],
    ['alerts', '/alerts'],
    ['recent-scans', '/recent-scans'],
    ['statement-scan', '/statement-scan'],
    ['scan', '/scan'],
    ['batch-capture', '/batch/capture'],
    ['batch-review', '/batch/review'],
    ['settings', '/settings'],
    ['transaction-editor', '/scan'],
    ['scan-result', '/scan'],
    ['edit', '/scan'],
  ];

  it.each(cases)('maps "%s" → "%s"', (view, expected) => {
    expect(viewToPath(view)).toBe(expected);
  });

  it('falls back to "/" for unknown view', () => {
    expect(viewToPath('nonexistent' as View)).toBe('/');
  });

  it('covers every View in the VALID_VIEWS set', () => {
    for (const view of VALID_VIEWS) {
      const path = viewToPath(view as View);
      expect(typeof path).toBe('string');
      expect(path.startsWith('/')).toBe(true);
    }
  });
});

// =============================================================================
// pathToView — URL pathname → View or null
// =============================================================================

describe('pathToView', () => {
  const cases: [string, View][] = [
    ['/', 'dashboard'],
    ['/history', 'history'],
    ['/items', 'items'],
    ['/trends', 'trends'],
    ['/insights', 'insights'],
    ['/reports', 'reports'],
    ['/alerts', 'alerts'],
    ['/recent-scans', 'recent-scans'],
    ['/statement-scan', 'statement-scan'],
    ['/scan', 'scan'],
    ['/batch/capture', 'batch-capture'],
    ['/batch/review', 'batch-review'],
    ['/settings', 'settings'],
  ];

  it.each(cases)('maps "%s" → "%s"', (path, expected) => {
    expect(pathToView(path)).toBe(expected);
  });

  it('maps /settings/* to "settings"', () => {
    expect(pathToView('/settings/profile')).toBe('settings');
    expect(pathToView('/settings/preferences')).toBe('settings');
    expect(pathToView('/settings/data')).toBe('settings');
    expect(pathToView('/settings/anything')).toBe('settings');
  });

  it('maps /transactions/* to "transaction-editor"', () => {
    expect(pathToView('/transactions/abc123')).toBe('transaction-editor');
    expect(pathToView('/transactions/edit/xyz')).toBe('transaction-editor');
  });

  it('returns null for unknown paths', () => {
    expect(pathToView('/unknown')).toBeNull();
    expect(pathToView('/foo/bar')).toBeNull();
    expect(pathToView('')).toBeNull();
  });
});

// =============================================================================
// Roundtrip: pathToView(viewToPath(view)) === view (where unambiguous)
// =============================================================================

describe('viewToPath ↔ pathToView roundtrip', () => {
  const unambiguousViews: View[] = [
    'dashboard', 'history', 'items', 'trends', 'insights',
    'reports', 'alerts', 'recent-scans', 'statement-scan',
    'scan', 'batch-capture', 'batch-review', 'settings',
  ];

  it.each(unambiguousViews)('roundtrips "%s"', (view) => {
    const path = viewToPath(view);
    const recovered = pathToView(path);
    expect(recovered).toBe(view);
  });

  it('transaction-editor, scan-result, edit all map to /scan → scan', () => {
    expect(viewToPath('transaction-editor')).toBe('/scan');
    expect(viewToPath('scan-result')).toBe('/scan');
    expect(viewToPath('edit')).toBe('/scan');
    expect(pathToView('/scan')).toBe('scan');
  });
});

// =============================================================================
// normalizePath
// =============================================================================

describe('normalizePath', () => {
  it('normalizes /settings/* to /settings', () => {
    expect(normalizePath('/settings/profile')).toBe('/settings');
    expect(normalizePath('/settings/data')).toBe('/settings');
  });

  it('normalizes /transactions/* to /scan', () => {
    expect(normalizePath('/transactions/abc')).toBe('/scan');
    expect(normalizePath('/transactions/edit/xyz')).toBe('/scan');
  });

  it('passes through other paths unchanged', () => {
    expect(normalizePath('/')).toBe('/');
    expect(normalizePath('/history')).toBe('/history');
    expect(normalizePath('/trends')).toBe('/trends');
    expect(normalizePath('/batch/capture')).toBe('/batch/capture');
  });
});

// =============================================================================
// Settings subview mapping
// =============================================================================

describe('pathToSettingsSubview', () => {
  const cases: [string, string][] = [
    ['/settings/limits', 'limites'],
    ['/settings/profile', 'perfil'],
    ['/settings/preferences', 'preferencias'],
    ['/settings/scanning', 'escaneo'],
    ['/settings/subscription', 'suscripcion'],
    ['/settings/data', 'datos'],
    ['/settings/groups', 'grupos'],
    ['/settings/app', 'app'],
    ['/settings/account', 'cuenta'],
  ];

  it.each(cases)('maps "%s" → "%s"', (path, expected) => {
    expect(pathToSettingsSubview(path)).toBe(expected);
  });

  it('defaults to "main" for /settings', () => {
    expect(pathToSettingsSubview('/settings')).toBe('main');
    expect(pathToSettingsSubview('/settings/')).toBe('main');
  });

  it('defaults to "main" for unknown subview', () => {
    expect(pathToSettingsSubview('/settings/unknown')).toBe('main');
  });
});

describe('settingsSubviewToPath', () => {
  const cases: [string, string][] = [
    ['main', '/settings'],
    ['limites', '/settings/limits'],
    ['perfil', '/settings/profile'],
    ['preferencias', '/settings/preferences'],
    ['escaneo', '/settings/scanning'],
    ['suscripcion', '/settings/subscription'],
    ['datos', '/settings/data'],
    ['grupos', '/settings/groups'],
    ['app', '/settings/app'],
    ['cuenta', '/settings/account'],
  ];

  it.each(cases)('maps "%s" → "%s"', (subview, expected) => {
    expect(settingsSubviewToPath(subview as any)).toBe(expected);
  });
});

describe('settingsSubviewToPath ↔ pathToSettingsSubview roundtrip', () => {
  const subviews = [
    'limites', 'perfil', 'preferencias', 'escaneo',
    'suscripcion', 'datos', 'grupos', 'app', 'cuenta',
  ] as const;

  it.each(subviews)('roundtrips "%s"', (subview) => {
    const path = settingsSubviewToPath(subview);
    const recovered = pathToSettingsSubview(path);
    expect(recovered).toBe(subview);
  });
});
