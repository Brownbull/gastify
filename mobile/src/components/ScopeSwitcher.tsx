import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { GroupAvatar } from "./GroupAvatar";
import { useGroups } from "../hooks/useGroups";
import { useScopeStore } from "../stores/scopeStore";

/**
 * Compact whole-app scope switcher (D70) for the home hub — the mobile parity of
 * the web header GroupSwitcher. Tap to pick Personal or a group; switching
 * re-points every scope-aware view (dashboard, trends). Hidden until the user
 * belongs to at least one group, so personal-only users see no chrome.
 */
export function ScopeSwitcher() {
  const activeScope = useScopeStore((s) => s.activeScope);
  const setActiveScope = useScopeStore((s) => s.setActiveScope);
  const { data: groups } = useGroups();
  const [open, setOpen] = useState(false);

  if (!groups || groups.length === 0) return null;

  const label = activeScope.kind === "group" ? activeScope.name : "Personal";

  return (
    <View style={styles.wrap} testID="scope-switcher">
      <Pressable
        testID="scope-switcher-toggle"
        style={styles.toggle}
        accessibilityRole="button"
        onPress={() => setOpen((o) => !o)}
      >
        <Text style={styles.toggleLabel}>Viewing: {label}</Text>
        <Text style={styles.chevron}>{open ? "▴" : "▾"}</Text>
      </Pressable>
      {open ? (
        <View style={styles.menu}>
          <Pressable
            testID="scope-option-personal"
            style={styles.option}
            onPress={() => {
              setActiveScope({ kind: "personal" });
              setOpen(false);
            }}
          >
            <Text
              style={[
                styles.optionText,
                activeScope.kind === "personal" && styles.optionActive,
              ]}
            >
              Personal
            </Text>
          </Pressable>
          {groups.map((group) => {
            const active = activeScope.kind === "group" && activeScope.id === group.id;
            return (
              <Pressable
                key={group.id}
                testID={`scope-option-${group.name}`}
                style={[styles.option, styles.optionRow]}
                onPress={() => {
                  setActiveScope({ kind: "group", id: group.id, name: group.name });
                  setOpen(false);
                }}
              >
                <GroupAvatar icon={group.icon} color={group.color} size={20} />
                <Text style={[styles.optionText, active && styles.optionActive]}>
                  {group.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  toggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
  },
  toggleLabel: { color: "#2563eb", fontWeight: "600", fontSize: 14 },
  chevron: { color: "#64748b", fontSize: 14 },
  menu: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    backgroundColor: "#ffffff",
    overflow: "hidden",
  },
  option: { paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: "#f1f5f9" },
  optionRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  optionText: { color: "#334155", fontSize: 14 },
  optionActive: { color: "#2563eb", fontWeight: "700" },
});
