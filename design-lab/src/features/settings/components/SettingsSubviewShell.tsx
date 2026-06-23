import { type ReactNode } from "react";
import { AppHeader } from "@design-system/organisms/Nav";

/**
 * SettingsSubviewShell — the shared chrome for every Ajustes subview: a `settings`
 * AppHeader (bare back arrow + title; onBack returns to the settings list) over a
 * scrolling 42rem-capped column. Mirrors SettingsScreen's own frame so all
 * subviews read identically.
 */
export function SettingsSubviewShell({ title, onBack, children }: { title: string; onBack?: () => void; children: ReactNode }) {
  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-gt-bg">
      <AppHeader variant="settings" title={title} onBack={onBack} />
      <div className="min-h-0 flex-1 overflow-y-auto px-gt-16 pb-gt-16">
        <div className="mx-auto flex w-full flex-col gap-gt-12 pt-gt-12" style={{ maxWidth: "42rem" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
