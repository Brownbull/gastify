import { useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  useCreateGroup,
  useGroups,
  useJoinInvite,
  useLeaveGroup,
} from "../hooks/useGroups";
import type { GroupSummary } from "../lib/groups";
import { useScopeStore } from "../stores/scopeStore";
import type { RootStackParamList } from "../types/navigation";

type GroupsScreenProps = NativeStackScreenProps<RootStackParamList, "Groups">;

// Accept either a raw invite token or a full ".../invite/<token>" URL and
// reduce it to the bare token — the last non-empty path/whitespace segment.
function extractInviteToken(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const segments = trimmed.split(/[/\s]+/).filter(Boolean);
  return segments[segments.length - 1] ?? "";
}

export function GroupsScreen({ navigation }: Partial<GroupsScreenProps> = {}) {
  const { data: groups, isLoading, isError, error, refetch } = useGroups();
  const activeScope = useScopeStore((s) => s.activeScope);
  const setActiveScope = useScopeStore((s) => s.setActiveScope);
  const createGroup = useCreateGroup();
  const joinInvite = useJoinInvite();
  const [name, setName] = useState("");
  const [inviteInput, setInviteInput] = useState("");

  function openGroup(group: GroupSummary) {
    setActiveScope({ kind: "group", id: group.id, name: group.name });
    navigation?.navigate("Dashboard");
  }

  // Shared by the Create button and the keyboard "done" action. Reads the raw
  // value (not just controlled state) so submitting via the IME action works
  // even if a controlled-state update is mid-flight.
  function handleCreate(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed || createGroup.isPending) return;
    createGroup.mutate(trimmed, { onSuccess: () => setName("") });
  }

  // Reads the raw value (like handleCreate) so the IME "done" action works even
  // mid-flight. Accepts a raw token or an invite URL.
  function handleJoin(raw: string) {
    const token = extractInviteToken(raw);
    if (!token || joinInvite.isPending) return;
    joinInvite.mutate(token, { onSuccess: () => setInviteInput("") });
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      testID="groups-screen"
    >
      <Text style={styles.title}>Groups</Text>
      <Text style={styles.subtitle}>Share spending with your household or team.</Text>

      <View style={styles.scopeRow}>
        <Text style={styles.scopeLabel}>
          {activeScope.kind === "group" ? `Viewing: ${activeScope.name}` : "Viewing: Personal"}
        </Text>
        {activeScope.kind === "group" && (
          <Pressable
            testID="scope-personal-button"
            style={styles.linkBtn}
            onPress={() => setActiveScope({ kind: "personal" })}
          >
            <Text style={styles.linkBtnText}>Back to personal</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.createRow}>
        <TextInput
          testID="create-group-input"
          value={name}
          onChangeText={setName}
          placeholder="Group name"
          maxLength={60}
          returnKeyType="done"
          onSubmitEditing={(e) => handleCreate(e.nativeEvent.text)}
          style={styles.input}
        />
        <Pressable
          testID="create-group-button"
          disabled={createGroup.isPending || !name.trim()}
          style={[styles.primaryBtn, (!name.trim() || createGroup.isPending) && styles.disabled]}
          onPress={() => handleCreate(name)}
        >
          <Text style={styles.primaryBtnText}>Create</Text>
        </Pressable>
      </View>
      {createGroup.isError && (
        <Text style={styles.error} testID="create-group-error">
          Could not create the group. Please try again.
        </Text>
      )}

      <View style={styles.joinSection}>
        <Text style={styles.sectionLabel}>Join by invite</Text>
        <View style={styles.createRow}>
          <TextInput
            testID="join-invite-input"
            value={inviteInput}
            onChangeText={setInviteInput}
            placeholder="Invite token or link"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={(e) => handleJoin(e.nativeEvent.text)}
            style={styles.input}
          />
          <Pressable
            testID="join-invite-button"
            disabled={joinInvite.isPending || !inviteInput.trim()}
            style={[
              styles.primaryBtn,
              (!inviteInput.trim() || joinInvite.isPending) && styles.disabled,
            ]}
            onPress={() => handleJoin(inviteInput)}
          >
            <Text style={styles.primaryBtnText}>Join</Text>
          </Pressable>
        </View>
        {joinInvite.isError && (
          <Text style={styles.error} testID="join-invite-error">
            Could not join with that invite. Please check the token and try again.
          </Text>
        )}
      </View>

      {isLoading && <ActivityIndicator testID="groups-loading" />}
      {isError && (
        <View style={styles.errorPanel} testID="groups-error">
          <Text style={styles.errorBody}>
            {error?.message ?? "Could not load your groups."}
          </Text>
          <Pressable style={styles.smallBtn} onPress={() => void refetch()}>
            <Text style={styles.smallBtnText}>Retry</Text>
          </Pressable>
        </View>
      )}
      {groups && groups.length === 0 && (
        <Text style={styles.empty}>You have no groups yet. Create one to get started.</Text>
      )}

      {groups?.map((group) => (
        <GroupCard
          key={group.id}
          group={group}
          onOpen={() => openGroup(group)}
          onManage={() => navigation?.navigate("GroupDetail", { groupId: group.id })}
        />
      ))}
    </ScrollView>
  );
}

function GroupCard({
  group,
  onOpen,
  onManage,
}: {
  group: GroupSummary;
  onOpen: () => void;
  onManage: () => void;
}) {
  const leaveGroup = useLeaveGroup();
  const activeScope = useScopeStore((s) => s.activeScope);
  const setActiveScope = useScopeStore((s) => s.setActiveScope);

  return (
    <View testID={`group-card-${group.name}`}>
      <View style={styles.card}>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>🏠 {group.name}</Text>
          <Text style={styles.cardMeta}>
            {group.member_count} members · {group.role}
          </Text>
        </View>
        <View style={styles.cardActions}>
          <Pressable
            testID={`group-open-${group.name}`}
            style={styles.smallBtn}
            onPress={onOpen}
          >
            <Text style={styles.smallBtnText}>View dashboard</Text>
          </Pressable>
          <Pressable
            testID={`group-manage-${group.name}`}
            style={styles.smallBtn}
            onPress={onManage}
          >
            <Text style={styles.smallBtnText}>Manage</Text>
          </Pressable>
          <Pressable
            testID={`group-leave-${group.name}`}
            disabled={leaveGroup.isPending}
            style={[styles.linkBtn, leaveGroup.isPending && styles.disabled]}
            onPress={() =>
              leaveGroup.mutate(group.id, {
                onSuccess: () => {
                  if (activeScope.kind === "group" && activeScope.id === group.id) {
                    setActiveScope({ kind: "personal" });
                  }
                },
              })
            }
          >
            <Text style={styles.linkBtnText}>{leaveGroup.isPending ? "Leaving…" : "Leave"}</Text>
          </Pressable>
        </View>
      </View>
      {leaveGroup.isError && (
        <Text style={styles.error} testID={`group-leave-error-${group.name}`}>
          Could not leave the group. Please try again.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  title: { fontSize: 22, fontWeight: "700", color: "#111827" },
  subtitle: { fontSize: 13, color: "#6b7280" },
  scopeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  scopeLabel: { fontSize: 14, fontWeight: "600", color: "#2563eb" },
  createRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  joinSection: { gap: 6 },
  sectionLabel: { fontSize: 14, fontWeight: "600", color: "#111827" },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  primaryBtn: { backgroundColor: "#2563eb", borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10 },
  primaryBtnText: { color: "white", fontWeight: "600", fontSize: 14 },
  disabled: { opacity: 0.5 },
  empty: { fontSize: 13, color: "#6b7280", paddingVertical: 8 },
  error: { color: "#b91c1c", fontSize: 12, paddingVertical: 4 },
  errorPanel: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  errorBody: { color: "#7f1d1d", fontSize: 13 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 14,
  },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: "600", color: "#111827" },
  cardMeta: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  cardActions: { flexDirection: "row", gap: 8, alignItems: "center" },
  smallBtn: { backgroundColor: "#dbeafe", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  smallBtnText: { color: "#2563eb", fontWeight: "600", fontSize: 12 },
  linkBtn: { paddingHorizontal: 4, paddingVertical: 8 },
  linkBtnText: { color: "#6b7280", fontSize: 12, fontWeight: "600" },
});
