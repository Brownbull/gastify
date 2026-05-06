type DateTimeMode = 'relative' | 'absolute';

interface DateTimeTagProps {
  date: Date;
  mode?: DateTimeMode;
  className?: string;
}

function getRelativeTime(date: Date): string {
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHrs = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHrs / 24);

  if (diffSec < 60) return 'hace un momento';
  if (diffMin < 60) return `hace ${diffMin} min`;
  if (diffHrs < 24) return `hace ${diffHrs}h`;
  if (diffDays < 7) return `hace ${diffDays}d`;
  return date.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getAbsoluteTime(date: Date): string {
  return date.toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function DateTimeTag({ date, mode = 'relative', className = '' }: DateTimeTagProps) {
  const display = mode === 'relative' ? getRelativeTime(date) : getAbsoluteTime(date);
  const tooltip = mode === 'relative' ? getAbsoluteTime(date) : getRelativeTime(date);

  return (
    <time
      dateTime={date.toISOString()}
      title={tooltip}
      className={['text-xs', className].filter(Boolean).join(' ')}
      style={{ color: 'var(--text-tertiary)' }}
    >
      {display}
    </time>
  );
}
