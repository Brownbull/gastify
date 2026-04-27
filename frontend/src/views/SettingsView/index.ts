/**
 * SettingsView Re-export Shim
 * Story 15b-1j: Backward compatibility for src/views/SettingsView consumers
 *
 * Consumers: App.tsx, viewRenderers.tsx, viewRenderers.test.tsx
 * Canonical location: src/features/settings/views/SettingsView/
 */

export { SettingsView, default } from '@features/settings/views/SettingsView';
export type { SettingsViewProps, SettingsViewTestOverrides } from '@features/settings/views/SettingsView';

export { useSettingsViewData } from '@features/settings/views/SettingsView';
export type {
    UseSettingsViewDataReturn,
    SettingsViewData,
    ProfileData,
    PreferencesData,
    ThemeData,
    SubscriptionData,
    MappingsData,
    NavigationData,
    AccountActions,
    MappingOperations,
    TrustedMerchantOperations,
} from '@features/settings/views/SettingsView';
