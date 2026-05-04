import { Save, Pencil, ShoppingCart } from 'lucide-react';

interface QuickSaveCardProps {
  merchant: string;
  amount: string;
  category: string;
  onSave: () => void;
  onEdit: () => void;
  className?: string;
}

export function QuickSaveCard({ merchant, amount, category, onSave, onEdit, className = '' }: QuickSaveCardProps) {
  return (
    <div
      className={['flex flex-col gap-3 p-4 rounded-xl', className].filter(Boolean).join(' ')}
      style={{ backgroundColor: 'var(--surface-elevated)', border: '1px solid var(--border)' }}
      role="region"
      aria-label="Guardar transaccion rapida"
    >
      <div className="flex items-center gap-3">
        <div
          className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
          style={{ backgroundColor: 'var(--primary)', color: '#ffffff' }}
        >
          <ShoppingCart size={20} aria-hidden="true" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
            {merchant}
          </span>
          <span className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>
            {category}
          </span>
        </div>
        <span className="ml-auto text-lg font-bold shrink-0" style={{ color: 'var(--text-primary)' }}>
          {amount}
        </span>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--primary)', color: '#ffffff' }}
          onClick={onSave}
          aria-label="Guardar transaccion"
        >
          <Save size={16} aria-hidden="true" />
          Guardar
        </button>
        <button
          type="button"
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
          onClick={onEdit}
          aria-label="Editar transaccion"
        >
          <Pencil size={16} aria-hidden="true" />
          Editar
        </button>
      </div>
    </div>
  );
}
