import { type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ChevronLeftIcon } from "@/components/shell/icons";
import { Badge } from "@/components/ui/Badge";
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

/** uppercase micro-heading over a settings group (design-lab SettingsGroupHeading). */
export function SettingsGroupHeading({ children }: { children: ReactNode }) {
  return (
    <p className="px-gt-2 pt-gt-8 font-gt-display text-gt-sm font-extrabold uppercase tracking-wide text-gt-ink-3">
      {children}
    </p>
  );
}

/**
 * A labelled control field (label + optional hint above the control). `comingSoon`
 * adds a "Próximamente" badge by the label for unbuilt features rendered as
 * placeholders (D101).
 */
export function SettingsField({
  label,
  hint,
  comingSoon = false,
  children,
}: {
  label: string;
  hint?: string;
  comingSoon?: boolean;
  children: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-gt-6">
      <span className="flex flex-col gap-gt-2">
        <span className="flex items-center gap-gt-8">
          <span className="font-gt-display text-gt-sm font-bold text-gt-ink-2">{label}</span>
          {comingSoon ? (
            <Badge tone="neutral" className="shrink-0 py-0! text-gt-xs">
              {t("settings.comingSoon")}
            </Badge>
          ) : null}
        </span>
        {hint ? <span className="text-gt-xs font-medium text-gt-ink-3">{hint}</span> : null}
      </span>
      {children}
    </div>
  );
}
