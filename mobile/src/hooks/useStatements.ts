import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback, useRef } from "react";
import {
  createCardAlias,
  createStatementTransaction,
  getStatementReconciliation,
  listCardAliases,
  listStatements,
  processStatement,
  reconcileStatement,
  StatementUploadError,
  submitStatementPdf,
  type CardAliasCreate,
  type StatementProcessRequest,
  type TransactionCreate,
} from "../lib/statements";
import { transactionKeys } from "./useTransactions";
import {
  useStatementStore,
  type StatementPdfAsset,
} from "../stores/statementStore";
import { isActiveMobileSession, useSessionStore } from "../stores/sessionStore";

export const statementKeys = {
  all: ["statements"] as const,
  aliases: () => [...statementKeys.all, "card-aliases"] as const,
  lists: () => [...statementKeys.all, "list"] as const,
  reconciliation: (statementId: string) =>
    [...statementKeys.all, "reconciliation", statementId] as const,
};

export function useCardAliases() {
  return useQuery({
    queryKey: statementKeys.aliases(),
    queryFn: listCardAliases,
  });
}

export function useCreateCardAlias() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CardAliasCreate) => createCardAlias(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: statementKeys.aliases() });
    },
  });
}

export function useStatements() {
  return useQuery({
    queryKey: statementKeys.lists(),
    queryFn: listStatements,
  });
}

export function useStatementUpload() {
  const phase = useStatementStore((state) => state.phase);
  const sessionVersion = useSessionStore((state) => state.sessionVersion);
  const startUpload = useStatementStore((state) => state.startUpload);
  const uploadComplete = useStatementStore((state) => state.uploadComplete);
  const uploadFailed = useStatementStore((state) => state.uploadFailed);
  const queryClient = useQueryClient();
  const abortRef = useRef<AbortController | null>(null);

  const uploadStatement = useCallback(
    async ({
      asset,
      cardAliasId,
      password,
      aiProcessingConsent,
    }: {
      asset: StatementPdfAsset;
      cardAliasId?: string | null;
      password?: string | null;
      aiProcessingConsent: boolean;
    }) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const activeSessionVersion = sessionVersion;

      startUpload(asset);

      try {
        const submission = await submitStatementPdf(
          { asset, cardAliasId, password, aiProcessingConsent },
          { signal: controller.signal },
        );
        if (isActiveMobileSession(activeSessionVersion)) {
          uploadComplete(submission);
          void queryClient.invalidateQueries({ queryKey: statementKeys.lists() });
        }
        return submission;
      } catch (err: unknown) {
        if (isAbortError(err)) return null;
        if (!isActiveMobileSession(activeSessionVersion)) return null;

        if (err instanceof StatementUploadError) {
          uploadFailed(err.code, err.message);
          return null;
        }

        uploadFailed(
          "upload_error",
          err instanceof Error ? err.message : "Statement upload failed unexpectedly",
        );
        return null;
      }
    },
    [queryClient, sessionVersion, startUpload, uploadComplete, uploadFailed],
  );

  const cancelUpload = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    useStatementStore.getState().reset();
  }, []);

  return {
    cancelUpload,
    isUploading: phase === "uploading",
    uploadStatement,
  };
}

export function useProcessStatement(statementId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: StatementProcessRequest) => {
      if (!statementId) throw new Error("No statement selected");
      return processStatement(statementId, body);
    },
    onSuccess: (statement) => {
      useStatementStore.getState().selectStatement(statement);
      void queryClient.invalidateQueries({ queryKey: statementKeys.lists() });
    },
  });
}

export function useStatementReconciliation(statementId: string | null) {
  return useQuery({
    queryKey: statementKeys.reconciliation(statementId ?? "none"),
    enabled: Boolean(statementId),
    queryFn: () => {
      if (!statementId) throw new Error("No statement selected");
      return getStatementReconciliation(statementId);
    },
    retry: false,
  });
}

export function useReconcileStatement(statementId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => {
      if (!statementId) throw new Error("No statement selected");
      return reconcileStatement(statementId);
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
    mutationFn: (body: TransactionCreate) => createStatementTransaction(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: statementKeys.all });
    },
  });
}

function isAbortError(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err.name === "AbortError" || err.message.toLowerCase().includes("aborted"))
  );
}
