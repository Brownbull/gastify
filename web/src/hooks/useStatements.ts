import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { auth } from "@/lib/firebase";
import { apiClient } from "@/lib/api";
import { transactionKeys } from "@/hooks/useTransactions";
import { useStatementStore } from "@/stores/statementStore";
import type { components } from "@/lib/api-types";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

type CardAliasCreate = components["schemas"]["CardAliasCreate"];
type CardAliasUpdate = components["schemas"]["CardAliasUpdate"];
type StatementUploadResponse = components["schemas"]["StatementUploadResponse"];
type StatementProcessRequest = components["schemas"]["StatementProcessRequest"];
type TransactionCreate = components["schemas"]["TransactionCreate"];

export const statementKeys = {
  all: ["statements"] as const,
  lists: () => [...statementKeys.all, "list"] as const,
  aliases: () => [...statementKeys.all, "card-aliases"] as const,
  lines: (statementId: string) =>
    [...statementKeys.all, "lines", statementId] as const,
  reconciliation: (statementId: string) =>
    [...statementKeys.all, "reconciliation", statementId] as const,
};

function parseApiError(body: unknown, fallback: string): string {
  const detail = (body as { detail?: unknown } | null)?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] as { msg?: unknown } | undefined;
    if (typeof first?.msg === "string") return first.msg;
  }
  return fallback;
}

export function useCardAliases() {
  return useQuery({
    queryKey: statementKeys.aliases(),
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/card-aliases");
      if (error || !data) {
        throw new Error("Failed to fetch card aliases");
      }
      return data;
    },
  });
}

export function useCreateCardAlias() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: CardAliasCreate) => {
      const { data, error } = await apiClient.POST("/api/v1/card-aliases", {
        body,
      });
      if (error || !data) {
        throw new Error("Failed to create card alias");
      }
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: statementKeys.aliases() });
    },
  });
}

export function useUpdateCardAlias(aliasId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: CardAliasUpdate) => {
      const { data, error } = await apiClient.PATCH(
        "/api/v1/card-aliases/{alias_id}",
        { params: { path: { alias_id: aliasId } }, body },
      );
      if (error || !data) {
        throw new Error("Failed to update card alias");
      }
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: statementKeys.aliases() });
    },
  });
}

export function useArchiveCardAlias(aliasId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await apiClient.DELETE(
        "/api/v1/card-aliases/{alias_id}",
        { params: { path: { alias_id: aliasId } } },
      );
      if (error) {
        throw new Error("Failed to archive card alias");
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: statementKeys.aliases() });
    },
  });
}

export function useStatements() {
  return useQuery({
    queryKey: statementKeys.lists(),
    queryFn: async () => {
      const { data, error } = await apiClient.GET("/api/v1/statements");
      if (error || !data) {
        throw new Error("Failed to fetch statements");
      }
      return data;
    },
  });
}

interface UploadStatementInput {
  file: File;
  cardAliasId?: string | null;
  password?: string | null;
  aiProcessingConsent: boolean;
}

export function useStatementUpload() {
  const queryClient = useQueryClient();
  const { startUpload, uploadComplete, uploadFailed } = useStatementStore();

  return useMutation({
    mutationFn: async ({
      file,
      cardAliasId,
      password,
      aiProcessingConsent,
    }: UploadStatementInput): Promise<StatementUploadResponse> => {
      startUpload();

      if (!aiProcessingConsent) {
        throw new Error("AI processing consent required");
      }

      const user = auth.currentUser;
      if (!user) {
        throw new Error("Not authenticated");
      }

      const token = await user.getIdToken();
      const formData = new FormData();
      formData.append("file", file);
      formData.append("ai_processing_consent", String(aiProcessingConsent));
      if (cardAliasId) formData.append("card_alias_id", cardAliasId);
      if (password) formData.append("password", password);

      const response = await fetch(`${API_BASE}/api/v1/statements`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(parseApiError(body, `Upload failed (${response.status})`));
      }

      return (await response.json()) as StatementUploadResponse;
    },
    onSuccess: (response) => {
      uploadComplete(response);
      void queryClient.invalidateQueries({ queryKey: statementKeys.lists() });
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Upload failed";
      uploadFailed(message);
    },
  });
}

export function useProcessStatement(statementId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: StatementProcessRequest) => {
      if (!statementId) throw new Error("No statement selected");
      const { data, error } = await apiClient.POST(
        "/api/v1/statements/{statement_id}/process",
        { params: { path: { statement_id: statementId } }, body },
      );
      if (error || !data) {
        throw new Error("Failed to process statement");
      }
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: statementKeys.lists() });
    },
  });
}

export function useStatementLines(statementId: string | null) {
  return useQuery({
    queryKey: statementKeys.lines(statementId ?? "none"),
    enabled: Boolean(statementId),
    queryFn: async () => {
      if (!statementId) return [];
      const { data, error } = await apiClient.GET(
        "/api/v1/statements/{statement_id}/lines",
        { params: { path: { statement_id: statementId } } },
      );
      if (error || !data) {
        throw new Error("Failed to fetch statement lines");
      }
      return data;
    },
  });
}

export function useStatementReconciliation(statementId: string | null) {
  return useQuery({
    queryKey: statementKeys.reconciliation(statementId ?? "none"),
    enabled: Boolean(statementId),
    queryFn: async () => {
      if (!statementId) throw new Error("No statement selected");
      const { data, error } = await apiClient.GET(
        "/api/v1/statements/{statement_id}/reconciliation",
        { params: { path: { statement_id: statementId } } },
      );
      if (error || !data) {
        throw new Error("Failed to fetch statement reconciliation");
      }
      return data;
    },
    retry: false,
  });
}

export function useReconcileStatement(statementId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!statementId) throw new Error("No statement selected");
      const { data, error } = await apiClient.POST(
        "/api/v1/statements/{statement_id}/reconcile",
        { params: { path: { statement_id: statementId } } },
      );
      if (error || !data) {
        throw new Error("Failed to reconcile statement");
      }
      return data;
    },
    onSuccess: () => {
      if (statementId) {
        void queryClient.invalidateQueries({
          queryKey: statementKeys.reconciliation(statementId),
        });
      }
    },
  });
}

export function useCreateStatementTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: TransactionCreate) => {
      const { data, error } = await apiClient.POST("/api/v1/transactions", {
        body,
      });
      if (error || !data) {
        throw new Error("Failed to create transaction");
      }
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: statementKeys.all });
    },
  });
}
