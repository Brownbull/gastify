import { ShoppingBag, ChevronDown, ChevronUp } from 'lucide-react';
import { Pill } from '../../atoms/Pill';
import { Icon } from '../../atoms/Icon';

type TransactionCurrency = 'CLP' | 'USD' | 'EUR';
type TransactionType = 'expense' | 'income';

interface CardTransactionProps {
  merchant: string;
  amount: number;
  currency: TransactionCurrency;
  category: string;
  date: Date;
  type: TransactionType;
  selected?: boolean;
  expanded?: boolean;
  onSelect?: () => void;
  onExpand?: () => void;
  className?: string;
}

const CURRENCY_FORMAT: Record<TransactionCurrency, { locale: string; currency: string }> = {
  CLP: { locale: 'es-CL', currency: 'CLP' },
  USD: { locale: 'en-US', currency: 'USD' },
  EUR: { locale: 'de-DE', currency: 'EUR' },
};

function formatAmount(amount: number, currency: TransactionCurrency, type: TransactionType): string {
  const config = CURRENCY_FORMAT[currency];
  const absAmount = Math.abs(amount);
  const formatted = new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.currency,
    minimumFractionDigits: currency === 'CLP' ? 0 : 2,
  }).format(absAmount);

  return type === 'expense' ? `-${formatted}` : formatted;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('es-CL', {
    day: 'numeric',
    month: 'short',
  }).format(date);
}

const CATEGORY_COLORS: Record<string, 'green' | 'blue' | 'orange' | 'red' | 'purple' | 'gray'> = {
  alimentacion: 'green',
  transporte: 'blue',
  entretenimiento: 'purple',
  salud: 'red',
  hogar: 'orange',
};

export function CardTransaction({
  merchant,
  amount,
  currency,
  category,
  date,
  type,
  selected = false,
  expanded = false,
  onSelect,
  onExpand,
  className = '',
}: CardTransactionProps) {
  const amountColor = type === 'expense' ? 'var(--error)' : 'var(--positive)';
  const pillColor = CATEGORY_COLORS[category.toLowerCase()] ?? 'gray';
  const ExpandIcon = expanded ? ChevronUp : ChevronDown;

  return (
    <div
      className={[
        'flex flex-col rounded-xl transition-colors duration-150',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        backgroundColor: selected ? 'var(--primary-light, rgba(16,185,129,0.08))' : 'var(--surface-elevated)',
        border: `1px solid ${selected ? 'var(--primary)' : 'var(--border)'}`,
      }}
      role="article"
      aria-label={`Transacción: ${merchant}`}
      aria-selected={onSelect ? selected : undefined}
    >
      <div className="flex items-center gap-3 p-3">
        {onSelect && (
          <input
            type="checkbox"
            checked={selected}
            onChange={onSelect}
            className="w-4 h-4 rounded accent-[var(--primary)] shrink-0"
            aria-label={`Seleccionar ${merchant}`}
          />
        )}

        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: 'var(--primary-light, rgba(16,185,129,0.1))' }}
        >
          <Icon icon={ShoppingBag} size="sm" color="var(--primary)" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span
              className="text-sm font-medium truncate"
              style={{ color: 'var(--text-primary)' }}
            >
              {merchant}
            </span>
            <span
              className="text-sm font-bold whitespace-nowrap"
              style={{ color: amountColor }}
            >
              {formatAmount(amount, currency, type)}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 mt-1">
            <div className="flex items-center gap-2 min-w-0">
              <Pill color={pillColor}>{category}</Pill>
              <span
                className="text-xs whitespace-nowrap"
                style={{ color: 'var(--text-tertiary)' }}
              >
                {formatDate(date)}
              </span>
            </div>

            {onExpand && (
              <button
                type="button"
                onClick={onExpand}
                className="p-0.5 rounded transition-opacity hover:opacity-70 shrink-0"
                style={{ color: 'var(--text-tertiary)' }}
                aria-label={expanded ? 'Contraer detalles' : 'Expandir detalles'}
                aria-expanded={expanded}
              >
                <ExpandIcon size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {expanded && (
        <div
          className="px-3 pb-3 pt-0"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <div
            className="pt-2 text-xs"
            style={{ color: 'var(--text-secondary)' }}
          >
            <p className="italic">Transaction details</p>
          </div>
        </div>
      )}
    </div>
  );
}
