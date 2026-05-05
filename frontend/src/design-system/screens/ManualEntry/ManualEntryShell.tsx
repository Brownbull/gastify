import { Input } from '../../atoms/Input';
import { Select } from '../../atoms/Select';
import { Button } from '../../atoms/Button';

const CATEGORY_OPTIONS = [
  { value: 'supermercado', label: 'Supermercado' },
  { value: 'restaurante', label: 'Restaurante' },
  { value: 'transporte', label: 'Transporte' },
  { value: 'salud', label: 'Salud' },
  { value: 'entretenimiento', label: 'Entretenimiento' },
  { value: 'hogar', label: 'Hogar' },
  { value: 'otro', label: 'Otro' },
] as const;

export function ManualEntryShell() {
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
        Ingreso manual
      </h1>

      <form
        style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
        onSubmit={(e) => e.preventDefault()}
      >
        <Input label="Comercio" placeholder="Ej: Jumbo, Lider, Copec" />
        <Input label="Monto" type="number" placeholder="0" />
        <Input label="Fecha" type="date" />
        <Select
          label="Category"
          options={CATEGORY_OPTIONS}
          placeholder="Select category"
        />
        <Input label="Notas" placeholder="Nota opcional" />

        <div style={{ marginTop: '8px' }}>
          <Button type="submit" style={{ width: '100%' }}>
            Guardar
          </Button>
        </div>
      </form>
    </div>
  );
}
