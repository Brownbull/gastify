import { useState } from 'react';
import { ZoomIn, ZoomOut, RotateCw, X } from 'lucide-react';

interface ImageViewerProps {
  src: string;
  alt: string;
  onRotate?: () => void;
  onClose?: () => void;
  className?: string;
}

const MIN_SCALE = 0.5;
const MAX_SCALE = 3;
const SCALE_STEP = 0.25;

export function ImageViewer({ src, alt, onRotate, onClose, className = '' }: ImageViewerProps) {
  const [scale, setScale] = useState(1);

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + SCALE_STEP, MAX_SCALE));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - SCALE_STEP, MIN_SCALE));
  };

  return (
    <div
      className={['flex flex-col rounded-xl overflow-hidden', className].filter(Boolean).join(' ')}
      style={{ backgroundColor: 'var(--surface-elevated)', border: '1px solid var(--border)' }}
      role="region"
      aria-label="Visor de imagen"
    >
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="p-1.5 rounded-lg transition-opacity hover:opacity-70"
            style={{ color: 'var(--text-secondary)' }}
            onClick={handleZoomOut}
            disabled={scale <= MIN_SCALE}
            aria-label="Alejar"
          >
            <ZoomOut size={18} aria-hidden="true" />
          </button>
          <span className="text-xs font-medium min-w-[3rem] text-center" style={{ color: 'var(--text-tertiary)' }}>
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            className="p-1.5 rounded-lg transition-opacity hover:opacity-70"
            style={{ color: 'var(--text-secondary)' }}
            onClick={handleZoomIn}
            disabled={scale >= MAX_SCALE}
            aria-label="Acercar"
          >
            <ZoomIn size={18} aria-hidden="true" />
          </button>
          {onRotate && (
            <button
              type="button"
              className="p-1.5 rounded-lg transition-opacity hover:opacity-70"
              style={{ color: 'var(--text-secondary)' }}
              onClick={onRotate}
              aria-label="Rotar imagen"
            >
              <RotateCw size={18} aria-hidden="true" />
            </button>
          )}
        </div>
        {onClose && (
          <button
            type="button"
            className="p-1.5 rounded-lg transition-opacity hover:opacity-70"
            style={{ color: 'var(--text-tertiary)' }}
            onClick={onClose}
            aria-label="Cerrar visor"
          >
            <X size={18} aria-hidden="true" />
          </button>
        )}
      </div>

      <div
        className="flex items-center justify-center overflow-auto"
        style={{ backgroundColor: 'var(--background)', minHeight: '240px', maxHeight: '480px' }}
      >
        <img
          src={src}
          alt={alt}
          className="transition-transform"
          style={{ transform: `scale(${scale})`, transformOrigin: 'center center', maxWidth: '100%' }}
          draggable={false}
        />
      </div>
    </div>
  );
}
