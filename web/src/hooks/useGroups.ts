import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { insightsKeys } from "@/hooks/useInsights";
import { useUiStore } from "@/stores/uiStore";
import type { components } from "@/lib/api-types";

export type GroupSummary = components["schemas"]["GroupSummary"];
export type GroupDetail = components["schemas"]["GroupDetail"];
export type InvitePreview = components["schemas"]["InvitePreview"];
export type GroupTransactionRow = components["schemas"]["GroupTransactionRow"];
export type GroupRole = GroupSummary["role"];
type AssignableRole = components["schemas"]["RoleUpdate"]["role"];

export const groupKeys = {
  all: ["groups"] as const,
  list: () => [...groupKeys.all, "list"] as const,
  detail: (id: string) => [...groupKeys.all, "detail", id] as const,
  transactions: (id: string) => [...groupKeys.all, "transactions", id] as const,
  invite: (token: string) => ["invites", token] as const,
};

export function useGroups() {
  return useQuery({
    queryKey: groupKeys.list(),
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/groups");
      if (error || !data) throw new Error("Failed to load groups");
      return data;
    },
    staleTime: 30 * 1000,
  });
}

export function useGroup(groupId: string | undefined) {
  return useQuery({
    queryKey: groupKeys.detail(groupId ?? ""),
    enabled: Boolean(groupId),
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/groups/{group_id}", {
        params: { path: { group_id: groupId as string } },
      });
      if (error || !data) throw new Error("Failed to load group");
      return data;
    },
  });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await apiClient.POST("/api/v1/groups", {
        body: { name },
      });
      if (error || !data) throw new Error("Failed to create group");
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: groupKeys.list() }),
  });
}

export function useRenameGroup(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await apiClient.PATCH("/api/v1/groups/{group_id}", {
        params: { path: { group_id: groupId } },
        body: { name },
      });
      if (error || !data) throw new Error("Failed to rename group");
      return data;
    },
    onSuccess: (_data, name) => {
      // Keep the active-scope label in sync if the renamed group is in view.
      const scope = useUiStore.getState().activeScope;
      if (scope.kind === "group" && scope.id === groupId) {
        useUiStore.getState().setActiveScope({ kind: "group", id: groupId, name });
      }
      void qc.invalidateQueries({ queryKey: groupKeys.list() });
      void qc.invalidateQueries({ queryKey: groupKeys.detail(groupId) });
    },
  });
}

export function useDeleteGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await apiClient.DELETE("/api/v1/groups/{group_id}", {
        params: { path: { group_id: groupId } },
      });
      if (error) throw new Error("Failed to delete group");
    },
    onSuccess: (_data, groupId) => {
      qc.removeQueries({ queryKey: groupKeys.detail(groupId) });
      void qc.invalidateQueries({ queryKey: groupKeys.list() });
    },
  });
}

export function useCreateInvite(groupId: string) {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await apiClient.POST("/api/v1/groups/{group_id}/invite", {
        params: { path: { group_id: groupId } },
      });
      if (error || !data) throw new Error("Failed to create invite");
      return data;
    },
  });
}

export function useLeaveGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await apiClient.POST("/api/v1/groups/{group_id}/leave", {
        params: { path: { group_id: groupId } },
      });
      if (error) throw new Error("Failed to leave group");
    },
    onSuccess: (_data, groupId) => {
      qc.removeQueries({ queryKey: groupKeys.detail(groupId) });
      qc.removeQueries({ queryKey: groupKeys.transactions(groupId) });
      void qc.invalidateQueries({ queryKey: groupKeys.list() });
    },
  });
}

export function useRemoveMember(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (memberUserId: string) => {
      const { error } = await apiClient.DELETE(
        "/api/v1/groups/{group_id}/members/{member_user_id}",
        { params: { path: { group_id: groupId, member_user_id: memberUserId } } },
      );
      if (error) throw new Error("Failed to remove member");
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: groupKeys.detail(groupId) });
      void qc.invalidateQueries({ queryKey: groupKeys.list() });
    },
  });
}

export function useUpdateMemberRole(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { memberUserId: string; role: AssignableRole }) => {
      const { data, error } = await apiClient.PATCH(
        "/api/v1/groups/{group_id}/members/{member_user_id}",
        {
          params: { path: { group_id: groupId, member_user_id: vars.memberUserId } },
          body: { role: vars.role },
        },
      );
      if (error || !data) throw new Error("Failed to update role");
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: groupKeys.detail(groupId) }),
  });
}

export function useInvitePreview(token: string) {
  return useQuery({
    queryKey: groupKeys.invite(token),
    enabled: Boolean(token),
    retry: false,
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/invites/{token}", {
        params: { path: { token } },
      });
      if (error || !data) throw new Error("Invite not found");
      return data;
    },
  });
}

export function useJoinInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (token: string) => {
      const { data, error } = await apiClient.POST("/api/v1/invites/{token}/join", {
        params: { path: { token } },
      });
      if (error || !data) throw new Error("Failed to join group");
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: groupKeys.list() }),
  });
}

export function useSetGroupVisibility(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (enabled: boolean) => {
      const { data, error } = await apiClient.PATCH("/api/v1/groups/{group_id}/visibility", {
        params: { path: { group_id: groupId } },
        body: { enabled },
      });
      if (error || !data) throw new Error("Failed to update visibility");
      return data;
    },
    onSuccess: (data) => {
      qc.setQueryData(groupKeys.detail(groupId), data);
      void qc.invalidateQueries({ queryKey: groupKeys.transactions(groupId) });
    },
  });
}

export function useSetGroupConsent(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sharesDetail: boolean) => {
      const { data, error } = await apiClient.POST("/api/v1/groups/{group_id}/consent", {
        params: { path: { group_id: groupId } },
        body: { shares_detail: sharesDetail },
      });
      if (error || !data) throw new Error("Failed to update consent");
      return data;
    },
    onSuccess: (data) => {
      qc.setQueryData(groupKeys.detail(groupId), data);
      void qc.invalidateQueries({ queryKey: groupKeys.transactions(groupId) });
    },
  });
}

export function useGroupTransactions(groupId: string, enabled = true) {
  return useQuery({
    queryKey: groupKeys.transactions(groupId),
    enabled: Boolean(groupId) && enabled,
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/groups/{group_id}/transactions", {
        params: { path: { group_id: groupId } },
      });
      if (error || !data) throw new Error("Failed to load group transactions");
      return data;
    },
  });
}

export function useShareTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { groupId: string; transactionId: string }) => {
      const { data, error } = await apiClient.POST("/api/v1/groups/{group_id}/share", {
        params: { path: { group_id: vars.groupId } },
        body: { transaction_id: vars.transactionId },
      });
      if (error || !data) throw new Error("Failed to share transaction");
      return data;
    },
    onSuccess: () => {
      // The group's analytics now include the shared spend.
      void qc.invalidateQueries({ queryKey: insightsKeys.all });
      void qc.invalidateQueries({ queryKey: groupKeys.all });
    },
  });
}
