import * as React from 'react';
import { Check } from 'lucide-react';

interface FormStep {
  readonly id: string;
  readonly label: string;
}

interface FormProps {
  steps: readonly FormStep[];
  activeStep: number;
  children: React.ReactNode;
  onNext?: () => void;
  onBack?: () => void;
  backLabel?: string;
  nextLabel?: string;
  finishLabel?: string;
  className?: string;
}

export function Form({ steps, activeStep, children, onNext, onBack, backLabel = 'Back', nextLabel = 'Next', finishLabel = 'Finish', className = '' }: FormProps) {
  const isFirstStep = activeStep === 0;
  const isLastStep = activeStep === steps.length - 1;

  return (
    <div className={['flex flex-col gap-6', className].filter(Boolean).join(' ')}>
      {/* Step indicator */}
      <div className="flex items-center w-full px-2" role="list" aria-label="Pasos del formulario">
        {steps.map((step, index) => {
          const isCompleted = index < activeStep;
          const isCurrent = index === activeStep;

          return (
            <React.Fragment key={step.id}>
              <div
                className="flex flex-col items-center gap-1"
                role="listitem"
                aria-current={isCurrent ? 'step' : undefined}
              >
                <div
                  className="flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-colors duration-200"
                  style={{
                    backgroundColor: isCompleted || isCurrent ? 'var(--primary)' : 'var(--surface-elevated)',
                    color: isCompleted || isCurrent ? '#ffffff' : 'var(--text-tertiary)',
                    border: !isCompleted && !isCurrent ? '1px solid var(--border)' : 'none',
                  }}
                >
                  {isCompleted ? <Check size={16} aria-hidden="true" /> : index + 1}
                </div>
                <span
                  className="text-[11px] font-medium whitespace-nowrap"
                  style={{
                    color: isCurrent ? 'var(--primary)' : isCompleted ? 'var(--text-secondary)' : 'var(--text-tertiary)',
                  }}
                >
                  {step.label}
                </span>
              </div>

              {/* Connecting line */}
              {index < steps.length - 1 && (
                <div
                  className="flex-1 h-0.5 mx-2 rounded-full"
                  style={{
                    backgroundColor: index < activeStep ? 'var(--primary)' : 'var(--border)',
                  }}
                  aria-hidden="true"
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1">{children}</div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={isFirstStep}
          className="px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            backgroundColor: 'var(--surface-elevated)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
          }}
          aria-label={backLabel}
        >
          {backLabel}
        </button>
        <button
          type="button"
          onClick={onNext}
          className="px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-150"
          style={{
            backgroundColor: 'var(--primary)',
            color: '#ffffff',
          }}
          aria-label={isLastStep ? finishLabel : nextLabel}
        >
          {isLastStep ? finishLabel : nextLabel}
        </button>
      </div>
    </div>
  );
}
