import React, { useState, useRef, useEffect } from 'react';
import { Calendar, Clock } from 'lucide-react';

interface DateTimeTagProps {
    date: string;
    time?: string;
    onDateChange: (date: string) => void;
    onTimeChange: (time: string) => void;
    t?: (key: string) => string;
    /** Story 14.41: Disable the date/time selectors in read-only mode */
    disabled?: boolean;
}

/**
 * Date and Time selection component with dropdown panels
 * Story 14.14b Session 4: Updated to match scan-overlay mockup with floating labels
 *
 * - Shows clickable tags for date and time
 * - Opens dropdown panels with floating label inputs
 */
export const DateTimeTag: React.FC<DateTimeTagProps> = ({
    date,
    time = '',
    onDateChange,
    onTimeChange,
    t,
    disabled = false,
}) => {
    const [isDateOpen, setIsDateOpen] = useState(false);
    const [isTimeOpen, setIsTimeOpen] = useState(false);
    const dateRef = useRef<HTMLDivElement>(null);
    const timeRef = useRef<HTMLDivElement>(null);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dateRef.current && !dateRef.current.contains(e.target as Node)) {
                setIsDateOpen(false);
            }
            if (timeRef.current && !timeRef.current.contains(e.target as Node)) {
                setIsTimeOpen(false);
            }
        };
        if (isDateOpen || isTimeOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isDateOpen, isTimeOpen]);

    // Format date for display (e.g., "23 Dic")
    const formatDisplayDate = (dateStr: string) => {
        if (!dateStr) return t ? t('selectDate') : 'Seleccionar fecha';
        try {
            const d = new Date(dateStr + 'T00:00:00');
            const day = d.getDate();
            const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
            return `${day} ${months[d.getMonth()]}`;
        } catch {
            return dateStr;
        }
    };

    // Format time for display (e.g., "14:30")
    const formatDisplayTime = (timeStr: string) => {
        return timeStr || (t ? t('selectTime') : '--:--');
    };

    const inputStyle: React.CSSProperties = {
        backgroundColor: 'var(--bg-secondary)',
        borderColor: 'var(--border-medium)',
        color: 'var(--text-primary)',
    };

    return (
        <div className="flex items-center gap-2 flex-wrap">
            {/* Date Tag */}
            {/* Story 14.41: Disabled state for read-only mode */}
            <div className="relative" ref={dateRef}>
                <button
                    type="button"
                    onClick={() => !disabled && (setIsDateOpen(!isDateOpen), setIsTimeOpen(false))}
                    disabled={disabled}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs transition-colors"
                    style={{
                        backgroundColor: 'var(--bg-primary)',
                        border: '1px solid var(--border-medium)',
                        color: 'var(--text-secondary)',
                        opacity: disabled ? 0.7 : 1,
                        cursor: disabled ? 'default' : 'pointer',
                    }}
                    aria-expanded={isDateOpen}
                    aria-haspopup="true"
                >
                    <Calendar size={12} />
                    <span>{formatDisplayDate(date)}</span>
                </button>

                {isDateOpen && (
                    <div
                        className="absolute top-full left-0 mt-2 min-w-[200px] rounded-xl overflow-hidden z-50"
                        style={{
                            backgroundColor: 'var(--bg-secondary, #ffffff)',
                            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',
                            border: '1px solid var(--border-light, #e2e8f0)',
                        }}
                    >
                        <div className="p-3 space-y-3">
                            <div className="relative">
                                <label
                                    className="absolute -top-2 left-2.5 px-1 text-xs font-medium z-10"
                                    style={{
                                        backgroundColor: 'var(--bg-secondary, #ffffff)',
                                        color: 'var(--primary, #2563eb)',
                                    }}
                                >
                                    {t ? t('selectDate') : 'Seleccionar fecha'}
                                </label>
                                <input
                                    type="date"
                                    className="w-full h-10 px-3 border rounded-lg text-sm"
                                    style={inputStyle}
                                    value={date}
                                    onChange={e => onDateChange(e.target.value)}
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsDateOpen(false)}
                                className="w-full py-2 rounded-lg text-sm font-medium transition-colors"
                                style={{
                                    backgroundColor: 'var(--primary-light, #dbeafe)',
                                    color: 'var(--primary, #2563eb)',
                                }}
                            >
                                {t ? t('confirm') : 'Confirmar'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Time Tag */}
            {/* Story 14.41: Disabled state for read-only mode */}
            <div className="relative" ref={timeRef}>
                <button
                    type="button"
                    onClick={() => !disabled && (setIsTimeOpen(!isTimeOpen), setIsDateOpen(false))}
                    disabled={disabled}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs transition-colors"
                    style={{
                        backgroundColor: 'var(--bg-primary)',
                        border: '1px solid var(--border-medium)',
                        color: 'var(--text-secondary)',
                        opacity: disabled ? 0.7 : 1,
                        cursor: disabled ? 'default' : 'pointer',
                    }}
                    aria-expanded={isTimeOpen}
                    aria-haspopup="true"
                >
                    <Clock size={12} />
                    <span>{formatDisplayTime(time)}</span>
                </button>

                {isTimeOpen && (
                    <div
                        className="absolute top-full left-0 mt-2 min-w-[180px] rounded-xl overflow-hidden z-50"
                        style={{
                            backgroundColor: 'var(--bg-secondary, #ffffff)',
                            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',
                            border: '1px solid var(--border-light, #e2e8f0)',
                        }}
                    >
                        <div className="p-3 space-y-3">
                            <div className="relative">
                                <label
                                    className="absolute -top-2 left-2.5 px-1 text-xs font-medium z-10"
                                    style={{
                                        backgroundColor: 'var(--bg-secondary, #ffffff)',
                                        color: 'var(--primary, #2563eb)',
                                    }}
                                >
                                    {t ? t('selectTime') : 'Seleccionar hora'}
                                </label>
                                <input
                                    type="time"
                                    className="w-full h-10 px-3 border rounded-lg text-sm"
                                    style={inputStyle}
                                    value={time}
                                    onChange={e => onTimeChange(e.target.value)}
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsTimeOpen(false)}
                                className="w-full py-2 rounded-lg text-sm font-medium transition-colors"
                                style={{
                                    backgroundColor: 'var(--primary-light, #dbeafe)',
                                    color: 'var(--primary, #2563eb)',
                                }}
                            >
                                {t ? t('confirm') : 'Confirmar'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
