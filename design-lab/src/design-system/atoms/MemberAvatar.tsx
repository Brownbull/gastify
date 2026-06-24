import { readableTextColor } from "@lib/hexColor";

/**
 * MemberAvatar — a person's initials on their accent color, in a round ink-
 * bordered chip (matches Nav's ProfileButton geometry). Self-contained initials
 * so it stays a dumb design-system atom; the per-member color is inline-style.
 * The initials use ink or white (whichever meets WCAG contrast on the accent) —
 * white fails AA on light accents like amber/emerald.
 */
export interface MemberAvatarProps {
  /** full display name (initials are derived) — also the tooltip. */
  name: string;
  /** accent hex, e.g. "#EC4899". */
  color: string;
  size?: "sm" | "md" | "lg";
  /** show a thin surface ring (for overlapping clusters). */
  ring?: boolean;
  className?: string;
}

const BOX: Record<NonNullable<MemberAvatarProps["size"]>, string> = {
  sm: "h-7 w-7",
  md: "h-9 w-9",
  lg: "h-11 w-11",
};
const TEXT_PX: Record<NonNullable<MemberAvatarProps["size"]>, number> = { sm: 11, md: 13, lg: 15 };

/** "Camila Rojas" → "CR"; "Tú" → "TÚ"; single word → first two letters. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}

export function MemberAvatar({ name, color, size = "sm", ring = false, className = "" }: MemberAvatarProps) {
  return (
    <span
      title={name}
      className={`grid shrink-0 place-items-center rounded-gt-pill border-2 border-gt-line-strong font-gt-display font-extrabold leading-none shadow-gt-xs ${BOX[size]} ${ring ? "ring-2 ring-gt-surface" : ""} ${className}`}
      style={{ backgroundColor: color, color: readableTextColor(color), fontSize: TEXT_PX[size] }}
    >
      {initials(name)}
    </span>
  );
}
