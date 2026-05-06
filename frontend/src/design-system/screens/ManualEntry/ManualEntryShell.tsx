import { CheckCircle } from 'lucide-react';
import { Input } from '../../atoms/Input';
import { Select } from '../../atoms/Select';
import { Button } from '../../atoms/Button';

type ManualEntryState = 'default' | 'submitting' | 'success';

interface ManualEntryShellProps {
  state?: ManualEntryState;
  title?: string;
  submitLabel?: string;
  successMessage?: string;
}

const CATEGORY_OPTIONS = [
  { value: 'supermercado', label: 'Supermercado' },
  { value: 'restaurante', label: 'Restaurante' },
  { value: 'transporte', label: 'Transporte' },
  { value: 'salud', label: 'Salud' },
  { value: 'entretenimiento', label: 'Entretenimiento' },
  { value: 'hogar', label: 'Hogar' },
  { value: 'otro', label: 'Otro' },
] as const;

export function ManualEntryShell({
  state = 'default',
  title = 'Manual entry',
  submitLabel = 'Save',
  successMessage = 'Transaction saved',
}: ManualEntryShellProps) {
  if (state === 'success') {
    return (
      <div
        style={{
          padding: '24px 16px',
          backgroundColor: 'var(--background)',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
        }}
      >
        <CheckCircle size={64} style={{ color: 'var(--positive, #22c55e)' }} aria-hidden="true" />
        <p
          style={{
            fontSize: '1.25rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
          }}
        >
          {successMessage}
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '24px 16px',
        backgroundColor: 'var(--background)',
        minHeight: '100vh',
      }}
    >
      <h1
        style={{
          fontSize: '1.5rem',
          fontWeight: 700,
          color: 'var(--text-primary)',
          marginBottom: '24px',
        }}
      >
        {title}
      </h1>

      <form
        style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
        onSubmit={(e) => e.preventDefault()}
      >
        <Input label="Merchant" placeholder="e.g. Jumbo, Lider, Copec" />
        <Input label="Amount" type="number" placeholder="0" />
        <Input label="Date" type="date" />
        <Select
          label="Category"
          options={CATEGORY_OPTIONS}
          placeholder="Select category"
        />
        <Input label="Notes" placeholder="Optional note" />

        <div style={{ marginTop: '8px' }}>
          <Button
            type="submit"
            style={{ width: '100%' }}
            disabled={state === 'submitting'}
            loading={state === 'submitting'}
          >
            {submitLabel}
          </Button>
        </div>
      </form>
    </div>
  );
}
