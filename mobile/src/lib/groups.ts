import { apiClient } from "./api";
import { readApiError } from "./apiError";
import type { components } from "./api-types";

export type GroupSummary = components["schemas"]["GroupSummary"];
export type GroupDetail = components["schemas"]["GroupDetail"];
export type MemberSummary = components["schemas"]["MemberSummary"];
export type GroupTransactionRow = components["schemas"]["GroupTransactionRow"];
export type InvitePreview = components["schemas"]["InvitePreview"];
export type InviteResponse = components["schemas"]["InviteResponse"];
export type JoinResponse = components["schemas"]["JoinResponse"];

export type AssignableRole = components["schemas"]["RoleUpdate"]["role"];

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

export async function updateMemberRole(
  groupId: string,
  memberUserId: string,
  role: AssignableRole,
): Promise<MemberSummary> {
  const { data, error } = await apiClient.PATCH(
    "/api/v1/groups/{group_id}/members/{member_user_id}",
    {
      params: { path: { group_id: groupId, member_user_id: memberUserId } },
      body: { role },
    },
  );
  if (error || !data) throw new Error(readApiError(error, "Failed to update role"));
  return data;
}

export async function removeMember(
  groupId: string,
  memberUserId: string,
): Promise<void> {
  const { error } = await apiClient.DELETE(
    "/api/v1/groups/{group_id}/members/{member_user_id}",
    { params: { path: { group_id: groupId, member_user_id: memberUserId } } },
  );
  if (error) throw new Error(readApiError(error, "Failed to remove member"));
}

export async function setGroupVisibility(
  groupId: string,
  enabled: boolean,
): Promise<GroupDetail> {
  const { data, error } = await apiClient.PATCH(
    "/api/v1/groups/{group_id}/visibility",
    {
      params: { path: { group_id: groupId } },
      body: { enabled },
    },
  );
  if (error || !data) throw new Error(readApiError(error, "Failed to update visibility"));
  return data;
}

export async function setGroupIcon(
  groupId: string,
  icon: string | null,
  color: string | null,
): Promise<GroupDetail> {
  const { data, error } = await apiClient.PATCH(
    "/api/v1/groups/{group_id}/icon",
    {
      params: { path: { group_id: groupId } },
      body: { icon, color },
    },
  );
  if (error || !data) throw new Error(readApiError(error, "Failed to update group avatar"));
  return data;
}

export async function setGroupConsent(
  groupId: string,
  sharesDetail: boolean,
): Promise<GroupDetail> {
  const { data, error } = await apiClient.POST(
    "/api/v1/groups/{group_id}/consent",
    {
      params: { path: { group_id: groupId } },
      body: { shares_detail: sharesDetail },
    },
  );
  if (error || !data) throw new Error(readApiError(error, "Failed to update consent"));
  return data;
}

export async function listGroupTransactions(
  groupId: string,
): Promise<GroupTransactionRow[]> {
  const { data, error } = await apiClient.GET(
    "/api/v1/groups/{group_id}/transactions",
    { params: { path: { group_id: groupId } } },
  );
  if (error || !data) throw new Error(readApiError(error, "Failed to load group transactions"));
  return data;
}
