type CurrencyCode = 'CLP' | 'USD' | 'EUR';

interface CurrencyTagProps {
  amount: number;
  currency: CurrencyCode;
  className?: string;
}

const FLAG_MAP: Record<CurrencyCode, string> = {
  CLP: '🇨🇱',
  USD: '🇺🇸',
  EUR: '🇪🇺',
};

function formatAmount(amount: number, currency: CurrencyCode): string {
  const decimals = currency === 'CLP' ? 0 : 2;
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

export function CurrencyTag({ amount, currency, className = '' }: CurrencyTagProps) {
  return (
    <span
      className={['inline-flex items-center gap-1.5 text-sm font-medium', className]
        .filter(Boolean)
        .join(' ')}
      style={{ color: 'var(--text-primary)' }}
    >
      <span aria-hidden="true">{FLAG_MAP[currency]}</span>
      <span>{formatAmount(amount, currency)}</span>
    </span>
  );
}
