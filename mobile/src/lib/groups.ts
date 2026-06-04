import { apiClient } from "./api";
import { readApiError } from "./apiError";
import type { components } from "./api-types";

export type GroupSummary = components["schemas"]["GroupSummary"];
export type GroupDetail = components["schemas"]["GroupDetail"];
export type InvitePreview = components["schemas"]["InvitePreview"];
export type InviteResponse = components["schemas"]["InviteResponse"];
export type JoinResponse = components["schemas"]["JoinResponse"];

export async function listGroups(): Promise<GroupSummary[]> {
  const { data, error } = await apiClient.GET("/api/v1/groups");
  if (error || !data) throw new Error(readApiError(error, "Failed to load groups"));
  return data;
}

export async function getGroup(groupId: string): Promise<GroupDetail> {
  const { data, error } = await apiClient.GET("/api/v1/groups/{group_id}", {
    params: { path: { group_id: groupId } },
  });
  if (error || !data) throw new Error(readApiError(error, "Failed to load group"));
  return data;
}

export async function createGroup(name: string): Promise<GroupSummary> {
  const { data, error } = await apiClient.POST("/api/v1/groups", { body: { name } });
  if (error || !data) throw new Error(readApiError(error, "Failed to create group"));
  return data;
}

export async function leaveGroup(groupId: string): Promise<void> {
  const { error } = await apiClient.POST("/api/v1/groups/{group_id}/leave", {
    params: { path: { group_id: groupId } },
  });
  if (error) throw new Error(readApiError(error, "Failed to leave group"));
}

export async function createInvite(groupId: string): Promise<InviteResponse> {
  const { data, error } = await apiClient.POST("/api/v1/groups/{group_id}/invite", {
    params: { path: { group_id: groupId } },
  });
  if (error || !data) throw new Error(readApiError(error, "Failed to create invite"));
  return data;
}

export async function getInvitePreview(token: string): Promise<InvitePreview> {
  const { data, error } = await apiClient.GET("/api/v1/invites/{token}", {
    params: { path: { token } },
  });
  if (error || !data) throw new Error(readApiError(error, "Invite not found"));
  return data;
}

export async function joinInvite(token: string): Promise<JoinResponse> {
  const { data, error } = await apiClient.POST("/api/v1/invites/{token}/join", {
    params: { path: { token } },
  });
  if (error || !data) throw new Error(readApiError(error, "Failed to join group"));
  return data;
}

export async function shareTransaction(
  groupId: string,
  transactionId: string,
): Promise<void> {
  const { error } = await apiClient.POST("/api/v1/groups/{group_id}/share", {
    params: { path: { group_id: groupId } },
    body: { transaction_id: transactionId },
  });
  if (error) throw new Error(readApiError(error, "Failed to share transaction"));
}
