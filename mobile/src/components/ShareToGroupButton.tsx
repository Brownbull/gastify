import { Pressable, StyleSheet, Text, View } from "react-native";
import { useGroups, useShareTransaction } from "../hooks/useGroups";
import { useScopeStore } from "../stores/scopeStore";

/**
 * "Share to group" affordance on a personal transaction (D70 populate-via-share).
 * Only shown in personal mode and only when the user belongs to a group; tapping a
 * group copies the transaction into it (the original stays personal).
 */
export function ShareToGroupButton({ transactionId }: { transactionId: string }) {
  const inPersonalMode = useScopeStore((s) => s.activeScope.kind === "personal");
  const { data: groups } = useGroups();
  const share = useShareTransaction();

  if (!inPersonalMode || !groups || groups.length === 0) return null;

  return (
    <View style={styles.panel} testID="share-to-group">
      <Text style={styles.label}>Share to a group</Text>
      <View style={styles.row}>
        {groups.map((group) => (
          <Pressable
            key={group.id}
            testID={`share-to-${group.name}`}
            disabled={share.isPending}
            style={[styles.btn, share.isPending && styles.disabled]}
            onPress={() => share.mutate({ groupId: group.id, transactionId })}
          >
            <Text style={styles.btnText}>{group.name}</Text>
          </Pressable>
        ))}
      </View>
      {share.isSuccess && (
        <Text style={styles.ok} testID="share-success">
          Shared
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  label: { fontSize: 13, fontWeight: "600", color: "#374151" },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  btn: { backgroundColor: "#2563eb", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  btnText: { color: "white", fontWeight: "600", fontSize: 13 },
  disabled: { opacity: 0.5 },
  ok: { color: "#16a34a", fontSize: 12, fontWeight: "600" },
});
