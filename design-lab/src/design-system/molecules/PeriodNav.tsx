import { StepperButton } from "@design-system/atoms/StepperButton";

/**
 * PeriodNav — the period stepper for the analytics toolbar: prev · label · next.
 * Built on two StepperButtons. `bordered` gives the steppers a geometric tile
 * (for standalone bars); plain for inline use.
 */
export interface PeriodNavProps {
  label: string;
  onPrev?: () => void;
  onNext?: () => void;
  bordered?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function PeriodNav({ label, onPrev, onNext, bordered = false, size = "md", className = "" }: PeriodNavProps) {
  const variant = bordered ? "bordered" : "plain";
  return (
    <div className={`inline-flex items-center gap-gt-6 ${className}`}>
      <StepperButton direction="prev" label="Periodo anterior" onClick={onPrev} variant={variant} />
      <span className={`min-w-16 text-center font-extrabold text-gt-ink ${size === "sm" ? "text-gt-sm" : "text-gt-md"}`}>{label}</span>
      <StepperButton direction="next" label="Periodo siguiente" onClick={onNext} variant={variant} />
    </div>
  );
}
