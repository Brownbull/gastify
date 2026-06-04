/**
 * Group avatar (D75) — an emoji icon on an accent-colored disc. Used in the scope
 * switcher, the groups list, and the group detail header so a group is
 * recognizable at a glance. Falls back to the default house + neutral accent when
 * a group has no custom avatar yet.
 */

export const DEFAULT_GROUP_ICON = "🏠";
export const DEFAULT_GROUP_COLOR = "#64748b";

// Curated pickers — kept small so the chooser stays a one-tap grid on mobile.
export const GROUP_ICON_CHOICES = [
  "🏠",
  "🧑‍🤝‍🧑",
  "🛒",
  "🍔",
  "✈️",
  "🏖️",
  "🎁",
  "💼",
  "🚗",
  "⚽",
  "🎉",
  "❤️",
] as const;

export const GROUP_COLOR_CHOICES = [
  "#4f46e5",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#8b5cf6",
  "#64748b",
] as const;

interface GroupAvatarProps {
  icon?: string | null;
  color?: string | null;
  size?: number;
  className?: string;
}

export function GroupAvatar({ icon, color, size = 28, className }: GroupAvatarProps) {
  return (
    <span
      aria-hidden
      data-testid="group-avatar"
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: "9999px",
        backgroundColor: color ?? DEFAULT_GROUP_COLOR,
        fontSize: Math.round(size * 0.56),
        lineHeight: 1,
        flexShrink: 0,
      }}
    >
      {icon || DEFAULT_GROUP_ICON}
    </span>
  );
}
