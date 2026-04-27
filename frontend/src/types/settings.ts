export type Currency = 'CLP' | 'USD' | 'EUR';
export type Language = 'es' | 'en';
export type Theme = 'light' | 'dark';
// Story 7.12 AC#11: Color theme selector
// Story 7.17: Renamed themes - 'normal' (warm, was ghibli), 'professional' (cool)
// Story 14.12: Added 'mono' (monochrome) as new default
export type ColorTheme = 'normal' | 'professional' | 'mono';
// Story 14.21: Font color mode for category text
// 'colorful' = use fg colors from category palette (default)
// 'plain' = use standard text colors (black/white based on light/dark mode)
export type FontColorMode = 'colorful' | 'plain';
// Story 14.22: Font family selection
// 'outfit' = Outfit font (default, modern geometric sans)
// 'space' = Space Grotesk (alternative, technical feel)
export type FontFamily = 'outfit' | 'space';
// Story 14.37: Font size scaling
// 'small' = current app sizes (default for backwards compatibility)
// 'normal' = larger sizes for better readability
export type FontSize = 'small' | 'normal';

export interface AppSettings {
    lang: Language;
    currency: Currency;
    theme: Theme;
    colorTheme?: ColorTheme; // Story 7.12 AC#11
    fontColorMode?: FontColorMode; // Story 14.21
    fontFamily?: FontFamily; // Story 14.22
    fontSize?: FontSize; // Story 14.37
}

/**
 * Story 14.22: Settings sub-view navigation types
 * Defines the hierarchical menu structure for the redesigned Settings
 */
export type SettingsSubView =
    | 'main'           // Main menu with 9 items
    | 'limites'        // Limites de Gasto (placeholder for Epic 15)
    | 'perfil'         // Perfil - avatar, name, email, phone
    | 'preferencias'   // Preferencias - language, currency, date format, theme
    | 'escaneo'        // Escaneo - default scan currency and location
    | 'suscripcion'    // Suscripcion - plan and credits
    | 'datos'          // Datos Aprendidos - learned categories, merchants, subcategories
    | 'grupos'         // Grupos Personalizados - user-created groups with sharing (placeholder)
    | 'app'            // App - PWA installation, notifications
    | 'cuenta';        // Datos y Cuenta - export, wipe, sign out

/**
 * Story 14.22: Settings menu item configuration
 */
export interface SettingsMenuItemConfig {
    id: SettingsSubView;
    titleKey: string;      // Translation key for title
    subtitleKey: string;   // Translation key for subtitle
    icon: string;          // Lucide icon name
    iconBgColor: string;   // Background color for icon container
    iconColor: string;     // Icon stroke color
}
