import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ReconciliationPanel,
  type BucketKey,
} from "@/components/StatementReconciliationPanel";
import {
  useArchiveCardAlias,
  useCardAliases,
  useCreateCardAlias,
  useProcessStatement,
  useReconcileStatement,
  useStatementReconciliation,
  useStatements,
  useStatementUpload,
  useUpdateCardAlias,
} from "@/hooks/useStatements";
import { useStatementStream } from "@/hooks/useStatementStream";
import { useStatementStore } from "@/stores/statementStore";
import type { components } from "@/lib/api-types";

export const Route = createFileRoute("/statements")({
  component: StatementsPage,
});

type CardAlias = components["schemas"]["CardAliasResponse"];
type StatementRecord = components["schemas"]["StatementRecordResponse"];

function StatementsPage() {
  useStatementStream();

  const [selectedAliasId, setSelectedAliasId] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [fileInputResetKey, setFileInputResetKey] = useState(0);
  const [activeBucket, setActiveBucket] = useState<BucketKey>("matched");

  const phase = useStatementStore((s) => s.phase);
  const statement = useStatementStore((s) => s.statement);
  const progressPct = useStatementStore((s) => s.progressPct);
  const errorMessage = useStatementStore((s) => s.errorMessage);
  const selectStatement = useStatementStore((s) => s.selectStatement);
  const resetStatement = useStatementStore((s) => s.reset);

  const aliasesQuery = useCardAliases();
  const statementsQuery = useStatements();
  const uploadMutation = useStatementUpload();
  const processMutation = useProcessStatement(statement?.id ?? null);
  const reconciliationQuery = useStatementReconciliation(
    phase === "completed" ? (statement?.id ?? null) : null,
  );
  const reconcileMutation = useReconcileStatement(statement?.id ?? null);

  const selectedAlias = useMemo(
    () => aliasesQuery.data?.find((alias) => alias.id === selectedAliasId),
    [aliasesQuery.data, selectedAliasId],
  );

  function resetUploadInputs() {
    setSelectedFile(null);
    setPassword("");
    setConsentAccepted(false);
    setFileInputResetKey((key) => key + 1);
  }

  async function submitUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedFile) return;

    await uploadMutation.mutateAsync({
      file: selectedFile,
      cardAliasId: selectedAliasId || null,
      password: password || null,
      aiProcessingConsent: consentAccepted,
    });
    resetUploadInputs();
  }

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const updated = await processMutation.mutateAsync({
      password: password || null,
    });
    selectStatement(updated);
    setPassword("");
  }

  const reconciliation = reconciliationQuery.data;
  const activeItems = reconciliation?.[activeBucket] ?? [];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1
            className="text-2xl font-semibold"
            style={{ color: "var(--text)" }}
          >
            Statements
          </h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Upload credit-card PDFs, reconcile them against receipt transactions,
            and review unmatched rows before creating anything new.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            resetStatement();
            resetUploadInputs();
          }}
          className="rounded-md border px-3 py-2 text-sm font-medium"
          style={{ borderColor: "var(--border)", color: "var(--text)" }}
        >
          New scan
        </button>
      </header>

      <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
        <div className="space-y-5">
          <UploadPanel
            aliases={aliasesQuery.data ?? []}
            aliasesLoading={aliasesQuery.isLoading}
            selectedAliasId={selectedAliasId}
            selectedAlias={selectedAlias}
            selectedFile={selectedFile}
            fileInputResetKey={fileInputResetKey}
            password={password}
            consentAccepted={consentAccepted}
            disabled={phase === "uploading" || uploadMutation.isPending}
            errorMessage={uploadMutation.error?.message ?? null}
            onAliasChange={setSelectedAliasId}
            onFileChange={setSelectedFile}
            onPasswordChange={setPassword}
            onConsentChange={setConsentAccepted}
            onSubmit={submitUpload}
          />

          <AliasPanel aliases={aliasesQuery.data ?? []} />

          <RecentStatementsPanel
            statements={statementsQuery.data ?? []}
            activeStatementId={statement?.id ?? null}
            isLoading={statementsQuery.isLoading}
            onSelect={selectStatement}
          />
        </div>

        <main className="space-y-5">
          <StatusPanel
            statement={statement}
            phase={phase}
            progressPct={progressPct}
            errorMessage={errorMessage}
            password={password}
            processPending={processMutation.isPending}
            processError={processMutation.error?.message ?? null}
            onPasswordChange={setPassword}
            onPasswordSubmit={submitPassword}
          />

          {statement && phase === "completed" && (
            <ReconciliationPanel
              reconciliation={reconciliation}
              isLoading={reconciliationQuery.isLoading}
              errorMessage={reconciliationQuery.error?.message ?? null}
              activeBucket={activeBucket}
              activeItems={activeItems}
              reconcilePending={reconcileMutation.isPending}
              onBucketChange={setActiveBucket}
              onReconcile={() => void reconcileMutation.mutateAsync()}
            />
          )}
        </main>
      </div>
    </div>
  );
}

interface UploadPanelProps {
  aliases: readonly CardAlias[];
  aliasesLoading: boolean;
  selectedAliasId: string;
  selectedAlias: CardAlias | undefined;
  selectedFile: File | null;
  fileInputResetKey: number;
  password: string;
  consentAccepted: boolean;
  disabled: boolean;
  errorMessage: string | null;
  onAliasChange: (aliasId: string) => void;
  onFileChange: (file: File | null) => void;
  onPasswordChange: (password: string) => void;
  onConsentChange: (accepted: boolean) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

function UploadPanel({
  aliases,
  aliasesLoading,
  selectedAliasId,
  selectedAlias,
  selectedFile,
  fileInputResetKey,
  password,
  consentAccepted,
  disabled,
  errorMessage,
  onAliasChange,
  onFileChange,
  onPasswordChange,
  onConsentChange,
  onSubmit,
}: UploadPanelProps) {
  const fileLabel = selectedFile
    ? `${selectedFile.name} (${Math.ceil(selectedFile.size / 1024)} KB)`
    : "No PDF selected";
  const canSubmit = Boolean(selectedFile) && consentAccepted && !disabled;

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    onFileChange(event.target.files?.[0] ?? null);
  }

  return (
    <section
      className="space-y-4 rounded-lg border p-4"
      style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
    >
      <div>
        <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>
          Upload statement
        </h2>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Consent is required before every statement scan.
        </p>
      </div>

      <form className="space-y-4" onSubmit={onSubmit}>
        <label className="block space-y-1 text-sm">
          <span style={{ color: "var(--text-secondary)" }}>Card alias</span>
          <select
            value={selectedAliasId}
            onChange={(event) => onAliasChange(event.target.value)}
            className="w-full rounded-md border bg-transparent px-3 py-2"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
            disabled={aliasesLoading || disabled}
          >
            <option value="">No alias</option>
            {aliases.map((alias) => (
              <option key={alias.id} value={alias.id}>
                {alias.name}
              </option>
            ))}
          </select>
        </label>

        <label
          className="block cursor-pointer rounded-lg border border-dashed p-4"
          style={{ borderColor: "var(--border)" }}
        >
          <span className="block text-sm font-medium" style={{ color: "var(--text)" }}>
            PDF file
          </span>
          <span className="block text-xs" style={{ color: "var(--text-muted)" }}>
            {fileLabel}
          </span>
          <input
            key={fileInputResetKey}
            type="file"
            accept="application/pdf,.pdf"
            className="sr-only"
            disabled={disabled}
            onChange={handleFileChange}
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span style={{ color: "var(--text-secondary)" }}>
            Password, if encrypted
          </span>
          <input
            type="password"
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            className="w-full rounded-md border bg-transparent px-3 py-2"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
            disabled={disabled}
            autoComplete="off"
          />
        </label>

        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={consentAccepted}
            onChange={(event) => onConsentChange(event.target.checked)}
            className="mt-1"
            disabled={disabled}
          />
          <span style={{ color: "var(--text-secondary)" }}>
            I consent to AI processing if this statement cannot be handled by
            the deterministic parser. This applies only to this scan.
          </span>
        </label>

        {selectedAlias && (
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Alias selected: {selectedAlias.name}
          </p>
        )}

        {errorMessage && (
          <p role="alert" className="text-sm" style={{ color: "var(--error)" }}>
            {errorMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full rounded-md px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          style={{ backgroundColor: "var(--primary)" }}
        >
          Start statement scan
        </button>
      </form>
    </section>
  );
}

function AliasPanel({ aliases }: { aliases: readonly CardAlias[] }) {
  const [name, setName] = useState("");
  const createAlias = useCreateCardAlias();

  async function submitAlias(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    await createAlias.mutateAsync({ name: trimmed });
    setName("");
  }

  return (
    <section
      className="space-y-4 rounded-lg border p-4"
      style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
    >
      <div>
        <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>
          Card aliases
        </h2>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Use labels only. Do not enter card numbers, CVV, or expiry.
        </p>
      </div>

      <form className="flex gap-2" onSubmit={submitAlias}>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Personal credit"
          className="min-w-0 flex-1 rounded-md border bg-transparent px-3 py-2 text-sm"
          style={{ borderColor: "var(--border)", color: "var(--text)" }}
        />
        <button
          type="submit"
          className="rounded-md px-3 py-2 text-sm font-medium text-white"
          style={{ backgroundColor: "var(--primary)" }}
        >
          Add
        </button>
      </form>

      <div className="space-y-2">
        {aliases.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            No aliases yet.
          </p>
        ) : (
          aliases.map((alias) => <AliasRow key={alias.id} alias={alias} />)
        )}
      </div>
    </section>
  );
}

function AliasRow({ alias }: { alias: CardAlias }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(alias.name);
  const updateAlias = useUpdateCardAlias(alias.id);
  const archiveAlias = useArchiveCardAlias(alias.id);

  async function save() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === alias.name) {
      setEditing(false);
      setName(alias.name);
      return;
    }
    await updateAlias.mutateAsync({ name: trimmed });
    setEditing(false);
  }

  return (
    <div
      className="flex items-center gap-2 rounded-md border px-3 py-2"
      style={{ borderColor: "var(--border)" }}
    >
      {editing ? (
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          onBlur={() => void save()}
          className="min-w-0 flex-1 bg-transparent text-sm"
          style={{ color: "var(--text)" }}
          autoFocus
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="min-w-0 flex-1 truncate text-left text-sm"
          style={{ color: "var(--text)" }}
        >
          {alias.name}
        </button>
      )}
      <button
        type="button"
        onClick={() => void archiveAlias.mutateAsync()}
        className="rounded-md px-2 py-1 text-xs"
        style={{ color: "var(--text-muted)" }}
      >
        Archive
      </button>
    </div>
  );
}

interface RecentStatementsPanelProps {
  statements: readonly StatementRecord[];
  activeStatementId: string | null;
  isLoading: boolean;
  onSelect: (statement: StatementRecord) => void;
}

function RecentStatementsPanel({
  statements,
  activeStatementId,
  isLoading,
  onSelect,
}: RecentStatementsPanelProps) {
  return (
    <section
      className="space-y-3 rounded-lg border p-4"
      style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
    >
      <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>
        Recent statements
      </h2>
      {isLoading ? (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Loading statements...
        </p>
      ) : statements.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          No statement scans yet.
        </p>
      ) : (
        <div className="space-y-2">
          {statements.map((statement) => (
            <button
              key={statement.id}
              type="button"
              onClick={() => onSelect(statement)}
              className="w-full rounded-md border px-3 py-2 text-left"
              style={{
                borderColor:
                  activeStatementId === statement.id
                    ? "var(--primary)"
                    : "var(--border)",
                backgroundColor:
                  activeStatementId === statement.id
                    ? "var(--primary-light)"
                    : "transparent",
              }}
            >
              <span
                className="block truncate text-sm font-medium"
                style={{ color: "var(--text)" }}
              >
                {statement.original_filename}
              </span>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                {statement.status.replaceAll("_", " ")}
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

interface StatusPanelProps {
  statement: StatementRecord | null;
  phase: string;
  progressPct: number;
  errorMessage: string | null;
  password: string;
  processPending: boolean;
  processError: string | null;
  onPasswordChange: (password: string) => void;
  onPasswordSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

function StatusPanel({
  statement,
  phase,
  progressPct,
  errorMessage,
  password,
  processPending,
  processError,
  onPasswordChange,
  onPasswordSubmit,
}: StatusPanelProps) {
  return (
    <section
      className="rounded-lg border p-5"
      style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
    >
      {!statement ? (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold" style={{ color: "var(--text)" }}>
            Statement reconciliation
          </h2>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Upload a PDF to extract statement lines and compare them with your
            saved receipt transactions.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2
                className="text-lg font-semibold"
                style={{ color: "var(--text)" }}
              >
                {statement.original_filename}
              </h2>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                {statement.status.replaceAll("_", " ")}
              </p>
            </div>
            <span
              className="rounded-md px-2 py-1 text-xs font-medium"
              style={{
                backgroundColor: "var(--primary-light)",
                color: "var(--primary)",
              }}
            >
              {phase.replaceAll("_", " ")}
            </span>
          </div>

          <div>
            <div
              className="h-2 overflow-hidden rounded-full"
              style={{ backgroundColor: "var(--border)" }}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.max(0, Math.min(progressPct, 100))}%`,
                  backgroundColor:
                    phase === "failed" ||
                    phase === "password_required" ||
                    phase === "password_invalid"
                      ? "var(--warning)"
                      : "var(--primary)",
                }}
              />
            </div>
            <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
              {progressPct}% complete
            </p>
          </div>

          {(phase === "password_required" || phase === "password_invalid") && (
            <form className="flex flex-col gap-2 sm:flex-row" onSubmit={onPasswordSubmit}>
              <input
                type="password"
                value={password}
                onChange={(event) => onPasswordChange(event.target.value)}
                placeholder="Statement password"
                className="min-w-0 flex-1 rounded-md border bg-transparent px-3 py-2 text-sm"
                style={{ borderColor: "var(--border)", color: "var(--text)" }}
                autoComplete="off"
              />
              <button
                type="submit"
                disabled={processPending}
                className="rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                style={{ backgroundColor: "var(--primary)" }}
              >
                Unlock and process
              </button>
            </form>
          )}

          {(errorMessage || processError) && (
            <p role="alert" className="text-sm" style={{ color: "var(--error)" }}>
              {processError ?? errorMessage}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
