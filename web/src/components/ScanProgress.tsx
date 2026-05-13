import { useScanStore, type ScanPhase } from "@/stores/scanStore";

const STAGES: readonly { phase: ScanPhase; label: string; description: string }[] = [
  { phase: "submitted", label: "Submitted", description: "Receipt received" },
  { phase: "processing", label: "Processing", description: "Preparing image..." },
  { phase: "extracting", label: "Extracting", description: "Reading receipt data..." },
  { phase: "categorizing", label: "Categorizing", description: "Classifying items..." },
  { phase: "verified", label: "Verified", description: "Math checks passed" },
  { phase: "complete", label: "Complete", description: "Transaction ready" },
];

const PHASE_ORDER: Record<string, number> = {};
for (let i = 0; i < STAGES.length; i++) {
  PHASE_ORDER[STAGES[i].phase] = i;
}

function getStageStatus(
  stagePhase: ScanPhase,
  currentPhase: ScanPhase,
): "done" | "active" | "pending" {
  const stageIdx = PHASE_ORDER[stagePhase] ?? -1;
  const currentIdx = PHASE_ORDER[currentPhase] ?? -1;
  if (currentIdx > stageIdx) return "done";
  if (currentIdx === stageIdx) return "active";
  return "pending";
}

export function ScanProgress() {
  const phase = useScanStore((s) => s.phase);
  const progressPct = useScanStore((s) => s.progressPct);

  if (phase === "idle" || phase === "failed") return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2
          className="text-lg font-semibold"
          style={{ color: "var(--text)" }}
        >
          {phase === "uploading" ? "Uploading..." : "Scanning Receipt"}
        </h2>
        {progressPct > 0 && (
          <span
            className="text-sm font-medium"
            style={{ color: "var(--text-secondary)" }}
          >
            {progressPct}%
          </span>
        )}
      </div>

      {phase === "uploading" && (
        <div
          className="h-2 overflow-hidden rounded-full"
          style={{ backgroundColor: "var(--border)" }}
        >
          <div
            className="h-full animate-pulse rounded-full"
            style={{
              backgroundColor: "var(--primary)",
              width: "60%",
            }}
          />
        </div>
      )}

      {phase !== "uploading" && (
        <div className="space-y-2">
          {STAGES.map((stage) => {
            const status = getStageStatus(stage.phase, phase);
            return (
              <StageRow
                key={stage.phase}
                label={stage.label}
                description={stage.description}
                status={status}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

interface StageRowProps {
  label: string;
  description: string;
  status: "done" | "active" | "pending";
}

function StageRow({ label, description, status }: StageRowProps) {
  return (
    <div className="flex items-center gap-3 py-1">
      <StageIndicator status={status} />
      <div>
        <p
          className="text-sm font-medium"
          style={{
            color:
              status === "pending"
                ? "var(--text-muted)"
                : "var(--text)",
          }}
        >
          {label}
        </p>
        <p
          className="text-xs"
          style={{ color: "var(--text-muted)" }}
        >
          {description}
        </p>
      </div>
    </div>
  );
}

function StageIndicator({ status }: { status: "done" | "active" | "pending" }) {
  if (status === "done") {
    return (
      <div
        className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white"
        style={{ backgroundColor: "var(--success, #22c55e)" }}
      >
        ✓
      </div>
    );
  }
  if (status === "active") {
    return (
      <div
        className="flex h-6 w-6 items-center justify-center rounded-full"
        style={{
          backgroundColor: "var(--primary-light)",
          border: "2px solid var(--primary)",
        }}
      >
        <div
          className="h-2 w-2 animate-pulse rounded-full"
          style={{ backgroundColor: "var(--primary)" }}
        />
      </div>
    );
  }
  return (
    <div
      className="h-6 w-6 rounded-full border-2"
      style={{ borderColor: "var(--border)" }}
    />
  );
}
