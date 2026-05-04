import { type LucideIcon } from 'lucide-react';

type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface IconProps {
  icon: LucideIcon;
  size?: IconSize;
  color?: string;
  className?: string;
}

const SIZE_MAP: Record<IconSize, number> = {
  xs: 14,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
};

export function Icon({ icon: LucideIcon, size = 'md', color, className = '' }: IconProps) {
  return (
    <LucideIcon
      size={SIZE_MAP[size]}
      className={className}
      style={color ? { color } : undefined}
      aria-hidden="true"
    />
  );
}
