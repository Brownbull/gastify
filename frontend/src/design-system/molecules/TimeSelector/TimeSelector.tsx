interface Period {
  readonly id: string;
  readonly label: string;
}

interface TimeSelectorProps {
  activePeriod: string;
  periods: readonly Period[];
  onPeriodChange: (id: string) => void;
  className?: string;
}

export function TimeSelector({ activePeriod, periods, onPeriodChange, className = '' }: TimeSelectorProps) {
  return (
    <div
      className={['flex items-center gap-1.5 p-1 rounded-xl', className].filter(Boolean).join(' ')}
      style={{ backgroundColor: 'var(--surface)' }}
      role="tablist"
      aria-label="Selector de periodo"
    >
      {periods.map((period) => {
        const isActive = period.id === activePeriod;
        return (
          <button
            key={period.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap"
            style={
              isActive
                ? { backgroundColor: 'var(--primary)', color: '#ffffff' }
                : { backgroundColor: 'transparent', color: 'var(--text-secondary)' }
            }
            onClick={() => onPeriodChange(period.id)}
          >
            {period.label}
          </button>
        );
      })}
    </div>
  );
}
