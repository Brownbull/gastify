import { useMemo } from "react";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { Modal } from "@design-system/atoms/Modal";
import {
  RUBROS,
  GIROS,
  FAMILIAS,
  CATEGORIAS,
  getCategoryToken,
  type CategoryToken,
} from "@lib/categoryTokens";

/**
 * GroupedCategoryPicker — full-screen grouped category picker (DM-4 / DM-10).
 * Presents the taxonomy GROUPED so the user picks a leaf in context:
 *   - mode "establishment": L1 Rubro group headers, each followed by a
 *     flex-wrap of its L2 Giro tiles (giro.parent === rubro.id). Selecting a
 *     giro commits its L2 id.
 *   - mode "item": L3 Familia group headers, each followed by a flex-wrap of
 *     its L4 Categoría tiles (cat.parent === familia.id). Selecting commits the
 *     L4 id.
 *
 * Each child tile is a CategoryChip-style tinted pill (tint via inline style,
 * the documented data exception). The currently-selected tile is ring-marked
 * with the strong ink border + hard shadow; the rest carry the light border.
 * Selecting a tile calls onSelect(id) then onClose().
 */
export interface GroupedCategoryPickerProps {
  open: boolean;
  onClose: () => void;
  mode: "establishment" | "item";
  selectedId: string;
  onSelect: (id: string) => void;
}

interface CategoryGroup {
  header: CategoryToken;
  children: CategoryToken[];
}

const MODE_TITLE: Record<GroupedCategoryPickerProps["mode"], string> = {
  establishment: "Categoría del comercio",
  item: "Categoría del ítem",
};

function buildGroups(parents: CategoryToken[], children: CategoryToken[]): CategoryGroup[] {
  return parents.map((header) => ({
    header,
    children: children.filter((child) => child.parent === header.id),
  }));
}

function ChildTile({
  token,
  selected,
  onClick,
}: {
  token: CategoryToken;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      title={token.label}
      style={{ backgroundColor: token.tint }}
      className={`inline-flex max-w-full items-center gap-gt-6 overflow-hidden rounded-gt-pill border-2 px-gt-10 py-gt-6 transition duration-150 ease-gt-bounce hover:-translate-y-0.5 ${
        selected ? "border-gt-line-strong shadow-gt-sm" : "border-gt-line"
      }`}
    >
      <PixelIcon name={token.icon} size={22} />
      <span className="truncate font-gt-display text-xs font-extrabold text-gt-ink">{token.label}</span>
    </button>
  );
}

function GroupBlock({
  group,
  selectedId,
  onPick,
}: {
  group: CategoryGroup;
  selectedId: string;
  onPick: (id: string) => void;
}) {
  return (
    <section className="flex flex-col gap-gt-8">
      <header className="flex items-center gap-gt-8">
        <PixelIcon name={group.header.icon} size={24} />
        <h4 className="font-gt-display text-gt-md font-extrabold text-gt-ink">{group.header.label}</h4>
      </header>
      <div className="flex flex-wrap gap-gt-8">
        {group.children.map((child) => (
          <ChildTile
            key={child.id}
            token={child}
            selected={child.id === selectedId}
            onClick={() => onPick(child.id)}
          />
        ))}
      </div>
    </section>
  );
}

export function GroupedCategoryPicker({
  open,
  onClose,
  mode,
  selectedId,
  onSelect,
}: GroupedCategoryPickerProps) {
  const groups = useMemo<CategoryGroup[]>(
    () =>
      mode === "establishment"
        ? buildGroups(RUBROS, GIROS)
        : buildGroups(FAMILIAS, CATEGORIAS),
    [mode],
  );

  const pick = (id: string) => {
    // resolve through getCategoryToken so an unknown id still commits a valid leaf.
    onSelect(getCategoryToken(id).id);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={MODE_TITLE[mode]}>
      <div className="flex max-h-[420px] flex-col gap-gt-16 overflow-y-auto">
        {groups.map((group) => (
          <GroupBlock key={group.header.id} group={group} selectedId={selectedId} onPick={pick} />
        ))}
      </div>
    </Modal>
  );
}
