import { PixelIcon } from "@design-system/assets/PixelIcon";

/**
 * AttachTile — dashed placeholder for attaching a receipt/product photo. Ink
 * dashed border, scan-receipt pixel icon + optional label. Legacy "Adjuntar"
 * tile. `shape` matches either the legacy 72×90 thumbnail footprint (`receipt`)
 * or a square icon-button footprint (`square`).
 */
export type AttachTileShape = "receipt" | "square";

export interface AttachTileProps {
  onClick?: () => void;
  label?: string;
  shape?: AttachTileShape;
  className?: string;
}

const shapeClasses: Record<AttachTileShape, { box: string; icon: number; showLabel: boolean }> = {
  // DM-12 icon bump: 28→34 / 24→30.
  receipt: { box: "h-22.5 w-18 rounded-gt-lg", icon: 34, showLabel: true },
  square: { box: "h-12 w-12 rounded-gt-xl", icon: 30, showLabel: false },
};

export function AttachTile({ onClick, label = "Adjuntar", shape = "receipt", className = "" }: AttachTileProps) {
  const s = shapeClasses[shape];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`grid shrink-0 place-items-center gap-gt-4 border-2 border-dashed border-gt-line-strong bg-gt-bg transition duration-150 ease-gt-bounce hover:border-gt-primary hover:bg-gt-primary-soft focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gt-primary/25 ${s.box} ${className}`}
    >
      <PixelIcon name="scan-receipt" size={s.icon} />
      {s.showLabel ? <span className="text-gt-xs font-extrabold text-gt-ink-3">{label}</span> : null}
    </button>
  );
}
