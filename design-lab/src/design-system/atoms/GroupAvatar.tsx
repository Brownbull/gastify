import { expandHex } from "@lib/hexColor";

/**
 * GroupAvatar — a group's identity tile: the user-chosen emoji on a soft tint of
 * the group's accent color, framed in the geometric grammar (2px ink border,
 * offset shadow). Mirrors the backend group avatar model (emoji icon + accent
 * hex, D75). The accent is inline-style (per-group hex, not a token).
 */
export interface GroupAvatarProps {
  /** emoji icon. */
  icon: string;
  /** accent hex, e.g. "#7B6EF6". */
  color: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const BOX: Record<NonNullable<GroupAvatarProps["size"]>, string> = {
  sm: "h-9 w-9 rounded-gt-lg",
  md: "h-12 w-12 rounded-gt-xl",
  lg: "h-16 w-16 rounded-gt-2xl",
};
const EMOJI_PX: Record<NonNullable<GroupAvatarProps["size"]>, number> = { sm: 18, md: 26, lg: 34 };

export function GroupAvatar({ icon, color, size = "md", className = "" }: GroupAvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center border-2 border-gt-line-strong shadow-gt-xs ${BOX[size]} ${className}`}
      style={{ backgroundColor: `${expandHex(color)}26` }}
    >
      <span style={{ fontSize: EMOJI_PX[size], lineHeight: 1 }}>{icon}</span>
    </span>
  );
}
