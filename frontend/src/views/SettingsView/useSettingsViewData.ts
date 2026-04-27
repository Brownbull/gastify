/**
 * useSettingsViewData Deep Re-export Shim
 * Story 15b-1j: Backward compatibility for test mock paths
 *
 * Test mocks target this path: vi.mock('@/views/SettingsView/useSettingsViewData')
 * Canonical location: src/features/settings/views/SettingsView/useSettingsViewData.ts
 */

export { useSettingsViewData } from '@features/settings/views/SettingsView/useSettingsViewData';
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
} from '@features/settings/views/SettingsView/useSettingsViewData';
