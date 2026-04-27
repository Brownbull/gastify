/**
 * PreferenciasView Sub-View
 * Story 14.22 AC #5: Language, currency, date format, theme settings
 * Story 14.37: Font size scaling option added
 *
 * Redesigned to match mockup with custom dropdown selects
 */

import React from 'react';
import { SettingsSelect, SelectOption } from '../SettingsSelect';

interface PreferenciasViewProps {
    t: (key: string) => string;
    theme: string;
    lang: string;
    currency: string;
    dateFormat: string;
    colorTheme?: string;
    fontColorMode?: string;
    fontFamily?: string;
    fontSize?: string;
    onSetLang: (lang: string) => void;
    onSetCurrency: (currency: string) => void;
    onSetDateFormat: (format: string) => void;
    onSetTheme: (theme: string) => void;
    onSetColorTheme?: (colorTheme: string) => void;
    onSetFontColorMode?: (mode: string) => void;
    onSetFontFamily?: (family: string) => void;
    onSetFontSize?: (size: string) => void;
}

export const PreferenciasView: React.FC<PreferenciasViewProps> = ({
    t,
    theme,
    lang,
    dateFormat,
    colorTheme = 'normal',
    fontColorMode = 'colorful',
    fontFamily = 'outfit',
    fontSize = 'small',
    onSetLang,
    onSetDateFormat,
    onSetTheme,
    onSetColorTheme,
    onSetFontColorMode,
    onSetFontFamily,
    onSetFontSize,
}) => {
    // Language options
    const languageOptions: SelectOption[] = [
        { value: 'en', label: 'English' },
        { value: 'es', label: 'Español' },
    ];

    // Date format options
    const dateFormatOptions: SelectOption[] = [
        { value: 'LatAm', label: 'DD/MM/AAAA' },
        { value: 'US', label: 'MM/DD/AAAA' },
    ];

    // Theme mode options (light/dark)
    const modeOptions: SelectOption[] = [
        { value: 'light', label: lang === 'es' ? 'Claro' : 'Light' },
        { value: 'dark', label: lang === 'es' ? 'Oscuro' : 'Dark' },
    ];

    // Color palette options
    const colorPaletteOptions: SelectOption[] = [
        { value: 'professional', label: lang === 'es' ? 'Profesional' : 'Professional Blue' },
        { value: 'normal', label: 'Normal' },
        { value: 'mono', label: lang === 'es' ? 'Monocromo' : 'Monochrome' },
    ];

    // Font color mode options
    const fontColorOptions: SelectOption[] = [
        { value: 'colorful', label: lang === 'es' ? 'Colorido' : 'Colorful' },
        { value: 'plain', label: lang === 'es' ? 'Simple' : 'Plain' },
    ];

    // Font family options
    const fontFamilyOptions: SelectOption[] = [
        { value: 'outfit', label: 'Outfit' },
        { value: 'space', label: 'Space Grotesk' },
    ];

    // Story 14.37: Font size options
    const fontSizeOptions: SelectOption[] = [
        { value: 'normal', label: 'Normal' },
        { value: 'small', label: lang === 'es' ? 'Pequeño' : 'Small' },
    ];

    return (
        <div className="flex flex-col gap-3">
            {/* Language */}
            <SettingsSelect
                label={t('language')}
                value={lang}
                options={languageOptions}
                onChange={onSetLang}
                aria-label={t('language')}
            />

            {/* Date Format */}
            <SettingsSelect
                label={t('dateFormat')}
                value={dateFormat}
                options={dateFormatOptions}
                onChange={onSetDateFormat}
                aria-label={t('dateFormat')}
            />

            {/* Theme Mode (Light/Dark) */}
            <SettingsSelect
                label={lang === 'es' ? 'Modo' : 'Mode'}
                value={theme}
                options={modeOptions}
                onChange={onSetTheme}
                aria-label={t('theme')}
            />

            {/* Color Palette */}
            {onSetColorTheme && (
                <SettingsSelect
                    label={lang === 'es' ? 'Paleta de Color' : 'Color Palette'}
                    value={colorTheme}
                    options={colorPaletteOptions}
                    onChange={onSetColorTheme}
                    aria-label={t('colorTheme')}
                />
            )}

            {/* Font Color Mode */}
            {onSetFontColorMode && (
                <SettingsSelect
                    label={t('fontColorMode')}
                    value={fontColorMode}
                    options={fontColorOptions}
                    onChange={onSetFontColorMode}
                    aria-label={t('fontColorMode')}
                />
            )}

            {/* Typography / Font Family */}
            {onSetFontFamily && (
                <SettingsSelect
                    label={lang === 'es' ? 'Tipografía' : 'Typography'}
                    value={fontFamily}
                    options={fontFamilyOptions}
                    onChange={onSetFontFamily}
                    aria-label={lang === 'es' ? 'Tipografía' : 'Typography'}
                />
            )}

            {/* Story 14.37: Font Size - dropUp to avoid going off screen at bottom */}
            {onSetFontSize && (
                <SettingsSelect
                    label={lang === 'es' ? 'Tamaño de Fuente' : 'Font Size'}
                    value={fontSize}
                    options={fontSizeOptions}
                    onChange={onSetFontSize}
                    aria-label={lang === 'es' ? 'Tamaño de Fuente' : 'Font Size'}
                    dropUp
                />
            )}
        </div>
    );
};
