import { Input } from '../../atoms/Input';
import { Select } from '../../atoms/Select';
import { Button } from '../../atoms/Button';

type LayoutMode = 'mobile' | 'desktop';

interface TransactionEditorShellProps {
  layout?: LayoutMode;
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

function EditorForm() {
  return (
    <form
      style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
      onSubmit={(e) => e.preventDefault()}
    >
      <Input label="Comercio" defaultValue="Jumbo Costanera Center" />
      <Input label="Monto" type="number" defaultValue={24890} />
      <Input label="Fecha" type="date" defaultValue="2026-04-28" />
      <Select
        label="Category"
        options={CATEGORY_OPTIONS}
        value="supermercado"
      />
      <Input label="Notas" defaultValue="Compra semanal" />

      <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
        <Button type="submit" style={{ flex: 1 }}>
          Guardar
        </Button>
        <Button variant="danger" type="button" style={{ flex: 1 }}>
          Eliminar
        </Button>
      </div>
    </form>
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
        Imagen de boleta
      </p>
    </div>
  );
}

export function TransactionEditorShell({ layout = 'mobile' }: TransactionEditorShellProps) {
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
          <EditorForm />
        </div>
      ) : (
        <EditorForm />
      )}
    </div>
  );
}
