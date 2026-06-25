import { AppHeader } from "@design-system/organisms/Nav";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { Button } from "@design-system/atoms/Button";

/**
 * ScanCaptureScreen (DM-42) — simple-scan capture, screen 1 of the single-scan
 * flow. Faithful to legacy BoletApp's capture step: an IDLE PROMPT (not a fake
 * live camera feed) — a big dashed camera target + "Toca para escanear", with
 * an explicit source choice: take a photo vs pick an existing image. A full-bleed
 * flex column that fills the AppSurface device frame; the header clears the notch.
 */
export interface ScanCaptureScreenProps {
  onTakePhoto?: () => void;
  onPickFile?: () => void;
  onBack?: () => void;
}

export function ScanCaptureScreen({ onTakePhoto, onPickFile, onBack }: ScanCaptureScreenProps) {
  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-gt-bg">
      <AppHeader variant="detail" title="Escanear boleta" onBack={onBack ?? (() => {})} />

      {/* idle prompt — centered target + hint */}
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-gt-16 px-gt-24">
        <button
          type="button"
          aria-label="Tomar foto de la boleta"
          onClick={onTakePhoto}
          className="grid h-40 w-40 place-items-center rounded-gt-pill border-[3px] border-dashed border-gt-line-strong bg-gt-surface text-gt-primary shadow-gt-sm transition duration-150 ease-gt-bounce hover:-translate-y-0.5 hover:shadow-gt-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gt-primary/25"
        >
          <PixelIcon name="action-camera" size={64} />
        </button>
        <p className="text-center font-gt-display text-gt-lg font-extrabold text-gt-ink">Toca para escanear una boleta</p>
        <p className="text-center text-gt-sm font-medium text-gt-ink-3">Centra la boleta completa y con buena luz</p>
      </div>

      {/* source choice — one row, two columns: gallery (left) · take photo (right) */}
      <div className="grid grid-cols-2 gap-gt-10 border-t-2 border-gt-line bg-gt-surface px-gt-16 pb-gt-32 pt-gt-16">
        <Button variant="secondary" size="lg" fullWidth onClick={onPickFile}>
          <PixelIcon name="action-gallery" size={26} />
          Galería
        </Button>
        <Button variant="primary" size="lg" fullWidth onClick={onTakePhoto}>
          <PixelIcon name="action-camera" size={26} />
          Tomar foto
        </Button>
      </div>
    </div>
  );
}
