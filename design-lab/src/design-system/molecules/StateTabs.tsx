/**
 * Showcase state switcher — Playful Geometric: ink-bordered pill track, active
 * tab fills amber (the system's "selected" signal, matching nav + filter
 * chips). Sits ABOVE the AppSurface frame in stories so a single frame can flip
 * between screen states (suite convention; never stack frames per state).
 *
 * ARIA contract: pass `panelId` of the element the tabs control; that element
 * must carry `role="tabpanel"` and `aria-labelledby={stateTabId(panelId, active)}`.
 */
export interface StateTabsProps {
  tabs: string[];
  active: string;
  onChange: (tab: string) => void;
  /** id of the controlled tabpanel element. */
  panelId: string;
  className?: string;
}

const slug = (tab: string) => tab.toLowerCase().replace(/[^a-z0-9]+/g, "-");

/** id a tab button gets — use in the panel's aria-labelledby. */
export const stateTabId = (panelId: string, tab: string) => `${panelId}-tab-${slug(tab)}`;

export function StateTabs({ tabs, active, onChange, panelId, className = "" }: StateTabsProps) {
  return (
    <div
      role="tablist"
      className={`inline-flex gap-gt-4 rounded-gt-pill border-2 border-gt-line-strong bg-gt-surface p-gt-4 shadow-gt-sm ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = tab === active;
        return (
          <button
            key={tab}
            id={stateTabId(panelId, tab)}
            role="tab"
            type="button"
            aria-selected={isActive}
            aria-controls={panelId}
            onClick={() => onChange(tab)}
            className={`rounded-gt-pill px-gt-12 py-gt-4 text-gt-sm font-extrabold transition duration-150 ease-gt-bounce focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gt-primary/25 ${
              isActive
                ? "bg-gt-accent text-gt-ink shadow-gt-xs"
                : "text-gt-ink-2 hover:bg-gt-bg-3 hover:text-gt-ink"
            }`}
          >
            {tab}
          </button>
        );
      })}
    </div>
  );
}
