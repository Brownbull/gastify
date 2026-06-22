import { ChevronDownIcon } from "@design-system/assets/icons";

/**
 * StepperButton — a directional prev/next nav button (period stepper, carousel).
 * Reuses the ChevronDownIcon rotated to the requested direction. Utility-action
 * affordance (navigation), so the stroke chevron is allowed per the icon
 * convention. Square geometric tile with optional border.
 */
export type StepperDirection = "prev" | "next";
export type StepperVariant = "plain" | "bordered";

export interface StepperButtonProps {
  direction: StepperDirection;
  onClick?: () => void;
  label: string;
  variant?: StepperVariant;
  disabled?: boolean;
  className?: string;
}

const rotation: Record<StepperDirection, string> = {
  prev: "rotate-90",
  next: "-rotate-90",
};

const variantClasses: Record<StepperVariant, string> = {
  plain: "text-gt-ink-3 hover:bg-gt-bg-3 hover:text-gt-ink",
  bordered:
    "border-2 border-gt-line-strong bg-gt-surface text-gt-ink shadow-gt-xs hover:-translate-y-0.5 hover:shadow-gt-sm active:translate-y-0",
};

export function StepperButton({ direction, onClick, label, variant = "plain", disabled, className = "" }: StepperButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`grid h-8 w-8 shrink-0 place-items-center rounded-gt-md transition duration-150 ease-gt-bounce focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gt-primary/25 disabled:pointer-events-none disabled:opacity-40 ${variantClasses[variant]} ${className}`}
    >
      <ChevronDownIcon className={`h-4 w-4 ${rotation[direction]}`} />
    </button>
  );
}
