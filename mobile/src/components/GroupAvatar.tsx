import { StyleSheet, Text, View } from "react-native";

/**
 * Group avatar (D75) — an emoji icon on an accent-colored disc. Used in the scope
 * switcher, the groups list, and the group detail header so a group is
 * recognizable at a glance. Falls back to the default house + neutral accent when
 * a group has no custom avatar yet. RN parity of web `GroupAvatar`.
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
}

export function GroupAvatar({ icon, color, size = 28 }: GroupAvatarProps) {
  return (
    <View
      testID="group-avatar"
      style={[
        styles.disc,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color ?? DEFAULT_GROUP_COLOR,
        },
      ]}
    >
      <Text style={[styles.icon, { fontSize: Math.round(size * 0.56) }]}>
        {icon || DEFAULT_GROUP_ICON}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  disc: {
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    textAlign: "center",
  },
});
