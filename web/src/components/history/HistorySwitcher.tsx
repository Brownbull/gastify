import { Link } from "@tanstack/react-router";
import { PixelIcon } from "@/components/shell/PixelIcon";
import { useI18n } from "@/hooks/useI18n";
import { HISTORY_SUB_META, type HistorySub } from "@/lib/historySubs";

/**
 * HistorySwitcher — the Historial hub's subsection switcher (Transacciones ·
 * Productos · Reportes), a row of bordered icon buttons that drive ?sub=. Ports
 * design-lab HeaderAction. Rendered in the mobile shell header (next to the
 * profile) and in the hub's desktop page-header.
 */
export function HistorySwitcher({ active }: { active: HistorySub }) {
  const { t } = useI18n();
  return (
    <span className="flex items-center gap-gt-6" data-testid="history-switcher">
      {HISTORY_SUB_META.map((s) => {
        const isActive = s.id === active;
        return (
          <Link
            key={s.id}
            to="/items"
            search={{ sub: s.id }}
            aria-label={t(s.labelKey)}
            aria-pressed={isActive}
            data-testid={`history-sub-${s.id}`}
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-gt-md border-2 transition duration-150 ease-gt-bounce focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gt-primary/30 ${
              isActive
                ? "border-gt-line-strong bg-gt-primary text-white shadow-gt-sm"
                : "border-gt-line bg-gt-surface hover:-translate-y-0.5 hover:border-gt-line-strong hover:shadow-gt-xs"
            }`}
          >
            <PixelIcon name={s.icon} size={28} />
          </Link>
        );
      })}
    </span>
  );
}
