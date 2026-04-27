/**
 * PerfilView Sub-View
 * Story 14.22 AC #4: Profile editing with avatar, name, email, phone
 *
 * Uses Tailwind UI input patterns:
 * - "Input with label" for name, email, birth date
 * - "Input with inline leading dropdown" for phone
 * - Phone + birth date on same row (responsive)
 */

import React, { useState, useEffect } from 'react';
import { Camera, Check, ChevronDown } from 'lucide-react';

/**
 * Google "G" Icon SVG Component
 * Multi-color Google logo for linked account display
 */
const GoogleIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24">
        <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
        />
        <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
        />
        <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
        />
        <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
        />
    </svg>
);

/**
 * Country code options with flags
 */
const COUNTRY_CODES = [
    { code: '+56', flag: '🇨🇱', label: 'CL' },
    { code: '+1', flag: '🇺🇸', label: 'US' },
    { code: '+34', flag: '🇪🇸', label: 'ES' },
    { code: '+52', flag: '🇲🇽', label: 'MX' },
    { code: '+54', flag: '🇦🇷', label: 'AR' },
    { code: '+55', flag: '🇧🇷', label: 'BR' },
    { code: '+57', flag: '🇨🇴', label: 'CO' },
    { code: '+51', flag: '🇵🇪', label: 'PE' },
];

interface PerfilViewProps {
    t: (key: string) => string;
    theme: string;
    displayName?: string;
    email?: string;
    phoneNumber?: string;
    birthDate?: string;
    onSetDisplayName?: (name: string) => void;
    onSetPhoneNumber?: (phone: string) => void;
    onSetBirthDate?: (date: string) => void;
    onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const PerfilView: React.FC<PerfilViewProps> = ({
    t,
    theme,
    displayName = '',
    email = '',
    phoneNumber = '',
    birthDate = '',
    onSetDisplayName,
    onSetPhoneNumber,
    onSetBirthDate,
    onShowToast,
}) => {
    const isDark = theme === 'dark';

    // Local state for form fields
    const [localName, setLocalName] = useState(displayName);
    const [localPhone, setLocalPhone] = useState(phoneNumber);
    const [localBirthDate, setLocalBirthDate] = useState(birthDate);
    const [countryCode, setCountryCode] = useState('+56');
    const [hasChanges, setHasChanges] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Sync with props when they change
    useEffect(() => {
        setLocalName(displayName);
    }, [displayName]);

    useEffect(() => {
        setLocalPhone(phoneNumber);
    }, [phoneNumber]);

    useEffect(() => {
        setLocalBirthDate(birthDate);
    }, [birthDate]);

    // Track changes
    useEffect(() => {
        const nameChanged = localName !== displayName;
        const phoneChanged = localPhone !== phoneNumber;
        const birthDateChanged = localBirthDate !== birthDate;
        setHasChanges(nameChanged || phoneChanged || birthDateChanged);
    }, [localName, localPhone, localBirthDate, displayName, phoneNumber, birthDate]);

    // Generate initials from name or email
    const getInitials = () => {
        if (localName) {
            const parts = localName.trim().split(' ');
            if (parts.length >= 2) {
                return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
            }
            return localName.slice(0, 2).toUpperCase();
        }
        if (email) {
            return email.slice(0, 2).toUpperCase();
        }
        return '??';
    };

    // Handle save all changes
    const handleSaveChanges = async () => {
        if (!hasChanges) return;

        setIsSaving(true);
        try {
            if (localName !== displayName && onSetDisplayName) {
                await onSetDisplayName(localName);
            }
            if (localPhone !== phoneNumber && onSetPhoneNumber) {
                await onSetPhoneNumber(localPhone);
            }
            if (localBirthDate !== birthDate && onSetBirthDate) {
                await onSetBirthDate(localBirthDate);
            }
            setHasChanges(false);
            if (onShowToast) {
                onShowToast(t('changesSaved'), 'success');
            }
        } catch (error) {
            console.error('Error saving profile:', error);
            if (onShowToast) {
                onShowToast(t('errorSavingChanges'), 'error');
            }
        } finally {
            setIsSaving(false);
        }
    };

    // Tailwind-style classes adapted for theme
    const labelClass = 'block text-sm font-medium mb-1.5';
    const inputClass = `block w-full rounded-lg px-3 py-2.5 text-sm outline outline-1 -outline-offset-1 focus:outline-2 focus:-outline-offset-2`;

    return (
        <div className="space-y-5">
            {/* Avatar section */}
            <div className="flex flex-col items-center py-4">
                <div className="relative">
                    <div
                        className="w-24 h-24 rounded-full flex items-center justify-center text-2xl font-bold"
                        style={{
                            backgroundColor: 'var(--primary-light)',
                            color: 'var(--primary)',
                        }}
                    >
                        {getInitials()}
                    </div>
                    <button
                        className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center"
                        style={{
                            backgroundColor: 'var(--primary)',
                            color: '#ffffff',
                        }}
                        aria-label={t('changeProfilePhoto')}
                    >
                        <Camera size={14} />
                    </button>
                </div>
            </div>

            {/* Form fields using Tailwind UI patterns */}
            <div className="space-y-4">
                {/* Name field - Input with label */}
                <div>
                    <label
                        htmlFor="profile-name"
                        className={labelClass}
                        style={{ color: 'var(--text-secondary)' }}
                    >
                        {t('fullName')}
                    </label>
                    <input
                        id="profile-name"
                        type="text"
                        value={localName}
                        onChange={(e) => setLocalName(e.target.value)}
                        placeholder={t('fullName')}
                        className={inputClass}
                        style={{
                            backgroundColor: isDark ? 'var(--bg-tertiary)' : '#ffffff',
                            color: 'var(--text-primary)',
                            outlineColor: 'var(--border-light)',
                        }}
                    />
                </div>

                {/* Email field - Input with label (read-only with Google icon) */}
                <div>
                    <label
                        htmlFor="profile-email"
                        className={labelClass}
                        style={{ color: 'var(--text-secondary)' }}
                    >
                        {t('email')}
                    </label>
                    <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2">
                            <GoogleIcon size={18} />
                        </div>
                        <input
                            id="profile-email"
                            type="email"
                            value={email}
                            readOnly
                            className={`${inputClass} pl-10 pr-20`}
                            style={{
                                backgroundColor: 'var(--bg-tertiary)',
                                color: 'var(--text-secondary)',
                                outlineColor: 'var(--border-light)',
                                cursor: 'not-allowed',
                            }}
                        />
                        <span
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium"
                            style={{ color: 'var(--text-tertiary)' }}
                        >
                            {t('linkedAccount')}
                        </span>
                    </div>
                </div>

                {/* Phone + Birth Date Row - Responsive */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Phone field - Input with inline leading dropdown */}
                    <div>
                        <label
                            htmlFor="profile-phone"
                            className={labelClass}
                            style={{ color: 'var(--text-secondary)' }}
                        >
                            {t('phone')}
                        </label>
                        <div
                            className="flex rounded-lg outline outline-1 -outline-offset-1 focus-within:outline-2 focus-within:-outline-offset-2"
                            style={{
                                backgroundColor: isDark ? 'var(--bg-tertiary)' : '#ffffff',
                                outlineColor: 'var(--border-light)',
                            }}
                        >
                            {/* Country code dropdown */}
                            <div className="relative shrink-0">
                                <select
                                    value={countryCode}
                                    onChange={(e) => setCountryCode(e.target.value)}
                                    className="h-full appearance-none rounded-l-lg py-2.5 pl-3 pr-7 text-sm focus:outline-none"
                                    style={{
                                        backgroundColor: 'transparent',
                                        color: 'var(--text-secondary)',
                                    }}
                                    aria-label="Country code"
                                >
                                    {COUNTRY_CODES.map((c) => (
                                        <option key={c.code} value={c.code}>
                                            {c.label} {c.code}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown
                                    size={14}
                                    className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2"
                                    style={{ color: 'var(--text-tertiary)' }}
                                />
                            </div>
                            {/* Phone input */}
                            <input
                                id="profile-phone"
                                type="tel"
                                value={localPhone}
                                onChange={(e) => setLocalPhone(e.target.value)}
                                placeholder="9 1234 5678"
                                className="min-w-0 grow py-2.5 pr-3 pl-1 text-sm focus:outline-none"
                                style={{
                                    backgroundColor: 'transparent',
                                    color: 'var(--text-primary)',
                                }}
                            />
                        </div>
                    </div>

                    {/* Birth date field - Input with label */}
                    <div>
                        <label
                            htmlFor="profile-birthdate"
                            className={labelClass}
                            style={{ color: 'var(--text-tertiary)' }}
                        >
                            {t('birthDate')} ({t('optional')})
                        </label>
                        <input
                            id="profile-birthdate"
                            type="date"
                            value={localBirthDate}
                            onChange={(e) => setLocalBirthDate(e.target.value)}
                            className={inputClass}
                            style={{
                                backgroundColor: isDark ? 'var(--bg-tertiary)' : '#ffffff',
                                color: localBirthDate ? 'var(--text-primary)' : 'var(--text-tertiary)',
                                outlineColor: 'var(--border-light)',
                                colorScheme: isDark ? 'dark' : 'light',
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Divider */}
            <div
                style={{
                    height: '1px',
                    backgroundColor: 'var(--border-light)',
                }}
            />

            {/* Linked Account Section */}
            <div>
                <label
                    className="block text-xs font-medium mb-3 uppercase tracking-wide"
                    style={{ color: 'var(--text-secondary)' }}
                >
                    {t('linkedAccountSection')}
                </label>
                <div
                    className="flex items-center gap-3 p-4 rounded-xl border"
                    style={{
                        backgroundColor: 'var(--bg-secondary)',
                        borderColor: 'var(--border-light)',
                    }}
                >
                    {/* Google icon in white box */}
                    <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{
                            backgroundColor: isDark ? 'var(--bg-tertiary)' : '#ffffff',
                            boxShadow: 'var(--shadow-sm)',
                        }}
                    >
                        <GoogleIcon size={20} />
                    </div>

                    {/* Account info */}
                    <div className="flex-1 min-w-0">
                        <div
                            className="font-medium text-sm"
                            style={{ color: 'var(--text-primary)' }}
                        >
                            Google
                        </div>
                        <div
                            className="text-xs truncate"
                            style={{ color: 'var(--text-secondary)' }}
                        >
                            {email}
                        </div>
                    </div>

                    {/* Connected badge */}
                    <div
                        className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium shrink-0"
                        style={{
                            backgroundColor: isDark
                                ? 'rgba(34, 197, 94, 0.2)'
                                : 'rgba(34, 197, 94, 0.1)',
                            color: 'var(--success, #22c55e)',
                        }}
                    >
                        <Check size={12} strokeWidth={3} />
                        {t('connected')}
                    </div>
                </div>
            </div>

            {/* Save Changes Button */}
            <button
                onClick={handleSaveChanges}
                disabled={!hasChanges || isSaving}
                className="w-full py-3.5 px-4 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all"
                style={{
                    backgroundColor: 'var(--primary)',
                    color: '#ffffff',
                    opacity: hasChanges && !isSaving ? 1 : 0.5,
                    cursor: hasChanges && !isSaving ? 'pointer' : 'not-allowed',
                }}
            >
                <Check size={18} />
                {isSaving ? t('saving') : t('saveChanges')}
            </button>
        </div>
    );
};
