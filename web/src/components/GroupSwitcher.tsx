import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useGroups } from "@/hooks/useGroups";
import { useI18n } from "@/hooks/useI18n";
import { useUiStore } from "@/stores/uiStore";

/**
 * Global personal↔group scope switcher (D70). Picking a group re-points every
 * scope-aware view at it; "Personal" returns to the caller's own scope. If the
 * active group disappears from the user's list (e.g. they were removed), it
 * silently falls back to personal so the app never queries a group it can't read.
 */
export function GroupSwitcher() {
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

  const label =
    activeScope.kind === "group" ? activeScope.name : t("group.personal");

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        data-testid="group-switcher"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("group.switcher")}
        className="flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm"
        style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
      >
        <span className="flex min-w-0 items-center gap-2">
          <span aria-hidden>{activeScope.kind === "group" ? "🏠" : "👤"}</span>
          <span className="truncate font-medium">{label}</span>
        </span>
        <span aria-hidden style={{ color: "var(--text-muted)" }}>
          ▾
        </span>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 right-0 z-30 mt-1 overflow-hidden rounded-lg border shadow-lg"
          style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
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
            <p
              className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide"
              style={{ color: "var(--text-muted)" }}
            >
              {t("group.myGroups")}
            </p>
          )}
          {groups?.map((group) => (
            <ScopeOption
              key={group.id}
              label={group.name}
              icon="🏠"
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
            className="block border-t px-3 py-2 text-sm font-medium"
            style={{ borderColor: "var(--border)", color: "var(--primary)" }}
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
  icon: string;
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
      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-(--primary-light)"
      style={{
        color: selected ? "var(--primary)" : "var(--text-secondary)",
        backgroundColor: selected ? "var(--primary-light)" : undefined,
      }}
    >
      <span className="flex min-w-0 items-center gap-2">
        <span aria-hidden>{icon}</span>
        <span className="truncate">{label}</span>
      </span>
      {meta && (
        <span aria-hidden className="shrink-0 text-xs" style={{ color: "var(--text-muted)" }}>
          {meta}
        </span>
      )}
    </button>
  );
}
