import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Button,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { ScreenShell } from "../components/ScreenShell";
import { useStatementDocumentPicker } from "../hooks/useStatementDocumentPicker";
import { useStatementProgressSocket } from "../hooks/useStatementProgressSocket";
import {
  useCardAliases,
  useCreateCardAlias,
  useCreateStatementTransaction,
  useProcessStatement,
  useReconcileStatement,
  useStatementReconciliation,
  useStatementUpload,
  useStatements,
} from "../hooks/useStatements";
import { formatDate, formatMinorAmount, formatTimestamp } from "../lib/format";
import type {
  CardAlias,
  StatementReconciliationBucketItem,
  StatementRecord,
  StatementTransactionCandidate,
  TransactionCreate,
} from "../lib/statements";
import {
  useStatementStore,
  type StatementPdfAsset,
  type StatementPhase,
} from "../stores/statementStore";
import { styles } from "./statementStyles";

const BUCKETS = [
  { key: "matched", label: "Matched" },
  { key: "statement_only", label: "Statement only" },
  { key: "receipt_only", label: "App only" },
  { key: "ambiguous", label: "Ambiguous" },
  { key: "failed", label: "Failed" },
] as const;

type BucketKey = (typeof BUCKETS)[number]["key"];

const STAGES: readonly { phase: StatementPhase; label: string; description: string }[] = [
  { phase: "queued", label: "Queued", description: "Statement received" },
  { phase: "extracting", label: "Extracting", description: "Reading PDF lines" },
  { phase: "reconciling", label: "Reconciling", description: "Matching app transactions" },
  { phase: "completed", label: "Complete", description: "Buckets ready" },
];

const PHASE_ORDER = STAGES.reduce<Record<string, number>>((acc, stage, index) => {
  acc[stage.phase] = index;
  return acc;
}, {});

export function StatementsScreen() {
  useStatementProgressSocket();

  const [selectedAsset, setSelectedAsset] = useState<StatementPdfAsset | null>(null);
  const [selectedAliasId, setSelectedAliasId] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [newAliasName, setNewAliasName] = useState("");
  const [activeBucket, setActiveBucket] = useState<BucketKey>("matched");
  const [createdCandidateIds, setCreatedCandidateIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  const phase = useStatementStore((state) => state.phase);
  const statement = useStatementStore((state) => state.statement);
  const progressPct = useStatementStore((state) => state.progressPct);
  const connectionStatus = useStatementStore((state) => state.connectionStatus);
  const connectionMessage = useStatementStore((state) => state.connectionMessage);
  const reconnectAttempt = useStatementStore((state) => state.reconnectAttempt);
  const errorCode = useStatementStore((state) => state.errorCode);
  const errorMessage = useStatementStore((state) => state.errorMessage);
  const resetStatement = useStatementStore((state) => state.reset);
  const selectStatement = useStatementStore((state) => state.selectStatement);

  const aliasesQuery = useCardAliases();
  const statementsQuery = useStatements();
  const createAlias = useCreateCardAlias();
  const upload = useStatementUpload();
  const processMutation = useProcessStatement(statement?.id ?? null);
  const reconciliationQuery = useStatementReconciliation(
    phase === "completed" ? (statement?.id ?? null) : null,
  );
  const reconcileMutation = useReconcileStatement(statement?.id ?? null);
  const createTransaction = useCreateStatementTransaction();
  const { choosePdf } = useStatementDocumentPicker();

  const selectedAlias = useMemo(
    () => aliasesQuery.data?.find((alias) => alias.id === selectedAliasId),
    [aliasesQuery.data, selectedAliasId],
  );

  const reconciliation = reconciliationQuery.data;
  const activeItems = reconciliation?.[activeBucket] ?? [];
  const uploadLocked =
    phase === "uploading" ||
    phase === "queued" ||
    phase === "extracting" ||
    phase === "reconciling" ||
    upload.isUploading;
  const canSubmit = Boolean(selectedAsset) && consentAccepted && !uploadLocked;

  useEffect(() => {
    setCreatedCandidateIds(new Set());
  }, [statement?.id]);

  async function chooseStatementPdf() {
    const asset = await choosePdf();
    if (asset) setSelectedAsset(asset);
  }

  async function submitStatementUpload() {
    if (!selectedAsset || !canSubmit) return;
    const response = await upload.uploadStatement({
      asset: selectedAsset,
      cardAliasId: selectedAliasId,
      password: password || null,
      aiProcessingConsent: consentAccepted,
    });
    if (response) {
      setSelectedAsset(null);
      setPassword("");
      setConsentAccepted(false);
    }
  }

  async function submitAlias() {
    const trimmed = newAliasName.trim();
    if (!trimmed) return;
    const alias = await createAlias.mutateAsync({ name: trimmed });
    setSelectedAliasId(alias.id);
    setNewAliasName("");
  }

  async function submitPassword() {
    await processMutation.mutateAsync({ password: password || null });
    setPassword("");
  }

  async function createCandidate(
    verdictId: string,
    candidate: StatementTransactionCandidate,
  ) {
    await createTransaction.mutateAsync(candidate as TransactionCreate);
    setCreatedCandidateIds((current) => new Set(current).add(verdictId));
  }

  return (
    <ScreenShell>
      <View style={styles.header} testID="statements-screen">
        <Text style={styles.eyebrow}>Statements</Text>
        <Text style={styles.title}>Credit card reconciliation</Text>
        <Text style={styles.body}>
          Upload a statement PDF, follow processing progress, and review matched,
          statement-only, and app-only buckets.
        </Text>
      </View>

      <View style={styles.panel} testID="statement-upload-panel">
        <View style={styles.panelHeader}>
          <View>
            <Text style={styles.label}>Statement scan</Text>
            <Text style={styles.panelTitle}>PDF upload</Text>
          </View>
          {upload.isUploading ? <ActivityIndicator color="#2563eb" /> : null}
        </View>

        <AliasSelector
          aliases={aliasesQuery.data ?? []}
          selectedAliasId={selectedAliasId}
          isLoading={aliasesQuery.isLoading}
          onSelect={setSelectedAliasId}
        />

        <View style={styles.aliasCreateRow}>
          <TextInput
            autoCapitalize="words"
            onChangeText={setNewAliasName}
            placeholder="New card alias"
            style={styles.textInput}
            testID="statement-new-alias-input"
            value={newAliasName}
          />
          <View style={styles.aliasCreateButton}>
            <Button
              title="Add"
              testID="statement-add-alias-button"
              onPress={() => void submitAlias()}
              disabled={createAlias.isPending || newAliasName.trim().length === 0}
            />
          </View>
        </View>

        <Button
          title="Choose statement PDF"
          testID="statement-choose-pdf-button"
          onPress={() => void chooseStatementPdf()}
          disabled={uploadLocked}
        />
        <PdfPreview asset={selectedAsset} />

        <TextInput
          autoCapitalize="none"
          onChangeText={setPassword}
          placeholder="Password if encrypted"
          secureTextEntry
          style={styles.textInput}
          testID="statement-password-input"
          value={password}
        />

        <View style={styles.consentRow}>
          <Switch
            testID="statement-ai-consent-switch"
            value={consentAccepted}
            onValueChange={setConsentAccepted}
            disabled={uploadLocked}
          />
          <Text style={styles.consentText}>
            I consent to AI processing if deterministic parsing cannot handle this
            statement. This applies only to this scan.
          </Text>
        </View>

        {selectedAlias ? (
          <Text style={styles.mutedText}>Alias selected: {selectedAlias.name}</Text>
        ) : null}

        <Button
          title="Start statement scan"
          testID="statement-start-scan-button"
          onPress={() => void submitStatementUpload()}
          disabled={!canSubmit}
        />
      </View>

      <StatementStatusPanel
        connectionMessage={connectionMessage}
        connectionStatus={connectionStatus}
        errorCode={errorCode}
        errorMessage={errorMessage}
        onPasswordChange={setPassword}
        onPasswordSubmit={submitPassword}
        onReset={() => {
          resetStatement();
          setSelectedAsset(null);
          setPassword("");
          setConsentAccepted(false);
        }}
        password={password}
        phase={phase}
        processPending={processMutation.isPending}
        processError={processMutation.error?.message ?? null}
        progressPct={progressPct}
        reconnectAttempt={reconnectAttempt}
        statement={statement}
      />

      {statement && phase === "completed" ? (
        <ReconciliationPanel
          activeBucket={activeBucket}
          activeItems={activeItems}
          createdCandidateIds={createdCandidateIds}
          createPending={createTransaction.isPending}
          errorMessage={reconciliationQuery.error?.message ?? null}
          isLoading={reconciliationQuery.isLoading}
          onBucketChange={setActiveBucket}
          onCreateCandidate={createCandidate}
          onReconcile={() => void reconcileMutation.mutateAsync()}
          reconcilePending={reconcileMutation.isPending}
          reconciliation={reconciliation}
        />
      ) : null}

      <RecentStatementsPanel
        activeStatementId={statement?.id ?? null}
        isLoading={statementsQuery.isLoading}
        onSelect={selectStatement}
        statements={statementsQuery.data ?? []}
      />
    </ScreenShell>
  );
}

function AliasSelector({
  aliases,
  isLoading,
  onSelect,
  selectedAliasId,
}: {
  aliases: readonly CardAlias[];
  isLoading: boolean;
  onSelect: (aliasId: string | null) => void;
  selectedAliasId: string | null;
}) {
  return (
    <View style={styles.aliasSelector} testID="statement-alias-selector">
      <Text style={styles.label}>Card alias</Text>
      {isLoading ? (
        <Text style={styles.mutedText}>Loading aliases...</Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chipRow}>
            <AliasChip
              label="No alias"
              selected={selectedAliasId == null}
              testID="statement-alias-none"
              onPress={() => onSelect(null)}
            />
            {aliases.map((alias) => (
              <AliasChip
                key={alias.id}
                label={alias.name}
                selected={selectedAliasId === alias.id}
                testID={`statement-alias-${alias.id}`}
                onPress={() => onSelect(alias.id)}
              />
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function AliasChip({
  label,
  onPress,
  selected,
  testID,
}: {
  label: string;
  onPress: () => void;
  selected: boolean;
  testID: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
      testID={testID}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

function PdfPreview({ asset }: { asset: StatementPdfAsset | null }) {
  return (
    <View style={styles.previewRow} testID="statement-pdf-preview">
      <View style={styles.previewBadge}>
        <Text style={styles.previewBadgeText}>PDF</Text>
      </View>
      <View style={styles.previewMeta}>
        <Text style={styles.previewTitle}>
          {asset ? asset.fileName : "No PDF selected"}
        </Text>
        <Text style={styles.previewDetail}>
          {asset?.fileSize ? formatBytes(asset.fileSize) : "Select a credit card statement"}
        </Text>
      </View>
    </View>
  );
}

function StatementStatusPanel({
  connectionMessage,
  connectionStatus,
  errorCode,
  errorMessage,
  onPasswordChange,
  onPasswordSubmit,
  onReset,
  password,
  phase,
  processError,
  processPending,
  progressPct,
  reconnectAttempt,
  statement,
}: {
  connectionMessage: string | null;
  connectionStatus: string;
  errorCode: string | null;
  errorMessage: string | null;
  onPasswordChange: (password: string) => void;
  onPasswordSubmit: () => Promise<void>;
  onReset: () => void;
  password: string;
  phase: StatementPhase;
  processError: string | null;
  processPending: boolean;
  progressPct: number;
  reconnectAttempt: number;
  statement: StatementRecord | null;
}) {
  if (!statement && phase === "idle") return null;

  const isPasswordState = phase === "password_required" || phase === "password_invalid";
  const isFailure = phase === "failed" || isPasswordState;

  return (
    <View style={[styles.panel, isFailure && styles.warningPanel]} testID="statement-status-panel">
      <View style={styles.panelHeader}>
        <View style={styles.flexOne}>
          <Text style={styles.label}>Processing</Text>
          <Text style={styles.panelTitle}>
            {statement?.original_filename ?? "Statement upload"}
          </Text>
          {statement ? (
            <Text style={styles.panelBody}>
              {statement.status.replaceAll("_", " ")} - uploaded{" "}
              {formatTimestamp(statement.uploaded_at)}
            </Text>
          ) : null}
        </View>
        <Text style={styles.progressPct}>{progressPct}%</Text>
      </View>

      {phase === "uploading" ? (
        <View style={styles.uploadBar}>
          <View style={styles.uploadBarFill} />
        </View>
      ) : (
        <View style={styles.stageList}>
          {STAGES.map((stage) => (
            <StageRow key={stage.phase} currentPhase={phase} stage={stage} />
          ))}
        </View>
      )}

      {connectionMessage ? (
        <Text style={styles.connectionText} testID="statement-connection-status">
          {connectionMessage}
        </Text>
      ) : null}
      {connectionStatus === "reconnecting" ? (
        <Text style={styles.connectionText}>Reconnect attempt {reconnectAttempt}</Text>
      ) : null}

      {isPasswordState ? (
        <View style={styles.passwordPanel} testID="statement-password-panel">
          <Text style={styles.warningText}>
            {phase === "password_invalid"
              ? "The password was invalid. Try again."
              : "This statement needs a password."}
          </Text>
          <TextInput
            autoCapitalize="none"
            onChangeText={onPasswordChange}
            placeholder="Statement password"
            secureTextEntry
            style={styles.textInput}
            testID="statement-unlock-password-input"
            value={password}
          />
          <Button
            title="Unlock and process"
            testID="statement-unlock-button"
            disabled={processPending}
            onPress={() => void onPasswordSubmit()}
          />
        </View>
      ) : null}

      {errorMessage || processError ? (
        <Text style={styles.errorText} testID="statement-error-message">
          {processError ?? errorMessage}
          {errorCode ? ` (${errorCode})` : ""}
        </Text>
      ) : null}

      {phase === "failed" ? (
        <Button title="Reset statement" testID="statement-reset-button" onPress={onReset} />
      ) : null}
    </View>
  );
}

function StageRow({
  currentPhase,
  stage,
}: {
  currentPhase: StatementPhase;
  stage: { phase: StatementPhase; label: string; description: string };
}) {
  const status = getStageStatus(stage.phase, currentPhase);

  return (
    <View style={styles.stageRow}>
      <View
        style={[
          styles.stageDot,
          status === "done" && styles.stageDotDone,
          status === "active" && styles.stageDotActive,
        ]}
      />
      <View>
        <Text
          style={[
            styles.stageLabel,
            status === "pending" && styles.stageTextPending,
          ]}
        >
          {stage.label}
        </Text>
        <Text style={styles.stageDescription}>{stage.description}</Text>
      </View>
    </View>
  );
}

function ReconciliationPanel({
  activeBucket,
  activeItems,
  createdCandidateIds,
  createPending,
  errorMessage,
  isLoading,
  onBucketChange,
  onCreateCandidate,
  onReconcile,
  reconcilePending,
  reconciliation,
}: {
  activeBucket: BucketKey;
  activeItems: readonly StatementReconciliationBucketItem[];
  createdCandidateIds: ReadonlySet<string>;
  createPending: boolean;
  errorMessage: string | null;
  isLoading: boolean;
  onBucketChange: (bucket: BucketKey) => void;
  onCreateCandidate: (
    verdictId: string,
    candidate: StatementTransactionCandidate,
  ) => Promise<void>;
  onReconcile: () => void;
  reconcilePending: boolean;
  reconciliation: ReturnType<typeof useStatementReconciliation>["data"];
}) {
  if (isLoading) {
    return (
      <View style={styles.panel} testID="statement-reconciliation-loading">
        <ActivityIndicator color="#2563eb" />
        <Text style={styles.mutedText}>Loading reconciliation...</Text>
      </View>
    );
  }

  if (errorMessage || !reconciliation) {
    return (
      <View style={styles.panel} testID="statement-reconciliation-unavailable">
        <Text style={styles.panelTitle}>Reconciliation not available</Text>
        <Text style={styles.panelBody}>
          Run matching when extraction is complete and the buckets are not ready yet.
        </Text>
        <Button
          title={reconcilePending ? "Reconciling..." : "Run reconciliation"}
          testID="statement-run-reconciliation-button"
          onPress={onReconcile}
          disabled={reconcilePending}
        />
      </View>
    );
  }

  const run = reconciliation.run;
  const coveragePct =
    run.coverage_ratio == null ? null : Math.round(run.coverage_ratio * 100);

  return (
    <View style={styles.panel} testID="statement-reconciliation-panel">
      <Text style={styles.label}>Coverage</Text>
      <View style={styles.metricGrid}>
        <Metric label="Coverage" value={coveragePct == null ? "--" : `${coveragePct}%`} />
        <Metric label="Matched" value={run.matched_count} />
        <Metric label="Statement only" value={run.statement_only_count} />
        <Metric label="App only" value={run.receipt_only_count} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.chipRow} testID="statement-bucket-tabs">
          {BUCKETS.map((bucket) => (
            <AliasChip
              key={bucket.key}
              label={`${bucket.label} (${reconciliation[bucket.key]?.length ?? 0})`}
              selected={activeBucket === bucket.key}
              testID={`statement-bucket-${bucket.key}`}
              onPress={() => onBucketChange(bucket.key)}
            />
          ))}
        </View>
      </ScrollView>

      <View style={styles.bucketList} testID={`statement-bucket-list-${activeBucket}`}>
        {activeItems.length === 0 ? (
          <Text style={styles.mutedText}>No rows in this bucket.</Text>
        ) : (
          activeItems.map((item) => (
            <BucketItem
              key={item.verdict.id}
              created={createdCandidateIds.has(item.verdict.id)}
              createPending={createPending}
              item={item}
              onCreateCandidate={onCreateCandidate}
              showCreate={activeBucket === "statement_only"}
            />
          ))
        )}
      </View>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function BucketItem({
  createPending,
  created,
  item,
  onCreateCandidate,
  showCreate,
}: {
  createPending: boolean;
  created: boolean;
  item: StatementReconciliationBucketItem;
  onCreateCandidate: (
    verdictId: string,
    candidate: StatementTransactionCandidate,
  ) => Promise<void>;
  showCreate: boolean;
}) {
  const line = item.statement_line;
  const transaction = item.receipt_transaction;
  const candidate = item.candidate_transaction;

  return (
    <View style={styles.bucketItem} testID={`statement-bucket-item-${item.verdict.id}`}>
      <View style={styles.bucketColumn}>
        <Text style={styles.label}>Statement</Text>
        {line ? (
          <LineSummary
            amountMinor={line.amount_minor}
            currency={line.currency}
            date={line.line_date}
            description={line.description}
            warningCount={line.warnings?.length ?? 0}
          />
        ) : (
          <Text style={styles.mutedText}>No statement row</Text>
        )}
      </View>
      <View style={styles.bucketColumn}>
        <Text style={styles.label}>App transaction</Text>
        {transaction ? (
          <LineSummary
            amountMinor={transaction.total_minor}
            currency={transaction.currency}
            date={transaction.transaction_date}
            description={transaction.merchant}
          />
        ) : candidate ? (
          <LineSummary
            amountMinor={candidate.total_minor}
            currency={candidate.currency}
            date={candidate.transaction_date}
            description={candidate.merchant}
            warningCount={candidate.items.filter((entry) => entry.is_flagged).length}
          />
        ) : (
          <Text style={styles.mutedText}>No candidate</Text>
        )}
      </View>
      <Text style={styles.panelBody}>
        {item.verdict.verdict.replaceAll("_", " ")}
        {item.verdict.score != null
          ? ` - score ${Math.round(item.verdict.score * 100)}%`
          : ""}
      </Text>
      {(item.verdict.reasons ?? []).slice(0, 2).map((reason) => (
        <Text key={reason} style={styles.mutedText}>
          {reason.replaceAll("_", " ")}
        </Text>
      ))}
      {showCreate && candidate && created ? (
        <View
          accessibilityLiveRegion="polite"
          style={styles.successBadge}
          testID={`statement-transaction-added-${item.verdict.id}`}
        >
          <Text style={styles.successText}>Transaction added</Text>
        </View>
      ) : null}
      {showCreate && candidate && !created ? (
        <Button
          title="Add transaction"
          testID={`statement-add-transaction-${item.verdict.id}`}
          onPress={() => void onCreateCandidate(item.verdict.id, candidate)}
          disabled={createPending}
        />
      ) : null}
    </View>
  );
}

function LineSummary({
  amountMinor,
  currency,
  date,
  description,
  warningCount = 0,
}: {
  amountMinor: number;
  currency: string;
  date?: string | null;
  description: string;
  warningCount?: number;
}) {
  return (
    <View>
      <Text style={styles.lineDescription}>{description}</Text>
      <Text style={styles.lineMeta}>
        {date ? formatDate(date) : "No date"} - {formatMinorAmount(amountMinor, currency)}
      </Text>
      {warningCount > 0 ? (
        <Text style={styles.warningText}>
          {warningCount} warning{warningCount === 1 ? "" : "s"}
        </Text>
      ) : null}
    </View>
  );
}

function RecentStatementsPanel({
  activeStatementId,
  isLoading,
  onSelect,
  statements,
}: {
  activeStatementId: string | null;
  isLoading: boolean;
  onSelect: (statement: StatementRecord) => void;
  statements: readonly StatementRecord[];
}) {
  return (
    <View style={styles.panel} testID="statement-recent-panel">
      <Text style={styles.label}>History</Text>
      <Text style={styles.panelTitle}>Recent statement scans</Text>
      {isLoading ? (
        <Text style={styles.mutedText}>Loading statements...</Text>
      ) : statements.length === 0 ? (
        <Text style={styles.mutedText}>No statement scans yet.</Text>
      ) : (
        <View style={styles.recentList}>
          {statements.slice(0, 5).map((statement) => (
            <Pressable
              accessibilityRole="button"
              key={statement.id}
              onPress={() => onSelect(statement)}
              style={[
                styles.recentRow,
                activeStatementId === statement.id && styles.recentRowActive,
              ]}
              testID={`statement-recent-${statement.id}`}
            >
              <Text style={styles.recentTitle}>{statement.original_filename}</Text>
              <Text style={styles.mutedText}>{statement.status.replaceAll("_", " ")}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

function getStageStatus(
  stagePhase: StatementPhase,
  currentPhase: StatementPhase,
): "done" | "active" | "pending" {
  const stageIdx = PHASE_ORDER[stagePhase] ?? -1;
  const currentIdx = PHASE_ORDER[currentPhase] ?? -1;
  if (currentIdx > stageIdx) return "done";
  if (currentIdx === stageIdx) return "active";
  return "pending";
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
