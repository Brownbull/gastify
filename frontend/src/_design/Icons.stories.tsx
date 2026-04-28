// Atoms/Icons — showcase for the lucide-react icon set. Subset shown is a
// representative sample of icons used across views, dialogs, and the top bar.
// Full library: https://lucide.dev (~1000 icons).

import type { Story } from '@ladle/react';
import {
  Home,
  BarChart3,
  Camera,
  Lightbulb,
  User,
  Tag,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Plus,
  Minus,
  Edit,
  Trash,
  Settings,
  Bell,
  Search,
  Filter,
  Calendar,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle,
  Loader2,
  Image as ImageIcon,
  BookMarked,
} from 'lucide-react';

export default {
  title: 'Atoms/Icons',
};

const ICONS = [
  // Bottom nav
  { group: 'Bottom nav', items: [
    { name: 'Home', Icon: Home },
    { name: 'BarChart3', Icon: BarChart3 },
    { name: 'Camera', Icon: Camera },
    { name: 'Lightbulb', Icon: Lightbulb },
    { name: 'User', Icon: User },
  ]},
  // Actions
  { group: 'Actions', items: [
    { name: 'Plus', Icon: Plus },
    { name: 'Minus', Icon: Minus },
    { name: 'Edit', Icon: Edit },
    { name: 'Trash', Icon: Trash },
    { name: 'Settings', Icon: Settings },
    { name: 'Bell', Icon: Bell },
    { name: 'Tag', Icon: Tag },
    { name: 'X', Icon: X },
    { name: 'Check', Icon: Check },
  ]},
  // Navigation
  { group: 'Navigation', items: [
    { name: 'ChevronLeft', Icon: ChevronLeft },
    { name: 'ChevronRight', Icon: ChevronRight },
    { name: 'ChevronDown', Icon: ChevronDown },
    { name: 'ChevronUp', Icon: ChevronUp },
    { name: 'ArrowUp', Icon: ArrowUp },
    { name: 'ArrowDown', Icon: ArrowDown },
    { name: 'ArrowLeft', Icon: ArrowLeft },
    { name: 'ArrowRight', Icon: ArrowRight },
  ]},
  // Filtering
  { group: 'Filtering', items: [
    { name: 'Search', Icon: Search },
    { name: 'Filter', Icon: Filter },
    { name: 'Calendar', Icon: Calendar },
  ]},
  // Status
  { group: 'Status', items: [
    { name: 'AlertCircle', Icon: AlertCircle },
    { name: 'AlertTriangle', Icon: AlertTriangle },
    { name: 'Info', Icon: Info },
    { name: 'CheckCircle', Icon: CheckCircle },
    { name: 'Loader2', Icon: Loader2 },
  ]},
  // Media + scan
  { group: 'Media + scan', items: [
    { name: 'ImageIcon', Icon: ImageIcon },
    { name: 'BookMarked', Icon: BookMarked },
  ]},
];

export const Library: Story = () => (
  <div className="p-6 max-w-2xl">
    <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
      Icons (lucide-react)
    </h1>
    <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
      Subset of <a
        href="https://lucide.dev"
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: 'var(--primary)' }}
      >lucide.dev</a> icons used by gastify. Default size 24, color via <code>color</code> prop.
    </p>
    {ICONS.map(({ group, items }) => (
      <section key={group} className="mb-8">
        <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
          {group}
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {items.map(({ name, Icon }) => (
            <div
              key={name}
              className="flex items-center gap-3 p-3 rounded-md border"
              style={{ borderColor: 'var(--border-light)', background: 'var(--surface)' }}
            >
              <Icon size={20} style={{ color: 'var(--primary)', flexShrink: 0 }} />
              <code className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                {name}
              </code>
            </div>
          ))}
        </div>
      </section>
    ))}
  </div>
);

export const Sizes: Story = () => (
  <div className="p-6 max-w-2xl">
    <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
      Icon Sizes
    </h1>
    <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
      Lucide icons accept a numeric <code>size</code> prop (px). Common sizes shown.
    </p>
    <div className="flex items-end gap-6">
      {[16, 20, 24, 32, 48].map((size) => (
        <div key={size} className="flex flex-col items-center gap-2">
          <Tag size={size} style={{ color: 'var(--primary)' }} />
          <code className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {size}px
          </code>
        </div>
      ))}
    </div>
  </div>
);

export const Colors: Story = () => (
  <div className="p-6 max-w-2xl">
    <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
      Icon Colors
    </h1>
    <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
      Pass a token via <code>style.color</code>. lucide uses <code>currentColor</code> internally.
    </p>
    <div className="grid grid-cols-2 gap-4">
      {[
        { token: 'primary', name: 'primary' },
        { token: 'success', name: 'success' },
        { token: 'warning', name: 'warning' },
        { token: 'error', name: 'error' },
        { token: 'positive-primary', name: 'positive' },
        { token: 'negative-primary', name: 'negative' },
      ].map(({ token, name }) => (
        <div
          key={token}
          className="flex items-center gap-3 p-3 rounded-md border"
          style={{ borderColor: 'var(--border-light)', background: 'var(--surface)' }}
        >
          <Tag size={24} style={{ color: `var(--${token})`, flexShrink: 0 }} />
          <div>
            <code className="text-xs block" style={{ color: 'var(--text-primary)' }}>
              {name}
            </code>
            <code className="text-xs block" style={{ color: 'var(--text-tertiary)' }}>
              --{token}
            </code>
          </div>
        </div>
      ))}
    </div>
  </div>
);
