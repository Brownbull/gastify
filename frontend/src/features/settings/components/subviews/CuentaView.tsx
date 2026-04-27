/**
 * CuentaView Sub-View (now "Mis Datos" / "My Data")
 * Story 14.22 AC #10: Data export, import, storage info, factory reset
 *
 * Redesigned to match settings.html mockup with:
 * - Local User card
 * - Storage Usage with progress bar
 * - Export/Import Data rows
 * - Cloud Sync placeholder
 * - Destructive reset action
 *
 * Note: Sign out moved to main Settings menu and ProfileDropdown for easier access
 */

import React from 'react';
import {
    User,
    Download,
    Upload,
    RefreshCw,
    Trash2,
    Loader2,
} from 'lucide-react';

interface CuentaViewProps {
    t: (key: string) => string;
    theme: string;
    wiping: boolean;
    exporting: boolean;
    onExportAll: () => void;
    onWipeDB: () => Promise<void>;
}

export const CuentaView: React.FC<CuentaViewProps> = ({
    t,
    theme,
    wiping,
    exporting,
    onExportAll,
    onWipeDB,
}) => {
    const isDark = theme === 'dark';

    const cardStyle: React.CSSProperties = {
        backgroundColor: 'var(--bg-secondary)',
        borderColor: isDark ? '#334155' : '#e2e8f0',
    };

    return (
        <div className="space-y-3">
            {/* Local User Card */}
            <div className="p-4 rounded-xl border" style={cardStyle}>
                <div className="flex items-center gap-3">
                    <div
                        className="w-12 h-12 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: 'var(--primary-light)' }}
                    >
                        <User size={24} style={{ color: 'var(--primary)' }} />
                    </div>
                    <div className="flex-1">
                        <div
                            className="text-base font-semibold"
                            style={{ color: 'var(--text-primary)' }}
                        >
                            {t('localUser')}
                        </div>
                        <div
                            className="text-xs"
                            style={{ color: 'var(--text-secondary)' }}
                        >
                            {t('localUserDesc')}
                        </div>
                    </div>
                </div>
            </div>

            {/* Export Data Row */}
            <div className="p-4 rounded-xl border" style={cardStyle}>
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2.5">
                        <Download size={20} style={{ color: 'var(--text-secondary)' }} />
                        <div>
                            <span
                                className="text-sm font-medium block"
                                style={{ color: 'var(--text-primary)' }}
                            >
                                {t('exportData')}
                            </span>
                            <span
                                className="text-xs"
                                style={{ color: 'var(--text-secondary)' }}
                            >
                                {t('exportDataDesc')}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={onExportAll}
                        disabled={exporting}
                        className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors"
                        style={{
                            backgroundColor: isDark
                                ? 'rgba(59, 130, 246, 0.2)'
                                : 'rgba(59, 130, 246, 0.1)',
                            color: 'var(--accent)',
                            cursor: exporting ? 'not-allowed' : 'pointer',
                            opacity: exporting ? 0.6 : 1,
                        }}
                    >
                        {exporting ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                {t('exportingData')}
                            </>
                        ) : (
                            'CSV'
                        )}
                    </button>
                </div>
            </div>

            {/* Import Data Row */}
            <div className="p-4 rounded-xl border" style={cardStyle}>
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2.5">
                        <Upload size={20} style={{ color: 'var(--text-secondary)' }} />
                        <div>
                            <span
                                className="text-sm font-medium block"
                                style={{ color: 'var(--text-primary)' }}
                            >
                                {t('importData')}
                            </span>
                            <span
                                className="text-xs"
                                style={{ color: 'var(--text-secondary)' }}
                            >
                                {t('importDataDesc')}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            // TODO: Implement import functionality
                        }}
                        className="flex items-center justify-center px-3.5 py-2 rounded-lg text-sm font-medium transition-colors"
                        style={{
                            backgroundColor: isDark
                                ? 'rgba(34, 197, 94, 0.2)'
                                : 'rgba(34, 197, 94, 0.1)',
                            color: '#22c55e',
                        }}
                    >
                        {t('selectFile')}
                    </button>
                </div>
            </div>

            {/* Cloud Sync Row (Placeholder - disabled) */}
            <div className="p-4 rounded-xl border opacity-60" style={cardStyle}>
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2.5">
                        <RefreshCw size={20} style={{ color: 'var(--text-secondary)' }} />
                        <div>
                            <span
                                className="text-sm font-medium block"
                                style={{ color: 'var(--text-primary)' }}
                            >
                                {t('cloudSync')}
                            </span>
                            <span
                                className="text-xs"
                                style={{ color: 'var(--text-secondary)' }}
                            >
                                {t('cloudSyncDesc')}
                            </span>
                        </div>
                    </div>
                    <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                            backgroundColor: 'var(--bg-tertiary)',
                            color: 'var(--text-tertiary)',
                        }}
                    >
                        {t('soonBadge')}
                    </span>
                </div>
            </div>

            {/* Divider */}
            <div
                className="h-px mx-2"
                style={{ backgroundColor: 'var(--border-light)' }}
            />

            {/* Factory Reset - Destructive */}
            <div
                className="p-4 rounded-xl border"
                style={{
                    ...cardStyle,
                    borderColor: isDark ? '#7f1d1d' : '#fecaca',
                }}
            >
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2.5">
                        <Trash2 size={20} style={{ color: '#ef4444' }} />
                        <div>
                            <span
                                className="text-sm font-medium block"
                                style={{ color: '#ef4444' }}
                            >
                                {t('resetAll')}
                            </span>
                            <span
                                className="text-xs"
                                style={{ color: 'var(--text-secondary)' }}
                            >
                                {t('resetAllDesc')}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={onWipeDB}
                        disabled={wiping}
                        className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors"
                        style={{
                            backgroundColor: isDark ? '#7f1d1d' : '#fef2f2',
                            borderWidth: 1,
                            borderStyle: 'solid',
                            borderColor: isDark ? '#991b1b' : '#fecaca',
                            color: '#ef4444',
                            cursor: wiping ? 'not-allowed' : 'pointer',
                            opacity: wiping ? 0.6 : 1,
                        }}
                    >
                        {wiping ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : null}
                        {t('resetAllBtn')}
                    </button>
                </div>
            </div>
        </div>
    );
};
