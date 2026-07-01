import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { GroupAvatar, DEFAULT_GROUP_COLOR } from "@/components/GroupAvatar";
import { useGroups } from "@/hooks/useGroups";
import { useI18n } from "@/hooks/useI18n";
import { useUiStore } from "@/stores/uiStore";

/**
 * Global personal↔group scope switcher (D70), rendered AS the app wordmark/logo
 * (top-left). In personal scope it shows the "gastify" wordmark; inside a group
 * it shows the group's name in the group's color (+ its avatar). Clicking it opens
 * the scope dropdown (Personal + your groups + Manage). Picking a group re-points
 * every scope-aware view at it; "Personal" returns to the caller's own scope. If
 * the active group disappears from the user's list it silently falls back to
 * personal so the app never queries a group it can't read.
 *
 * Lives in the SideNav header (desktop; `collapsed` → a compact "g" / avatar mark)
 * and the AppHeader brand slot (mobile).
 */
export function GroupSwitcher({ collapsed = false }: { collapsed?: boolean }) {
  const { t } = useI18n();
  const activeScope = useUiStore((s) => s.activeScope);
  const setActiveScope = useUiStore((s) => s.setActiveScope);
  const { data: groups } = useGroups();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reconcile a stale active group against the live membership list.
  useEffect(() => {
    if (activeScope.kind !== "group" || !groups) return;
    if (!groups.some((g) => g.id === activeScope.id)) {
      setActiveScope({ kind: "personal" });
    }
  }, [activeScope, groups, setActiveScope]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    function onClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const activeGroup =
    activeScope.kind === "group" ? groups?.find((g) => g.id === activeScope.id) : undefined;
  const inGroup = activeScope.kind === "group";
  const groupName = activeGroup?.name ?? (activeScope.kind === "group" ? activeScope.name : "");
  // In group scope the logo adopts the group's color (falling back to the same
  // slate the GroupAvatar uses), so "you're in a group" reads at a glance.
  const groupColor = activeGroup?.color ?? DEFAULT_GROUP_COLOR;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        data-testid="group-switcher"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("group.switcher")}
        title={inGroup ? groupName : "gastify"}
        className={`flex items-center gap-gt-6 rounded-gt-lg transition hover:opacity-80 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gt-primary/25 ${
          collapsed ? "justify-center" : ""
        }`}
      >
        {collapsed ? (
          inGroup ? (
            <GroupAvatar icon={activeGroup?.icon} color={groupColor} size={30} />
          ) : (
            <span className="grid h-8 w-8 place-items-center rounded-gt-md border-2 border-gt-line-strong bg-gt-primary font-gt-display text-gt-md font-extrabold leading-none text-white">
              g
            </span>
          )
        ) : (
          <>
            {inGroup ? (
              <>
                <GroupAvatar icon={activeGroup?.icon} color={groupColor} size={24} />
                <span
                  className="max-w-34 truncate font-gt-display text-gt-2xl font-extrabold leading-none"
                  style={{ color: groupColor }}
                >
                  {groupName}
                </span>
              </>
            ) : (
              <span className="font-gt-display text-gt-2xl font-extrabold leading-none text-gt-primary">gastify</span>
            )}
            <span aria-hidden className="text-gt-sm font-bold text-gt-ink-3">
              ▾
            </span>
          </>
        )}
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 top-full z-40 mt-gt-6 w-64 overflow-hidden rounded-gt-xl border-2 border-gt-line-strong bg-gt-surface shadow-gt-md"
        >
          <ScopeOption
            label={t("group.personal")}
            icon="👤"
            selected={activeScope.kind === "personal"}
            onSelect={() => {
              setActiveScope({ kind: "personal" });
              setOpen(false);
            }}
          />
          {groups && groups.length > 0 && (
            <p className="px-gt-10 pb-gt-2 pt-gt-6 text-gt-xs font-extrabold uppercase tracking-wide text-gt-ink-3">
              {t("group.myGroups")}
            </p>
          )}
          {groups?.map((group) => (
            <ScopeOption
              key={group.id}
              label={group.name}
              icon={<GroupAvatar icon={group.icon} color={group.color} size={20} />}
              meta={`${group.member_count} ${t("group.members")}`}
              selected={activeScope.kind === "group" && activeScope.id === group.id}
              onSelect={() => {
                setActiveScope({ kind: "group", id: group.id, name: group.name });
                setOpen(false);
              }}
            />
          ))}
          <Link
            to="/groups"
            onClick={() => setOpen(false)}
            className="block border-t-2 border-gt-line px-gt-10 py-gt-6 text-gt-sm font-extrabold text-gt-primary"
          >
            {t("group.manage")}
          </Link>
        </div>
      )}
    </div>
  );
}

interface ScopeOptionProps {
  label: string;
  icon: ReactNode;
  meta?: string;
  selected: boolean;
  onSelect: () => void;
}

function ScopeOption({ label, icon, meta, selected, onSelect }: ScopeOptionProps) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onSelect}
      className={`flex w-full items-center justify-between gap-gt-6 px-gt-10 py-gt-6 text-left text-gt-sm font-bold transition ${
        selected ? "bg-gt-primary-soft text-gt-primary" : "text-gt-ink-2 hover:bg-gt-bg-3"
      }`}
    >
      <span className="flex min-w-0 items-center gap-gt-6">
        <span aria-hidden>{icon}</span>
        <span className="truncate">{label}</span>
      </span>
      {meta && (
        <span aria-hidden className="shrink-0 text-gt-xs font-bold text-gt-ink-3">
          {meta}
        </span>
      )}
    </button>
  );
}
