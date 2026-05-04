interface DateGroupHeaderProps {
  date: Date;
  sticky?: boolean;
  className?: string;
}

function formatRelativeDate(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  return date.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export function DateGroupHeader({ date, sticky = false, className = '' }: DateGroupHeaderProps) {
  return (
    <div
      className={[
        'px-4 py-2',
        sticky ? 'sticky top-0 z-10' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ backgroundColor: 'var(--background)', borderBottom: '1px solid var(--border)' }}
    >
      <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
        {formatRelativeDate(date)}
      </span>
    </div>
  );
}
