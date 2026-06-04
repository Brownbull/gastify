import { useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  useCreateInvite,
  useGroup,
  useGroupTransactions,
  useRemoveMember,
  useSetGroupConsent,
  useSetGroupVisibility,
  useUpdateMemberRole,
} from "../hooks/useGroups";
import type { GroupDetail, MemberSummary } from "../lib/groups";
import { formatMinorAmount } from "../lib/format";
import type { RootStackParamList } from "../types/navigation";

type GroupDetailScreenProps = NativeStackScreenProps<RootStackParamList, "GroupDetail">;

export function GroupDetailScreen({ navigation, route }: Partial<GroupDetailScreenProps> = {}) {
  const groupId = route?.params?.groupId ?? "";
  const { data: detail, isLoading, isError, error, refetch } = useGroup(groupId);

  return (
    <ScrollView contentContainerStyle={styles.container} testID="group-detail-screen">
      <View style={styles.headerTop}>
        <Pressable
          testID="group-detail-back"
          style={styles.linkBtn}
          onPress={() => navigation?.goBack()}
        >
          <Text style={styles.linkBtnText}>‹ Back</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.centered} testID="group-detail-loading">
          <ActivityIndicator color="#2563eb" />
          <Text style={styles.mutedText}>Loading group</Text>
        </View>
      ) : null}

      {isError ? (
        <View style={styles.errorPanel} testID="group-detail-error">
          <Text style={styles.errorTitle}>Could not load this group</Text>
          <Text style={styles.errorBody}>{error?.message ?? "Please try again."}</Text>
          <Pressable style={styles.smallBtn} onPress={() => void refetch()}>
            <Text style={styles.smallBtnText}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      {!isLoading && !isError && detail ? (
        <GroupDetailContent detail={detail} groupId={groupId} />
      ) : null}
    </ScrollView>
  );
}

function GroupDetailContent({ detail, groupId }: { detail: GroupDetail; groupId: string }) {
  const canManage = detail.role === "owner" || detail.role === "admin";

  return (
    <View style={styles.body}>
      <Text style={styles.title}>{detail.name}</Text>

      <MemberRoster detail={detail} groupId={groupId} />
      {canManage ? <InviteSection groupId={groupId} /> : null}
      {canManage ? <VisibilitySection detail={detail} groupId={groupId} /> : null}
      {detail.member_visibility_enabled ? (
        <ConsentControl detail={detail} groupId={groupId} />
      ) : null}
      <GroupTransactionsSection groupId={groupId} />
    </View>
  );
}

function MemberRoster({ detail, groupId }: { detail: GroupDetail; groupId: string }) {
  const updateRole = useUpdateMemberRole(groupId);
  const removeMember = useRemoveMember(groupId);
  const isOwner = detail.role === "owner";

  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Members</Text>
      {detail.members.map((member) => (
        <MemberRow
          key={member.user_id}
          member={member}
          showControls={isOwner && member.role !== "owner"}
          onToggleRole={() =>
            updateRole.mutate({
              memberUserId: member.user_id,
              role: member.role === "admin" ? "member" : "admin",
            })
          }
          onRemove={() => removeMember.mutate(member.user_id)}
          rolePending={updateRole.isPending}
          removePending={removeMember.isPending}
        />
      ))}
      {updateRole.isError ? (
        <Text style={styles.error} testID="member-role-error">
          Could not update the member role. Please try again.
        </Text>
      ) : null}
      {removeMember.isError ? (
        <Text style={styles.error} testID="member-remove-error">
          Could not remove the member. Please try again.
        </Text>
      ) : null}
    </View>
  );
}

function MemberRow({
  member,
  showControls,
  onToggleRole,
  onRemove,
  rolePending,
  removePending,
}: {
  member: MemberSummary;
  showControls: boolean;
  onToggleRole: () => void;
  onRemove: () => void;
  rolePending: boolean;
  removePending: boolean;
}) {
  return (
    <View style={styles.memberRow} testID={`member-row-${member.user_id}`}>
      <View style={styles.memberBody}>
        <Text style={styles.memberName}>
          {member.display_name ?? member.user_id.slice(0, 8)}
        </Text>
        <Text style={styles.memberRole}>{member.role}</Text>
      </View>
      {showControls ? (
        <View style={styles.memberActions}>
          <Pressable
            testID={`member-role-${member.user_id}`}
            disabled={rolePending}
            style={[styles.linkBtn, rolePending && styles.disabled]}
            onPress={onToggleRole}
          >
            <Text style={styles.linkBtnText}>
              {member.role === "admin" ? "Remove admin" : "Make admin"}
            </Text>
          </Pressable>
          <Pressable
            testID={`member-remove-${member.user_id}`}
            disabled={removePending}
            style={[styles.linkBtn, removePending && styles.disabled]}
            onPress={onRemove}
          >
            <Text style={styles.dangerText}>Remove</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function InviteSection({ groupId }: { groupId: string }) {
  const createInvite = useCreateInvite();

  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Invite</Text>
      <Pressable
        testID="generate-invite-button"
        disabled={createInvite.isPending}
        style={[styles.primaryBtn, createInvite.isPending && styles.disabled]}
        onPress={() => createInvite.mutate(groupId)}
      >
        <Text style={styles.primaryBtnText}>
          {createInvite.isPending ? "Generating…" : "Generate invite"}
        </Text>
      </Pressable>
      {createInvite.data ? (
        <View style={styles.inviteBox}>
          <Text style={styles.mutedText}>Share this invite token:</Text>
          <Text style={styles.inviteToken} testID="invite-token" selectable>
            {createInvite.data.token}
          </Text>
        </View>
      ) : null}
      {createInvite.isError ? (
        <Text style={styles.error} testID="generate-invite-error">
          Could not create an invite. Please try again.
        </Text>
      ) : null}
    </View>
  );
}

function VisibilitySection({ detail, groupId }: { detail: GroupDetail; groupId: string }) {
  const setVisibility = useSetGroupVisibility(groupId);
  const enabled = detail.member_visibility_enabled;

  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Member visibility</Text>
      <Text style={styles.mutedText}>
        Let members expose their individual transactions to the group.
      </Text>
      <Pressable
        testID="visibility-toggle"
        disabled={setVisibility.isPending}
        style={[styles.toggle, enabled && styles.toggleOn, setVisibility.isPending && styles.disabled]}
        onPress={() => setVisibility.mutate(!enabled)}
      >
        <Text style={[styles.toggleText, enabled && styles.toggleTextOn]}>
          {enabled ? "Visibility: On" : "Visibility: Off"}
        </Text>
      </Pressable>
      {setVisibility.isError ? (
        <Text style={styles.error} testID="visibility-error">
          Could not update visibility. Please try again.
        </Text>
      ) : null}
    </View>
  );
}

function ConsentControl({ detail, groupId }: { detail: GroupDetail; groupId: string }) {
  const setConsent = useSetGroupConsent(groupId);
  const shares = detail.viewer_shares_detail;

  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Your sharing</Text>
      <Text style={styles.mutedText}>
        Choose whether your shared transactions appear in the group list.
      </Text>
      <Pressable
        testID="consent-toggle"
        disabled={setConsent.isPending}
        style={[styles.toggle, shares && styles.toggleOn, setConsent.isPending && styles.disabled]}
        onPress={() => setConsent.mutate(!shares)}
      >
        <Text style={[styles.toggleText, shares && styles.toggleTextOn]}>
          {shares ? "Sharing details: On" : "Sharing details: Off"}
        </Text>
      </Pressable>
      {setConsent.isError ? (
        <Text style={styles.error} testID="consent-error">
          Could not update your sharing preference. Please try again.
        </Text>
      ) : null}
    </View>
  );
}

function GroupTransactionsSection({ groupId }: { groupId: string }) {
  const [show, setShow] = useState(false);
  const { data: txns, isLoading, isError, refetch } = useGroupTransactions(groupId, show);

  return (
    <View style={styles.panel}>
      <Pressable
        testID="group-transactions-toggle"
        style={styles.linkBtn}
        onPress={() => setShow((value) => !value)}
      >
        <Text style={styles.linkBtnText}>
          {show ? "Hide transactions" : "View transactions"}
        </Text>
      </Pressable>

      {show ? (
        <View testID="group-transactions" style={styles.txnList}>
          {isLoading ? (
            <View style={styles.centered} testID="group-transactions-loading">
              <ActivityIndicator color="#2563eb" />
            </View>
          ) : isError ? (
            <View>
              <Text style={styles.error} testID="group-transactions-error">
                Could not load the group's transactions.
              </Text>
              <Pressable style={styles.smallBtn} onPress={() => void refetch()}>
                <Text style={styles.smallBtnText}>Retry</Text>
              </Pressable>
            </View>
          ) : txns && txns.length === 0 ? (
            <Text style={styles.mutedText} testID="group-transactions-empty">
              No shared transactions yet.
            </Text>
          ) : (
            txns?.map((txn) => (
              <View key={txn.id} style={styles.txnRow} testID={`group-txn-${txn.id}`}>
                <View style={styles.txnBody}>
                  <Text style={styles.txnMerchant}>{txn.merchant}</Text>
                  <Text style={styles.mutedText}>
                    {txn.is_own ? "You" : txn.shared_by_name}
                  </Text>
                </View>
                <Text style={styles.txnAmount}>
                  {formatMinorAmount(txn.total_minor, txn.currency)}
                </Text>
              </View>
            ))
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: 12 },
  centered: { alignItems: "center", gap: 8, paddingVertical: 24 },
  container: { gap: 12, padding: 16 },
  dangerText: { color: "#b91c1c", fontSize: 12, fontWeight: "600" },
  disabled: { opacity: 0.5 },
  error: { color: "#b91c1c", fontSize: 12, paddingVertical: 4 },
  errorBody: { color: "#7f1d1d", fontSize: 13 },
  errorPanel: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  errorTitle: { color: "#b91c1c", fontWeight: "700" },
  headerTop: { flexDirection: "row", justifyContent: "space-between" },
  inviteBox: { gap: 4, marginTop: 8 },
  inviteToken: {
    color: "#0f172a",
    fontSize: 13,
    fontWeight: "600",
  },
  linkBtn: { paddingHorizontal: 4, paddingVertical: 8 },
  linkBtnText: { color: "#2563eb", fontSize: 13, fontWeight: "600" },
  memberActions: { alignItems: "center", flexDirection: "row", gap: 8 },
  memberBody: { flex: 1 },
  memberName: { color: "#0f172a", fontSize: 14, fontWeight: "600" },
  memberRole: { color: "#64748b", fontSize: 12, marginTop: 2, textTransform: "capitalize" },
  memberRow: {
    alignItems: "center",
    borderTopColor: "#e2e8f0",
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  mutedText: { color: "#64748b", fontSize: 13 },
  panel: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    padding: 16,
  },
  panelTitle: { color: "#0f172a", fontSize: 16, fontWeight: "700" },
  primaryBtn: {
    alignSelf: "flex-start",
    backgroundColor: "#2563eb",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  primaryBtnText: { color: "white", fontSize: 14, fontWeight: "600" },
  smallBtn: {
    alignSelf: "flex-start",
    backgroundColor: "#dbeafe",
    borderRadius: 8,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  smallBtnText: { color: "#2563eb", fontSize: 12, fontWeight: "600" },
  title: { color: "#0f172a", fontSize: 24, fontWeight: "700" },
  toggle: {
    alignSelf: "flex-start",
    borderColor: "#cbd5e1",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  toggleOn: { backgroundColor: "#dbeafe", borderColor: "#2563eb" },
  toggleText: { color: "#64748b", fontSize: 13, fontWeight: "600" },
  toggleTextOn: { color: "#2563eb" },
  txnAmount: { color: "#0f172a", fontVariant: ["tabular-nums"], fontWeight: "600" },
  txnBody: { flex: 1 },
  txnList: { gap: 4, marginTop: 8 },
  txnMerchant: { color: "#0f172a", fontSize: 14, fontWeight: "600" },
  txnRow: {
    alignItems: "center",
    borderTopColor: "#e2e8f0",
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
});
