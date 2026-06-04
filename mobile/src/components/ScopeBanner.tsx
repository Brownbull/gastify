import { StyleSheet, Text, View } from "react-native";
import { GroupAvatar } from "./GroupAvatar";
import { useGroups } from "../hooks/useGroups";
import { useScopeStore } from "../stores/scopeStore";

/**
 * Shows which scope a scope-aware screen is reading (D70) — renders nothing in
 * personal scope, a named banner in group scope. Shared by the Dashboard and
 * Trends screens so both surfaces consistently signal the active group. D75: the
 * banner shows the active group's avatar (looked up from the groups list, like
 * the web GroupSwitcher) instead of a static house emoji.
 */
export function ScopeBanner() {
  const activeScope = useScopeStore((s) => s.activeScope);
  const { data: groups } = useGroups();
  if (activeScope.kind !== "group") return null;
  const group = groups?.find((g) => g.id === activeScope.id);
  return (
    <View style={styles.scopeBanner} testID="dashboard-scope-banner">
      <GroupAvatar icon={group?.icon} color={group?.color} size={20} />
      <Text style={styles.scopeText}>Viewing group: {activeScope.name}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scopeBanner: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
  },
  scopeText: {
    color: "#2563eb",
    fontSize: 13,
    fontWeight: "600",
  },
});
