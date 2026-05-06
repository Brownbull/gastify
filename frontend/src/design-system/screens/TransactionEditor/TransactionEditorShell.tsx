import { Input } from '../../atoms/Input';
import { Select } from '../../atoms/Select';
import { Button } from '../../atoms/Button';

type LayoutMode = 'mobile' | 'desktop';
type TransactionEditorState = 'default' | 'saving' | 'deleting';

interface TransactionEditorShellProps {
  layout?: LayoutMode;
  state?: TransactionEditorState;
  onConfirmDelete?: () => void;
  onCancelDelete?: () => void;
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

function EditorForm({
  state,
  saveLabel = 'Save',
  deleteLabel = 'Delete',
  onConfirmDelete,
  onCancelDelete,
}: {
  state: TransactionEditorState;
  saveLabel?: string;
  deleteLabel?: string;
  onConfirmDelete?: () => void;
  onCancelDelete?: () => void;
}) {
  const isBusy = state === 'saving' || state === 'deleting';

  return (
    <form
      style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
      onSubmit={(e) => e.preventDefault()}
    >
      <Input label="Merchant" defaultValue="Jumbo Costanera Center" />
      <Input label="Amount" type="number" defaultValue={24890} />
      <Input label="Date" type="date" defaultValue="2026-04-28" />
      <Select
        label="Category"
        options={CATEGORY_OPTIONS}
        value="supermercado"
      />
      <Input label="Notes" defaultValue="Weekly groceries" />

      {state === 'deleting' ? (
        <DeleteConfirmation
          onConfirm={onConfirmDelete}
          onCancel={onCancelDelete}
        />
      ) : (
        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
          <Button
            type="submit"
            style={{ flex: 1 }}
            disabled={isBusy}
            loading={state === 'saving'}
          >
            {saveLabel}
          </Button>
          <Button variant="danger" type="button" style={{ flex: 1 }} disabled={isBusy}>
            {deleteLabel}
          </Button>
        </div>
      )}
    </form>
  );
}

function DeleteConfirmation({
  onConfirm,
  onCancel,
}: {
  onConfirm?: () => void;
  onCancel?: () => void;
}) {
  return (
    <div
      style={{
        marginTop: '8px',
        padding: '16px',
        borderRadius: '12px',
        backgroundColor: 'var(--error-bg, rgba(239, 68, 68, 0.1))',
        border: '1px solid var(--error)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      <p
        style={{
          fontSize: '0.875rem',
          fontWeight: 600,
          color: 'var(--text-primary)',
        }}
      >
        Delete this transaction?
      </p>
      <p
        style={{
          fontSize: '0.875rem',
          color: 'var(--text-secondary)',
        }}
      >
        This action cannot be undone.
      </p>
      <div style={{ display: 'flex', gap: '12px' }}>
        <Button variant="danger" type="button" style={{ flex: 1 }} onClick={onConfirm}>
          Confirm delete
        </Button>
        <Button variant="secondary" type="button" style={{ flex: 1 }} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function ReceiptPlaceholder() {
  return (
    <div
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 400,
      }}
    >
      <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
        Receipt image
      </p>
    </div>
  );
}

export function TransactionEditorShell({
  layout = 'mobile',
  state = 'default',
  onConfirmDelete,
  onCancelDelete,
}: TransactionEditorShellProps) {
  const isDesktop = layout === 'desktop';

  return (
    <div
      style={{
        padding: isDesktop ? '48px' : '24px 16px',
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
        Edit transaction
      </h1>

      {isDesktop ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
          <ReceiptPlaceholder />
          <EditorForm
            state={state}
            onConfirmDelete={onConfirmDelete}
            onCancelDelete={onCancelDelete}
          />
        </div>
      ) : (
        <EditorForm
          state={state}
          onConfirmDelete={onConfirmDelete}
          onCancelDelete={onCancelDelete}
        />
      )}
    </div>
  );
}
