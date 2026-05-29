import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ItemFlagKind, TransactionDetail } from "../lib/transactions";

type Item = TransactionDetail["items"][number];

const FLAG_OPTIONS: { kind: ItemFlagKind; label: string }[] = [
  { kind: "urgency", label: "Urgency" },
  { kind: "special_case", label: "Special-case" },
];

export function ItemFlagChips({
  item,
  disabled,
  onToggleFlag,
}: {
  item: Item;
  disabled: boolean;
  onToggleFlag: (item: Item, kind: ItemFlagKind) => void;
}) {
  const flags = item.flags ?? [];

  return (
    <View style={styles.row} testID={`item-flag-chips-${item.id}`}>
      <Text style={styles.caption}>Keep out of my insights:</Text>
      <View style={styles.chips}>
        {FLAG_OPTIONS.map((option) => {
          const active = flags.includes(option.kind);
          return (
            <Pressable
              key={option.kind}
              accessibilityRole="button"
              accessibilityState={{ selected: active, disabled }}
              disabled={disabled}
              onPress={() => onToggleFlag(item, option.kind)}
              style={[
                styles.chip,
                active && styles.chipActive,
                disabled && styles.chipDisabled,
              ]}
              testID={`item-flag-${item.id}-${option.kind}`}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {active ? "✓ " : ""}
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  caption: {
    color: "#64748b",
    fontSize: 12,
    marginBottom: 4,
  },
  chip: {
    backgroundColor: "transparent",
    borderColor: "#cbd5e1",
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  chipActive: {
    backgroundColor: "#dbeafe",
    borderColor: "#2563eb",
  },
  chipDisabled: {
    opacity: 0.5,
  },
  chipText: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "600",
  },
  chipTextActive: {
    color: "#2563eb",
  },
  chips: {
    flexDirection: "row",
    gap: 8,
  },
  row: {
    marginTop: 8,
  },
});
