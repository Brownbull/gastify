import * as React from 'react';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type AvatarColor = 'primary' | 'green' | 'orange' | 'purple';

interface AvatarProps {
  name: string;
  src?: string;
  size?: AvatarSize;
  color?: AvatarColor;
  className?: string;
}

const SIZE_CLASSES: Record<AvatarSize, { container: string; text: string }> = {
  xs: { container: 'w-6 h-6', text: 'text-[10px]' },
  sm: { container: 'w-8 h-8', text: 'text-xs' },
  md: { container: 'w-10 h-10', text: 'text-sm' },
  lg: { container: 'w-12 h-12', text: 'text-base' },
  xl: { container: 'w-16 h-16', text: 'text-xl' },
};

const COLOR_STYLES: Record<AvatarColor, { bg: string; text: string }> = {
  primary: { bg: 'var(--primary)', text: '#ffffff' },
  green: { bg: 'var(--positive)', text: '#ffffff' },
  orange: { bg: 'var(--warning)', text: '#ffffff' },
  purple: { bg: '#7c3aed', text: '#ffffff' },
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function Avatar({ name, src, size = 'md', color = 'primary', className = '' }: AvatarProps) {
  const [imgError, setImgError] = React.useState(false);
  const sizeStyle = SIZE_CLASSES[size];
  const colorStyle = COLOR_STYLES[color];
  const showImage = src && !imgError;

  return (
    <span
      className={[
        'inline-flex items-center justify-center rounded-full overflow-hidden font-semibold select-none',
        sizeStyle.container,
        sizeStyle.text,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={showImage ? undefined : { backgroundColor: colorStyle.bg, color: colorStyle.text }}
      role="img"
      aria-label={name}
    >
      {showImage ? (
        <img
          src={src}
          alt={name}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        getInitials(name)
      )}
    </span>
  );
}
