import * as React from 'react';

type TabsVariant = 'pill' | 'flat';

interface Tab {
  id: string;
  label: string;
}

interface StateTabsProps {
  tabs: readonly Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  variant?: TabsVariant;
  className?: string;
}

export function StateTabs({ tabs, activeTab, onTabChange, variant = 'pill', className = '' }: StateTabsProps) {
  return (
    <div
      role="tablist"
      className={[
        'inline-flex items-center gap-1 p-1 rounded-xl',
        variant === 'pill' ? '' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={variant === 'pill' ? { backgroundColor: 'var(--surface-elevated)' } : undefined}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={isActive}
            onClick={() => onTabChange(tab.id)}
            className={[
              'px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200',
              variant === 'flat' ? 'border-b-2' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={{
              backgroundColor: variant === 'pill' && isActive ? 'var(--primary)' : 'transparent',
              color: isActive
                ? variant === 'pill' ? '#ffffff' : 'var(--primary)'
                : 'var(--text-tertiary)',
              borderColor: variant === 'flat' && isActive ? 'var(--primary)' : 'transparent',
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export function useStateTabs(tabs: readonly Tab[], defaultTab?: string) {
  const [activeTab, setActiveTab] = React.useState(defaultTab ?? tabs[0]?.id ?? '');
  return { activeTab, onTabChange: setActiveTab };
}
