import { type LucideIcon, ShoppingCart, Utensils, Bus, Heart, Zap, Home, GraduationCap, Dumbbell, Film, HelpCircle } from 'lucide-react';

type CategoryKey = 'supermercado' | 'restaurante' | 'transporte' | 'salud' | 'servicios' | 'hogar' | 'educacion' | 'deporte' | 'entretenimiento' | 'otro';

interface CategoryBadgeProps {
  category: CategoryKey;
  label: string;
  className?: string;
}

const CATEGORY_CONFIG: Record<CategoryKey, { icon: LucideIcon; bg: string; text: string }> = {
  supermercado: { icon: ShoppingCart, bg: '#dbeafe', text: '#1d4ed8' },
  restaurante: { icon: Utensils, bg: '#fef3c7', text: '#b45309' },
  transporte: { icon: Bus, bg: '#d1fae5', text: '#047857' },
  salud: { icon: Heart, bg: '#fce7f3', text: '#be185d' },
  servicios: { icon: Zap, bg: '#e0e7ff', text: '#4338ca' },
  hogar: { icon: Home, bg: '#fde68a', text: '#92400e' },
  educacion: { icon: GraduationCap, bg: '#c7d2fe', text: '#3730a3' },
  deporte: { icon: Dumbbell, bg: '#bbf7d0', text: '#15803d' },
  entretenimiento: { icon: Film, bg: '#fbcfe8', text: '#9d174d' },
  otro: { icon: HelpCircle, bg: 'var(--surface-elevated)', text: 'var(--text-secondary)' },
};

export function CategoryBadge({ category, label, className = '' }: CategoryBadgeProps) {
  const config = CATEGORY_CONFIG[category];
  const Icon = config.icon;

  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium max-w-[180px]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ backgroundColor: config.bg, color: config.text }}
    >
      <Icon size={14} aria-hidden="true" className="shrink-0" />
      <span className="truncate">{label}</span>
    </span>
  );
}
