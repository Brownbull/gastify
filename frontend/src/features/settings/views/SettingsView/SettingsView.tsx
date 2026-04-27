/**
 * SettingsView
 * Story 14.22: Hierarchical settings with sub-views
 * Story 14e-25c.1: Migrated to own data via useSettingsViewData hook
 *
 * Main menu shows 8 navigation items, each opening a dedicated sub-view.
 * Data comes from the composition hook - no props from App.tsx.
 */

import React from 'react';
import type { Firestore } from 'firebase/firestore';
import {
    SettingsMenuItem,
    LimitesView,
    PerfilView,
    PreferenciasView,
    EscaneoView,
    SuscripcionView,
    DatosAprendidosView,
    AppView,
    CuentaView,
} from '@features/settings/components';
// Story 14e-25d: Direct toast hook (ViewHandlersContext deleted)
import { useToast } from '@/shared/hooks';
import { useModalActions } from '@/managers/ModalManager';
import { useSettingsViewData } from './useSettingsViewData';

// =============================================================================
// Types
// =============================================================================

/**
 * Props for overriding hook data in tests or for App.tsx callbacks.
 * Story 14e-25c.1: SettingsView can receive callback overrides for
 * functions that need App-level state coordination.
 */
export interface SettingsViewTestOverrides {
    /** Override wipeDB callback (needs App-level state) */
    onWipeDB?: () => Promise<void>;
    /** Override exportAll callback (needs App-level services) */
    onExportAll?: () => void;
    /** Override signOut callback (needs auth coordination) */
    onSignOut?: () => void | Promise<void>;
    /** Override wiping state */
    wiping?: boolean;
    /** Override exporting state */
    exporting?: boolean;
}

/**
 * SettingsView props - minimal, only for test overrides.
 * Story 14e-25c.1: SettingsView owns its data via useSettingsViewData.
 */
export interface SettingsViewProps {
    /**
     * Override data for testing or App.tsx callback coordination.
     * Account actions (wipeDB, exportAll, signOut) may need App-level coordination.
     */
    _testOverrides?: SettingsViewTestOverrides;
}

// =============================================================================
// Component Implementation
// =============================================================================

/**
 * SettingsView - Hierarchical settings with sub-views.
 *
 * Story 14e-25c.1: This component now owns its data via useSettingsViewData.
 * It receives NO props from App.tsx except optional _testOverrides.
 */
export const SettingsView: React.FC<SettingsViewProps> = ({
    _testOverrides,
}) => {
    // === Get All Data from Hook ===
    const data = useSettingsViewData();

    // === Extract Data ===
    const {
        profile,
        preferences,
        theme: themeData,
        subscription,
        mappings,
        navigation,
        account,
        db,
        userId,
        appId,
        t,
    } = data;

    // === Apply Overrides ===
    const effectiveAccount = {
        ...account,
        signOut: _testOverrides?.onSignOut ?? account.signOut,
        wipeDB: _testOverrides?.onWipeDB ?? account.wipeDB,
        exportAll: _testOverrides?.onExportAll ?? account.exportAll,
        wiping: _testOverrides?.wiping ?? account.wiping,
        exporting: _testOverrides?.exporting ?? account.exporting,
    };

    // === Dialog Handlers (Story 14e-25d: Direct toast hook) ===
    const { showToast } = useToast();
    const onShowToast = (message: string, type?: 'success' | 'error' | 'info') => {
        const toastType = type === 'error' ? 'info' : (type || 'success');
        showToast(message, toastType);
    };

    // === Modal Actions ===
    const { openModal, closeModal } = useModalActions();

    // === Navigation ===
    const currentView = navigation.subview;
    const setCurrentView = navigation.setSubview;

    // === Render Sub-Views ===
    const renderSubView = () => {
        switch (currentView) {
            case 'limites':
                return (
                    <LimitesView
                        t={t}
                        lang={preferences.lang}
                        theme={themeData.theme}
                    />
                );

            case 'perfil':
                return (
                    <PerfilView
                        t={t}
                        theme={themeData.theme}
                        displayName={profile.displayName}
                        email={profile.email}
                        phoneNumber={profile.phoneNumber}
                        birthDate={profile.birthDate}
                        onSetDisplayName={profile.setDisplayName}
                        onSetPhoneNumber={profile.setPhoneNumber}
                        onSetBirthDate={profile.setBirthDate}
                        onShowToast={onShowToast}
                    />
                );

            case 'preferencias':
                return (
                    <PreferenciasView
                        t={t}
                        theme={themeData.theme}
                        lang={preferences.lang}
                        currency={preferences.currency}
                        dateFormat={preferences.dateFormat}
                        colorTheme={themeData.colorTheme}
                        fontColorMode={themeData.fontColorMode}
                        fontFamily={themeData.fontFamily}
                        fontSize={themeData.fontSize}
                        // Wrap typed setters to accept string params for PreferenciasView
                        onSetLang={(l) => preferences.setLang(l as typeof preferences.lang)}
                        onSetCurrency={(c) => preferences.setCurrency(c)}
                        onSetDateFormat={(f) => preferences.setDateFormat(f as typeof preferences.dateFormat)}
                        onSetTheme={(t) => themeData.setTheme(t as typeof themeData.theme)}
                        onSetColorTheme={(ct) => themeData.setColorTheme(ct as typeof themeData.colorTheme)}
                        onSetFontColorMode={(m) => themeData.setFontColorMode(m as typeof themeData.fontColorMode)}
                        onSetFontFamily={(ff) => themeData.setFontFamily(ff as typeof themeData.fontFamily)}
                        onSetFontSize={(fs) => themeData.setFontSize(fs as typeof themeData.fontSize)}
                    />
                );

            case 'escaneo':
                return (
                    <EscaneoView
                        t={t}
                        theme={themeData.theme}
                        defaultScanCurrency={preferences.defaultScanCurrency}
                        defaultCountry={preferences.defaultCountry}
                        defaultCity={preferences.defaultCity}
                        foreignLocationFormat={preferences.foreignLocationFormat}
                        onSetDefaultScanCurrency={preferences.setDefaultScanCurrency}
                        onSetDefaultCountry={preferences.setDefaultCountry}
                        onSetDefaultCity={preferences.setDefaultCity}
                        onSetForeignLocationFormat={preferences.setForeignLocationFormat}
                    />
                );

            case 'suscripcion':
                return (
                    <SuscripcionView
                        t={t}
                        lang={preferences.lang}
                        theme={themeData.theme}
                        plan={subscription.plan}
                        creditsRemaining={subscription.creditsRemaining}
                        superCreditsRemaining={subscription.superCreditsRemaining}
                        daysUntilReset={subscription.daysUntilReset}
                    />
                );

            case 'datos':
                return (
                    <DatosAprendidosView
                        t={t}
                        theme={themeData.theme}
                        mappings={mappings.categories.data}
                        mappingsLoading={mappings.categories.loading}
                        onDeleteMapping={mappings.categories.delete}
                        onEditMapping={mappings.categories.update}
                        merchantMappings={mappings.merchants.data}
                        merchantMappingsLoading={mappings.merchants.loading}
                        onDeleteMerchantMapping={mappings.merchants.delete}
                        onEditMerchantMapping={mappings.merchants.update}
                        subcategoryMappings={mappings.subcategories.data}
                        subcategoryMappingsLoading={mappings.subcategories.loading}
                        onDeleteSubcategoryMapping={mappings.subcategories.delete}
                        onUpdateSubcategoryMapping={mappings.subcategories.update}
                        trustedMerchants={mappings.trusted.data}
                        trustedMerchantsLoading={mappings.trusted.loading}
                        onRevokeTrust={mappings.trusted.revoke}
                        itemNameMappings={mappings.itemNames.data}
                        itemNameMappingsLoading={mappings.itemNames.loading}
                        onDeleteItemNameMapping={mappings.itemNames.delete}
                        onUpdateItemNameMapping={mappings.itemNames.update}
                        onClearAllLearnedData={mappings.clearAll}
                    />
                );

            case 'grupos':
                return (
                    <div
                        className="flex flex-col items-center justify-center text-center px-6"
                        style={{ minHeight: '40vh' }}
                        data-testid="grupos-coming-soon"
                    >
                        <div
                            className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                            style={{ backgroundColor: 'var(--bg-tertiary)' }}
                        >
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}>
                                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                        </div>
                        <h2
                            className="text-lg font-semibold mb-2"
                            style={{ color: 'var(--text-primary)' }}
                        >
                            {t('featureComingSoon')}
                        </h2>
                        <p
                            className="text-sm"
                            style={{ color: 'var(--text-secondary)' }}
                        >
                            {t('featureComingSoonDescription')}
                        </p>
                    </div>
                );

            case 'app':
                return (
                    <AppView
                        t={t}
                        theme={themeData.theme}
                        db={db as Firestore | null}
                        userId={userId}
                        appId={appId}
                        onShowToast={onShowToast}
                    />
                );

            case 'cuenta':
                return (
                    <CuentaView
                        t={t}
                        theme={themeData.theme}
                        wiping={effectiveAccount.wiping}
                        exporting={effectiveAccount.exporting}
                        onExportAll={effectiveAccount.exportAll}
                        onWipeDB={effectiveAccount.wipeDB}
                    />
                );

            default:
                return null;
        }
    };

    // === Main Menu View ===
    if (currentView === 'main') {
        return (
            <div className="pb-4 space-y-3">
                {/* Menu Items - Story 14.22 AC #2 - colors from mockup settings.html */}
                <SettingsMenuItem
                    title={t('settingsLimites')}
                    subtitle={t('settingsLimitesDesc')}
                    icon="circle-alert"
                    iconBgColor="#fef2f2"
                    iconColor="#ef4444"
                    onClick={() => setCurrentView('limites')}
                    testId="settings-menu-limites"
                />

                <SettingsMenuItem
                    title={t('settingsPerfil')}
                    subtitle={t('settingsPerfilDesc')}
                    icon="user"
                    iconBgColor="var(--primary-light)"
                    iconColor="var(--primary)"
                    onClick={() => setCurrentView('perfil')}
                    testId="settings-menu-perfil"
                />

                <SettingsMenuItem
                    title={t('settingsPreferencias')}
                    subtitle={t('settingsPreferenciasDesc')}
                    icon="settings"
                    iconBgColor="#e0e7ff"
                    iconColor="#6366f1"
                    onClick={() => setCurrentView('preferencias')}
                    testId="settings-menu-preferencias"
                />

                <SettingsMenuItem
                    title={t('settingsEscaneo')}
                    subtitle={t('settingsEscaneoDesc')}
                    icon="camera"
                    iconBgColor="#dbeafe"
                    iconColor="#3b82f6"
                    onClick={() => setCurrentView('escaneo')}
                    testId="settings-menu-escaneo"
                />

                <SettingsMenuItem
                    title={t('settingsSuscripcion')}
                    subtitle={t('settingsSuscripcionDesc')}
                    icon="credit-card"
                    iconBgColor="#dcfce7"
                    iconColor="#22c55e"
                    onClick={() => setCurrentView('suscripcion')}
                    testId="settings-menu-suscripcion"
                />

                <SettingsMenuItem
                    title={t('settingsDatos')}
                    subtitle={t('settingsDatosDesc')}
                    icon="book-open"
                    iconBgColor="#fef3c7"
                    iconColor="#f59e0b"
                    onClick={() => setCurrentView('datos')}
                    testId="settings-menu-datos"
                />

                <SettingsMenuItem
                    title={t('settingsGrupos')}
                    subtitle={t('featureComingSoon')}
                    icon="users"
                    iconBgColor="#dbeafe"
                    iconColor="#3b82f6"
                    onClick={() => setCurrentView('grupos')}
                    testId="settings-menu-grupos"
                />

                <SettingsMenuItem
                    title={t('settingsApp')}
                    subtitle={t('settingsAppDesc')}
                    icon="smartphone"
                    iconBgColor="#f3e8ff"
                    iconColor="#a855f7"
                    onClick={() => setCurrentView('app')}
                    testId="settings-menu-app"
                />

                <SettingsMenuItem
                    title={t('settingsCuenta')}
                    subtitle={t('settingsCuentaDesc')}
                    icon="database"
                    iconBgColor="#fce7f3"
                    iconColor="#ec4899"
                    onClick={() => setCurrentView('cuenta')}
                    testId="settings-menu-cuenta"
                />

                {/* Divider before sign out */}
                <div
                    className="h-px mx-2 my-1"
                    style={{ backgroundColor: 'var(--border-light)' }}
                />

                {/* Sign Out - Always visible at bottom of settings */}
                <SettingsMenuItem
                    title={t('signout')}
                    subtitle={t('signOutDesc')}
                    icon="log-out"
                    iconBgColor="#fee2e2"
                    iconColor="#ef4444"
                    onClick={() => {
                        openModal('signOut', {
                            onConfirm: () => {
                                closeModal();
                                effectiveAccount.signOut();
                            },
                            onCancel: closeModal,
                            t,
                            lang: preferences.lang as 'en' | 'es',
                        });
                    }}
                    testId="settings-menu-signout"
                />
            </div>
        );
    }

    // === Render Active Sub-View ===
    return <div className="pb-4">{renderSubView()}</div>;
};

export default SettingsView;
