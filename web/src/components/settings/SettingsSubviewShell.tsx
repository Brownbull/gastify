import { type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ChevronLeftIcon } from "@/components/shell/icons";
import { useI18n } from "@/hooks/useI18n";

/**
 * SettingsSubviewShell — shared chrome for every /settings/* subview: a bare
 * back arrow + title row (back returns to the settings hub) over a 42rem column.
 * Ports the design-lab SettingsSubviewShell so all subviews read identically.
 */
export function SettingsSubviewShell({ title, children }: { title: string; children: ReactNode }) {
  const navigate = useNavigate();
  const { t } = useI18n();
  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="flex items-center gap-gt-8 pb-gt-16">
        <button
          type="button"
          aria-label={t("common.back")}
          data-testid="settings-back"
          onClick={() => void navigate({ to: "/settings" })}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-gt-lg text-gt-ink transition hover:-translate-x-0.5"
        >
          <ChevronLeftIcon className="h-7 w-7" />
        </button>
        <h1 className="truncate font-gt-display text-gt-3xl font-extrabold leading-tight text-gt-ink">{title}</h1>
      </div>
      <div className="flex flex-col gap-gt-16">{children}</div>
    </div>
  );
}

/** a labelled control field (label + optional hint above the control). */
export function SettingsField({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-gt-6">
      <span className="flex flex-col gap-gt-2">
        <span className="font-gt-display text-gt-sm font-bold text-gt-ink-2">{label}</span>
        {hint ? <span className="text-gt-xs font-medium text-gt-ink-3">{hint}</span> : null}
      </span>
      {children}
    </div>
  );
}
