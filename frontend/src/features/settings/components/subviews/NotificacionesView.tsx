/**
 * NotificacionesView - Push Notification Settings Sub-View
 *
 * Epic 14c: Household Sharing
 *
 * Settings UI for managing push notification preferences.
 * Allows users to enable/disable notifications for shared group updates.
 *
 * Features:
 * - Toggle to enable/disable push notifications
 * - Shows browser permission status
 * - Explains what notifications will be sent
 * - Handles permission denied state
 */

import React, { useCallback } from 'react';
import { Bell, BellOff, AlertCircle, Loader2 } from 'lucide-react';

export interface NotificacionesViewProps {
    /** Translation function (for future use) */
    t?: (key: string, params?: Record<string, string | number>) => string;
    theme: string;
    lang?: 'en' | 'es';
    /** Whether push notifications are supported in this browser */
    isSupported: boolean;
    /** Current browser permission status */
    permission: NotificationPermission;
    /** Whether notifications are currently enabled */
    isEnabled: boolean;
    /** Whether an operation is in progress */
    isLoading: boolean;
    /** Error message if any */
    error: string | null;
    /** Callback to enable notifications */
    onEnableNotifications: () => Promise<boolean>;
    /** Callback to disable notifications */
    onDisableNotifications: () => Promise<void>;
    /** Toast callback */
    onShowToast?: (message: string, type?: 'success' | 'error') => void;
}

export const NotificacionesView: React.FC<NotificacionesViewProps> = ({
    // t is available but currently unused - translations are inline
    theme,
    lang = 'es',
    isSupported,
    permission,
    isEnabled,
    isLoading,
    error,
    onEnableNotifications,
    onDisableNotifications,
    onShowToast,
}) => {
    const isDark = theme === 'dark';

    // Handle toggle click
    const handleToggle = useCallback(async () => {
        if (isLoading) return;

        if (isEnabled) {
            await onDisableNotifications();
            onShowToast?.(
                lang === 'es' ? 'Notificaciones desactivadas' : 'Notifications disabled',
                'success'
            );
        } else {
            const success = await onEnableNotifications();
            if (success) {
                onShowToast?.(
                    lang === 'es' ? 'Notificaciones activadas' : 'Notifications enabled',
                    'success'
                );
            } else if (permission === 'denied') {
                onShowToast?.(
                    lang === 'es'
                        ? 'Permiso denegado. Actívalo en la configuración del navegador.'
                        : 'Permission denied. Enable in browser settings.',
                    'error'
                );
            }
        }
    }, [isLoading, isEnabled, onEnableNotifications, onDisableNotifications, onShowToast, lang, permission]);

    // Not supported in this browser
    if (!isSupported) {
        return (
            <div className="space-y-3">
                <div
                    className="rounded-xl p-4"
                    style={{
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--border-light)',
                    }}
                >
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)' }}
                        >
                            <AlertCircle className="w-5 h-5" style={{ color: '#ef4444' }} />
                        </div>
                        <div>
                            <h3
                                className="font-medium"
                                style={{ color: 'var(--text-primary)' }}
                            >
                                {lang === 'es' ? 'No disponible' : 'Not available'}
                            </h3>
                            <p
                                className="text-sm"
                                style={{ color: 'var(--text-secondary)' }}
                            >
                                {lang === 'es'
                                    ? 'Las notificaciones push no son compatibles con este navegador.'
                                    : 'Push notifications are not supported in this browser.'
                                }
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Permission denied by browser
    const isPermissionDenied = permission === 'denied';

    return (
        <div className="space-y-3">
            {/* Main Toggle Card */}
            <div
                className="rounded-xl overflow-hidden"
                style={{
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-light)',
                }}
            >
                {/* Header with toggle */}
                <div className="p-4 flex items-center gap-3">
                    {/* Icon */}
                    <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{
                            backgroundColor: isEnabled
                                ? (isDark ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.1)')
                                : (isDark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(148, 163, 184, 0.1)'),
                        }}
                    >
                        {isEnabled ? (
                            <Bell className="w-5 h-5" style={{ color: '#22c55e' }} />
                        ) : (
                            <BellOff className="w-5 h-5" style={{ color: '#94a3b8' }} />
                        )}
                    </div>

                    {/* Text */}
                    <div className="flex-1">
                        <h3
                            className="font-medium"
                            style={{ color: 'var(--text-primary)' }}
                        >
                            {lang === 'es' ? 'Notificaciones de Grupos' : 'Group Notifications'}
                        </h3>
                        <p
                            className="text-sm"
                            style={{ color: 'var(--text-secondary)' }}
                        >
                            {isEnabled
                                ? (lang === 'es' ? 'Activadas' : 'Enabled')
                                : (lang === 'es' ? 'Desactivadas' : 'Disabled')
                            }
                        </p>
                    </div>

                    {/* Toggle */}
                    <button
                        onClick={handleToggle}
                        disabled={isLoading || isPermissionDenied}
                        className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2"
                        style={{
                            backgroundColor: isEnabled ? 'var(--primary)' : 'var(--bg-tertiary)',
                            opacity: (isLoading || isPermissionDenied) ? 0.5 : 1,
                            cursor: (isLoading || isPermissionDenied) ? 'not-allowed' : 'pointer',
                        }}
                        aria-label={isEnabled
                            ? (lang === 'es' ? 'Desactivar notificaciones' : 'Disable notifications')
                            : (lang === 'es' ? 'Activar notificaciones' : 'Enable notifications')
                        }
                    >
                        <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${
                                isEnabled ? 'translate-x-6' : 'translate-x-1'
                            }`}
                        >
                            {isLoading && (
                                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                            )}
                        </span>
                    </button>
                </div>

                {/* Description */}
                <div
                    className="px-4 pb-4 pt-0"
                    style={{ borderTop: '1px solid var(--border-light)' }}
                >
                    <div className="pt-3">
                        <p
                            className="text-sm"
                            style={{ color: 'var(--text-secondary)' }}
                        >
                            {lang === 'es'
                                ? 'Recibe notificaciones cuando otros miembros agreguen gastos a tus grupos compartidos.'
                                : 'Receive notifications when other members add expenses to your shared groups.'
                            }
                        </p>
                    </div>
                </div>
            </div>

            {/* Permission Denied Warning */}
            {isPermissionDenied && (
                <div
                    className="rounded-xl p-4"
                    style={{
                        backgroundColor: isDark ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.05)',
                        border: '1px solid rgba(245, 158, 11, 0.2)',
                    }}
                >
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#f59e0b' }} />
                        <div>
                            <h4
                                className="font-medium text-sm"
                                style={{ color: 'var(--text-primary)' }}
                            >
                                {lang === 'es' ? 'Permiso denegado' : 'Permission denied'}
                            </h4>
                            <p
                                className="text-sm mt-1"
                                style={{ color: 'var(--text-secondary)' }}
                            >
                                {lang === 'es'
                                    ? 'Para recibir notificaciones, actívalas en la configuración de tu navegador y recarga la página.'
                                    : 'To receive notifications, enable them in your browser settings and reload the page.'
                                }
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Error Display */}
            {error && !isPermissionDenied && (
                <div
                    className="rounded-xl p-4"
                    style={{
                        backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                    }}
                >
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#ef4444' }} />
                        <p
                            className="text-sm"
                            style={{ color: '#ef4444' }}
                        >
                            {error}
                        </p>
                    </div>
                </div>
            )}

            {/* What notifications include */}
            <div
                className="rounded-xl p-4"
                style={{
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-light)',
                }}
            >
                <h4
                    className="font-medium text-sm mb-3"
                    style={{ color: 'var(--text-primary)' }}
                >
                    {lang === 'es' ? '¿Qué notificaciones recibiré?' : 'What notifications will I receive?'}
                </h4>
                <ul className="space-y-2">
                    {[
                        lang === 'es' ? 'Gastos agregados por otros miembros' : 'Expenses added by other members',
                        lang === 'es' ? 'Solo para grupos donde eres miembro' : 'Only for groups where you are a member',
                        lang === 'es' ? 'Incluso cuando la app está cerrada' : 'Even when the app is closed',
                    ].map((item, i) => (
                        <li
                            key={i}
                            className="flex items-center gap-2 text-sm"
                            style={{ color: 'var(--text-secondary)' }}
                        >
                            <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: 'var(--primary)' }}
                            />
                            {item}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default NotificacionesView;
