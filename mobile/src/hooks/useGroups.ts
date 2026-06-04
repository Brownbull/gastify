import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createGroup,
  createInvite,
  getGroup,
  getInvitePreview,
  joinInvite,
  leaveGroup,
  listGroups,
  shareTransaction,
} from "../lib/groups";
import { insightsKeys } from "./insightsKeys";

export const groupKeys = {
  all: ["groups"] as const,
  list: () => [...groupKeys.all, "list"] as const,
  detail: (id: string) => [...groupKeys.all, "detail", id] as const,
  invite: (token: string) => ["invites", token] as const,
};

export function useGroups() {
  return useQuery({
    queryKey: groupKeys.list(),
    queryFn: listGroups,
    staleTime: 30 * 1000,
  });
}

export function useGroup(groupId: string | undefined) {
  return useQuery({
    queryKey: groupKeys.detail(groupId ?? ""),
    enabled: Boolean(groupId),
    queryFn: () => getGroup(groupId as string),
  });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => createGroup(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: groupKeys.list() }),
  });
}

export function useLeaveGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (groupId: string) => leaveGroup(groupId),
    onSuccess: () => qc.invalidateQueries({ queryKey: groupKeys.list() }),
  });
}

export function useCreateInvite() {
  return useMutation({
    mutationFn: (groupId: string) => createInvite(groupId),
  });
}

export function useInvitePreview(token: string) {
  return useQuery({
    queryKey: groupKeys.invite(token),
    enabled: Boolean(token),
    retry: false,
    queryFn: () => getInvitePreview(token),
  });
}

export function useJoinInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (token: string) => joinInvite(token),
    onSuccess: () => qc.invalidateQueries({ queryKey: groupKeys.list() }),
  });
}

export function useShareTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { groupId: string; transactionId: string }) =>
      shareTransaction(vars.groupId, vars.transactionId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: insightsKeys.all });
      void qc.invalidateQueries({ queryKey: groupKeys.all });
    },
  });
}
