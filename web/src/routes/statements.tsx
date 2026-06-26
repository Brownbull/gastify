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
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { components } from "@/lib/api-types";

export const Route = createFileRoute("/statements")({
  component: StatementsPage,
});

type CardAlias = components["schemas"]["CardAliasResponse"];
type StatementRecord = components["schemas"]["StatementRecordResponse"];

const inputClass =
  "w-full rounded-gt-lg border-2 border-gt-line bg-gt-surface px-gt-10 py-gt-8 text-gt-sm font-bold text-gt-ink focus-visible:outline-none focus-visible:border-gt-line-strong";

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
    <div className="space-y-gt-16">
      <header className="flex flex-col gap-gt-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-gt-display text-gt-4xl font-extrabold text-gt-ink">Statements</h1>
          <p className="mt-gt-2 text-gt-sm font-medium text-gt-ink-2">
            Upload credit-card PDFs, reconcile them against receipt transactions,
            and review unmatched rows before creating anything new.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            resetStatement();
            resetUploadInputs();
          }}
        >
          New scan
        </Button>
      </header>

      <div className="grid gap-gt-16 xl:grid-cols-[380px_minmax(0,1fr)]">
        <div className="space-y-gt-16">
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

        <main className="space-y-gt-16">
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
    <Card className="space-y-gt-12">
      <div>
        <h2 className="font-gt-display text-gt-md font-extrabold text-gt-ink">Upload statement</h2>
        <p className="text-gt-sm font-medium text-gt-ink-2">
          Consent is required before every statement scan.
        </p>
      </div>

      <form className="space-y-gt-12" onSubmit={onSubmit}>
        <label className="block space-y-gt-2">
          <span className="text-gt-xs font-extrabold uppercase tracking-wide text-gt-ink-3">Card alias</span>
          <select
            value={selectedAliasId}
            onChange={(event) => onAliasChange(event.target.value)}
            className={inputClass}
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

        <label className="block cursor-pointer rounded-gt-xl border-2 border-dashed border-gt-line-strong bg-gt-surface p-gt-12 transition hover:border-gt-primary">
          <span className="block font-gt-display text-gt-sm font-extrabold text-gt-ink">PDF file</span>
          <span className="block text-gt-xs font-medium text-gt-ink-3">{fileLabel}</span>
          <input
            key={fileInputResetKey}
            type="file"
            accept="application/pdf,.pdf"
            className="sr-only"
            disabled={disabled}
            onChange={handleFileChange}
          />
        </label>

        <label className="block space-y-gt-2">
          <span className="text-gt-xs font-extrabold uppercase tracking-wide text-gt-ink-3">
            Password, if encrypted
          </span>
          <input
            type="password"
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            className={inputClass}
            disabled={disabled}
            autoComplete="off"
          />
        </label>

        <label className="flex items-start gap-gt-8 text-gt-sm">
          <input
            type="checkbox"
            checked={consentAccepted}
            onChange={(event) => onConsentChange(event.target.checked)}
            className="mt-1 h-5 w-5 accent-gt-primary"
            disabled={disabled}
          />
          <span className="font-medium text-gt-ink-2">
            I consent to AI processing if this statement cannot be handled by
            the deterministic parser. This applies only to this scan.
          </span>
        </label>

        {selectedAlias && (
          <p className="text-gt-xs font-medium text-gt-ink-3">Alias selected: {selectedAlias.name}</p>
        )}

        {errorMessage && (
          <p role="alert" className="text-gt-sm font-bold text-gt-error">
            {errorMessage}
          </p>
        )}

        <Button type="submit" fullWidth disabled={!canSubmit}>
          Start statement scan
        </Button>
      </form>
    </Card>
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
    <Card className="space-y-gt-12">
      <div>
        <h2 className="font-gt-display text-gt-md font-extrabold text-gt-ink">Card aliases</h2>
        <p className="text-gt-sm font-medium text-gt-ink-2">
          Use labels only. Do not enter card numbers, CVV, or expiry.
        </p>
      </div>

      <form className="flex gap-gt-6" onSubmit={submitAlias}>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Personal credit"
          className={`${inputClass} min-w-0 flex-1`}
        />
        <Button type="submit" size="sm">
          Add
        </Button>
      </form>

      <div className="space-y-gt-6">
        {aliases.length === 0 ? (
          <p className="text-gt-sm font-medium text-gt-ink-3">No aliases yet.</p>
        ) : (
          aliases.map((alias) => <AliasRow key={alias.id} alias={alias} />)
        )}
      </div>
    </Card>
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
    <div className="flex items-center gap-gt-6 rounded-gt-lg border-2 border-gt-line px-gt-10 py-gt-8">
      {editing ? (
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          onBlur={() => void save()}
          className="min-w-0 flex-1 bg-transparent text-gt-sm font-bold text-gt-ink outline-none"
          autoFocus
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="min-w-0 flex-1 truncate text-left text-gt-sm font-bold text-gt-ink"
        >
          {alias.name}
        </button>
      )}
      <button
        type="button"
        onClick={() => void archiveAlias.mutateAsync()}
        className="rounded-gt-md px-gt-6 py-gt-2 text-gt-xs font-bold text-gt-ink-3 hover:text-gt-ink"
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
    <Card className="space-y-gt-10">
      <h2 className="font-gt-display text-gt-md font-extrabold text-gt-ink">Recent statements</h2>
      {isLoading ? (
        <p className="text-gt-sm font-medium text-gt-ink-3">Loading statements...</p>
      ) : statements.length === 0 ? (
        <p className="text-gt-sm font-medium text-gt-ink-3">No statement scans yet.</p>
      ) : (
        <div className="space-y-gt-6">
          {statements.map((statement) => (
            <button
              key={statement.id}
              type="button"
              onClick={() => onSelect(statement)}
              className={`w-full rounded-gt-lg border-2 px-gt-10 py-gt-8 text-left transition ${
                activeStatementId === statement.id
                  ? "border-gt-line-strong bg-gt-primary-soft"
                  : "border-gt-line bg-gt-surface hover:border-gt-line-strong"
              }`}
            >
              <span className="block truncate text-gt-sm font-extrabold text-gt-ink">
                {statement.original_filename}
              </span>
              <span className="text-gt-xs font-bold text-gt-ink-3">
                {statement.status.replaceAll("_", " ")}
              </span>
            </button>
          ))}
        </div>
      )}
    </Card>
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
  const warnPhase =
    phase === "failed" || phase === "password_required" || phase === "password_invalid";

  return (
    <Card>
      {!statement ? (
        <div className="space-y-gt-4">
          <h2 className="font-gt-display text-gt-lg font-extrabold text-gt-ink">Statement reconciliation</h2>
          <p className="text-gt-sm font-medium text-gt-ink-2">
            Upload a PDF to extract statement lines and compare them with your
            saved receipt transactions.
          </p>
        </div>
      ) : (
        <div className="space-y-gt-12">
          <div className="flex flex-col gap-gt-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="font-gt-display text-gt-lg font-extrabold text-gt-ink">
                {statement.original_filename}
              </h2>
              <p className="text-gt-sm font-medium text-gt-ink-2">
                {statement.status.replaceAll("_", " ")}
              </p>
            </div>
            <Badge tone={warnPhase ? "warning" : "primary"}>{phase.replaceAll("_", " ")}</Badge>
          </div>

          <div>
            <div className="h-3 overflow-hidden rounded-gt-pill border-2 border-gt-line-strong bg-gt-bg-3">
              <div
                className={`h-full rounded-gt-pill transition-all ${warnPhase ? "bg-gt-warning" : "bg-gt-primary"}`}
                style={{ width: `${Math.max(0, Math.min(progressPct, 100))}%` }}
              />
            </div>
            <p className="mt-gt-2 text-gt-xs font-bold text-gt-ink-3">{progressPct}% complete</p>
          </div>

          {(phase === "password_required" || phase === "password_invalid") && (
            <form className="flex flex-col gap-gt-6 sm:flex-row" onSubmit={onPasswordSubmit}>
              <input
                type="password"
                value={password}
                onChange={(event) => onPasswordChange(event.target.value)}
                placeholder="Statement password"
                className={`${inputClass} min-w-0 flex-1`}
                autoComplete="off"
              />
              <Button type="submit" size="sm" disabled={processPending}>
                Unlock and process
              </Button>
            </form>
          )}

          {(errorMessage || processError) && (
            <p role="alert" className="text-gt-sm font-bold text-gt-error">
              {processError ?? errorMessage}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
