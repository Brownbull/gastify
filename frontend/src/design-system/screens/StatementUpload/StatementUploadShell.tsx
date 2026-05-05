import { Upload } from 'lucide-react';
import { Input } from '../../atoms/Input';
import { Select } from '../../atoms/Select';
import { Button } from '../../atoms/Button';

const BANK_OPTIONS = [
  { value: 'bchile', label: 'Banco de Chile' },
  { value: 'bestado', label: 'BancoEstado' },
  { value: 'santander', label: 'Santander' },
  { value: 'bci', label: 'BCI' },
] as const;

export function StatementUploadShell() {
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
        Subir estado de cuenta
      </h1>

      <form
        style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
        onSubmit={(e) => e.preventDefault()}
      >
        <Select
          label="Banco"
          options={BANK_OPTIONS}
          placeholder="Seleccionar banco"
        />

        {/* File upload area */}
        <div>
          <p
            style={{
              fontSize: '0.875rem',
              fontWeight: 500,
              color: 'var(--text-secondary)',
              marginBottom: '6px',
            }}
          >
            Archivo
          </p>
          <div
            style={{
              padding: '32px 16px',
              border: '2px dashed var(--border)',
              borderRadius: '12px',
              backgroundColor: 'var(--surface)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
            }}
          >
            <Upload size={32} style={{ color: 'var(--text-tertiary)' }} aria-hidden="true" />
            <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>
              Seleccionar archivo
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
              PDF, CSV o XLS
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Input label="Fecha inicio" type="date" />
          <Input label="Fecha fin" type="date" />
        </div>

        <div style={{ marginTop: '8px' }}>
          <Button type="submit" style={{ width: '100%' }}>
            Subir estado
          </Button>
        </div>
      </form>
    </div>
  );
}
