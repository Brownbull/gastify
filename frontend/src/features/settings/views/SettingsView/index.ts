/**
 * SettingsView Module
 * Story 14e-25c.1: SettingsView owns data via useSettingsViewData
 *
 * Re-exports the component and hook for external use.
 */

export { SettingsView, default } from './SettingsView';
export type { SettingsViewProps, SettingsViewTestOverrides } from './SettingsView';

export { useSettingsViewData } from './useSettingsViewData';
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
} from './useSettingsViewData';
