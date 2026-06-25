/**
 * PixelLab icon renderer — serves the 200-icon set at /pixel-icons/ (see
 * public/pixel-icons/README.md for provenance + the role taxonomy).
 *
 * ICON CONVENTION (user-locked 2026-06-10): every glyph WITH MEANING
 * (navigation destinations, categories, stores, finance concepts, scan states,
 * mascots) renders a PixelIcon. Stroke icons (icons.tsx) are allowed ONLY for
 * utility actions: close X, back, submit/confirm, cancel, hamburger.
 */
export interface PixelIconProps {
  /** filename without .png under the source dir (e.g. "nav-home", "rubro-supermercados"). */
  name: string;
  /** rendered square size in px — multiples of the source grid look crispest. */
  size?: number;
  /**
   * public source dir (default "pixel-icons"). Use "gustify-icons" for the
   * mapped Gustify ingredient/meal icons (the cross-app link chip).
   */
  dir?: "pixel-icons" | "gustify-icons";
  /** accessible name; omitted = decorative (aria-hidden). */
  alt?: string;
  className?: string;
}

export function PixelIcon({ name, size = 20, dir = "pixel-icons", alt, className = "" }: PixelIconProps) {
  // Crisp `image-rendering: pixelated` — this is what Gustify's IconImage atom
  // (and every Gustify catalog) actually uses. Smooth scaling interpolation-blurs
  // the 32px source art into mush; pixelated keeps the hard pixel grid that the
  // PixelLab "selective outline" style is designed for. Source icons are 32–64px;
  // we only ever downscale.
  return (
    <img
      src={`/${dir}/${name}.png`}
      width={size}
      height={size}
      alt={alt ?? ""}
      aria-hidden={alt ? undefined : true}
      style={{ imageRendering: "pixelated" }}
      className={`inline-block shrink-0 object-contain ${className}`}
    />
  );
}
