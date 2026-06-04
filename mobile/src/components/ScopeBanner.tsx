import { StyleSheet, Text } from "react-native";
import { useScopeStore } from "../stores/scopeStore";

/**
 * Shows which scope a scope-aware screen is reading (D70) — renders nothing in
 * personal scope, a named banner in group scope. Shared by the Dashboard and
 * Trends screens so both surfaces consistently signal the active group.
 */
export function ScopeBanner() {
  const activeScope = useScopeStore((s) => s.activeScope);
  if (activeScope.kind !== "group") return null;
  return (
    <Text style={styles.scopeBanner} testID="dashboard-scope-banner">
      🏠 Viewing group: {activeScope.name}
    </Text>
  );
}

const styles = StyleSheet.create({
  scopeBanner: {
    color: "#2563eb",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 4,
  },
});
