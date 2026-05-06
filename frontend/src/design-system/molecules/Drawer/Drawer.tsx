import * as React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

type DrawerSide = 'left' | 'right';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  side?: DrawerSide;
  children: React.ReactNode;
  title?: string;
}

export function Drawer({ open, onClose, side = 'right', children, title }: DrawerProps) {
  React.useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const isLeft = side === 'left';
  const animationName = isLeft ? 'drawerSlideRight' : 'drawerSlideLeft';

  return createPortal(
    <div className="fixed inset-0 z-50 flex" role="presentation">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        onClick={onClose}
        data-testid="drawer-backdrop"
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title ?? 'Panel lateral'}
        className="relative flex flex-col shadow-xl h-full"
        style={{
          backgroundColor: 'var(--surface-elevated)',
          width: '320px',
          maxWidth: '85vw',
          marginLeft: isLeft ? '0' : 'auto',
          marginRight: isLeft ? 'auto' : '0',
          animation: `${animationName} 200ms ease-out`,
        }}
      >
        {/* Header */}
        {title && (
          <div
            className="flex items-center justify-between px-5 py-4 border-b"
            style={{ borderColor: 'var(--border)' }}
          >
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg transition-opacity hover:opacity-70"
              style={{ color: 'var(--text-tertiary)' }}
              aria-label="Cerrar"
            >
              <X size={20} />
            </button>
          </div>
        )}

        {/* No title: just a close button at top-right */}
        {!title && (
          <div className="flex justify-end px-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg transition-opacity hover:opacity-70"
              style={{ color: 'var(--text-tertiary)' }}
              aria-label="Cerrar"
            >
              <X size={20} />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4" style={{ color: 'var(--text-primary)' }}>
          {children}
        </div>
      </div>

      <style>{`
        @keyframes drawerSlideRight {
          from { transform: translateX(-100%); }
          to   { transform: translateX(0); }
        }
        @keyframes drawerSlideLeft {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
      `}</style>
    </div>,
    document.body,
  );
}
