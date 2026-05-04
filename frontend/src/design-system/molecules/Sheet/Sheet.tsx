import * as React from 'react';
import { createPortal } from 'react-dom';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function Sheet({ open, onClose, children }: SheetProps) {
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

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end" role="presentation">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        onClick={onClose}
        data-testid="sheet-backdrop"
        aria-hidden="true"
      />

      {/* Sheet panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Panel inferior"
        className="relative rounded-t-2xl shadow-xl flex flex-col"
        style={{
          backgroundColor: 'var(--surface-elevated)',
          maxHeight: '85vh',
          animation: 'sheetSlideUp 200ms ease-out',
        }}
      >
        {/* Drag handle (visual only) */}
        <div className="flex justify-center py-3">
          <div
            className="rounded-full"
            style={{
              width: '36px',
              height: '4px',
              backgroundColor: 'var(--border)',
            }}
            aria-hidden="true"
          />
        </div>

        {/* Content */}
        <div className="px-6 pb-6 overflow-y-auto flex-1" style={{ color: 'var(--text-primary)' }}>
          {children}
        </div>
      </div>

      <style>{`
        @keyframes sheetSlideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
      `}</style>
    </div>,
    document.body,
  );
}
