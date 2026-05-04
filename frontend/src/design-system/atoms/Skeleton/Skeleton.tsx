type SkeletonShape = 'text' | 'circle' | 'rect' | 'card' | 'list-item';

interface SkeletonProps {
  shape?: SkeletonShape;
  width?: string | number;
  height?: string | number;
  className?: string;
}

const SHAPE_CLASSES: Record<SkeletonShape, string> = {
  text: 'h-4 rounded',
  circle: 'rounded-full',
  rect: 'rounded-lg',
  card: 'rounded-xl',
  'list-item': 'rounded-lg',
};

export function Skeleton({ shape = 'text', width, height, className = '' }: SkeletonProps) {
  const shapeClass = SHAPE_CLASSES[shape];

  const defaultDimensions: Record<string, React.CSSProperties> = {
    text: { width: width ?? '100%', height: height ?? '16px' },
    circle: { width: width ?? '40px', height: height ?? '40px' },
    rect: { width: width ?? '100%', height: height ?? '80px' },
    card: { width: width ?? '100%', height: height ?? '120px' },
    'list-item': { width: width ?? '100%', height: height ?? '64px' },
  };

  if (shape === 'list-item') {
    return (
      <div
        className={['flex items-center gap-3 p-3', shapeClass, className].filter(Boolean).join(' ')}
        style={{ ...defaultDimensions[shape], backgroundColor: 'var(--surface-elevated)' }}
        role="status"
        aria-label="Cargando"
      >
        <div
          className="rounded-full animate-pulse shrink-0"
          style={{ width: '40px', height: '40px', backgroundColor: 'var(--border)' }}
        />
        <div className="flex-1 flex flex-col gap-2">
          <div
            className="rounded animate-pulse"
            style={{ width: '60%', height: '14px', backgroundColor: 'var(--border)' }}
          />
          <div
            className="rounded animate-pulse"
            style={{ width: '40%', height: '12px', backgroundColor: 'var(--border)' }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={['animate-pulse', shapeClass, className].filter(Boolean).join(' ')}
      style={{ ...defaultDimensions[shape], backgroundColor: 'var(--border)' }}
      role="status"
      aria-label="Cargando"
    />
  );
}
