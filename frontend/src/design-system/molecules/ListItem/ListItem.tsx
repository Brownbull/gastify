import { ChevronRight } from 'lucide-react';

type ListItemVariant = 'navigable' | 'selectable' | 'swipeable';

interface ListItemProps {
  variant: ListItemVariant;
  label: string;
  description?: string;
  selected?: boolean;
  onSelect?: () => void;
  onClick?: () => void;
  className?: string;
}

export function ListItem({
  variant,
  label,
  description,
  selected = false,
  onSelect,
  onClick,
  className = '',
}: ListItemProps) {
  const isNavigable = variant === 'navigable';
  const isSelectable = variant === 'selectable';

  const handleClick = () => {
    if (isSelectable && onSelect) {
      onSelect();
    } else if (onClick) {
      onClick();
    }
  };

  return (
    <div
      className={[
        'flex items-center gap-3 px-4 py-3 transition-colors duration-150',
        (onClick || onSelect) ? 'cursor-pointer hover:opacity-90' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        backgroundColor: selected ? 'var(--primary-light, rgba(16,185,129,0.08))' : 'var(--surface)',
        borderBottom: '1px solid var(--border)',
      }}
      role={isSelectable ? 'option' : isNavigable ? 'link' : undefined}
      aria-selected={isSelectable ? selected : undefined}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      tabIndex={(onClick || onSelect) ? 0 : undefined}
    >
      {isSelectable && (
        <input
          type="checkbox"
          checked={selected}
          onChange={() => {}}
          onClick={(e) => {
            e.stopPropagation();
            onSelect?.();
          }}
          className="w-4 h-4 rounded accent-[var(--primary)] shrink-0"
          aria-label={`Select ${label}`}
        />
      )}

      <div className="flex-1 min-w-0">
        <span
          className="block text-sm font-medium truncate"
          style={{ color: 'var(--text-primary)' }}
        >
          {label}
        </span>
        {description && (
          <span
            className="block text-xs mt-0.5 truncate"
            style={{ color: 'var(--text-secondary)' }}
          >
            {description}
          </span>
        )}
      </div>

      {isNavigable && (
        <ChevronRight
          size={18}
          style={{ color: 'var(--text-tertiary)' }}
          aria-hidden="true"
          className="shrink-0"
        />
      )}
    </div>
  );
}
