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
    <section className="space-y-gt-12 rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface p-gt-16 shadow-gt-md">
      <div className="flex items-center justify-between">
        <h2 className="font-gt-display text-gt-lg font-extrabold text-gt-ink">
          {phase === "uploading" ? "Uploading..." : "Scanning Receipt"}
        </h2>
        {progressPct > 0 && (
          <span className="font-gt-display text-gt-sm font-extrabold text-gt-primary">{progressPct}%</span>
        )}
      </div>

      {phase === "uploading" && (
        <div className="h-3 overflow-hidden rounded-gt-pill border-2 border-gt-line-strong bg-gt-bg-3">
          <div className="h-full animate-pulse rounded-gt-pill bg-gt-primary" style={{ width: "60%" }} />
        </div>
      )}

      {phase !== "uploading" && (
        <div className="space-y-gt-2">
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
    </section>
  );
}

interface StageRowProps {
  label: string;
  description: string;
  status: "done" | "active" | "pending";
}

function StageRow({ label, description, status }: StageRowProps) {
  return (
    <div className="flex items-center gap-gt-8 py-gt-2">
      <StageIndicator status={status} />
      <div>
        <p className={`text-gt-sm font-extrabold ${status === "pending" ? "text-gt-ink-3" : "text-gt-ink"}`}>
          {label}
        </p>
        <p className="text-gt-xs font-medium text-gt-ink-3">{description}</p>
      </div>
    </div>
  );
}

function StageIndicator({ status }: { status: "done" | "active" | "pending" }) {
  if (status === "done") {
    return (
      <div className="grid h-7 w-7 shrink-0 place-items-center rounded-gt-pill border-2 border-gt-line-strong bg-gt-primary text-gt-xs font-extrabold text-white">
        ✓
      </div>
    );
  }
  if (status === "active") {
    return (
      <div className="grid h-7 w-7 shrink-0 place-items-center rounded-gt-pill border-2 border-gt-line-strong bg-gt-primary-soft shadow-gt-xs">
        <div className="h-2.5 w-2.5 animate-pulse rounded-gt-pill bg-gt-primary" />
      </div>
    );
  }
  return <div className="h-7 w-7 shrink-0 rounded-gt-pill border-2 border-gt-line" />;
}
