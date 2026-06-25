import type { ReactNode } from "react";
import { PixelIcon } from "@/components/shell/PixelIcon";

/**
 * IconTile — a framed "icon well" (ported from design-lab in W3): a fixed-size
 * bordered tile holding a pixel icon (or any node). Ink border + tiny hard shadow.
 * `tint` fills the well with a soft color (inline-styled).
 */
export type IconTileSize = "sm" | "md" | "lg" | "hero";

export interface IconTileProps {
  icon?: string;
  children?: ReactNode;
  size?: IconTileSize;
  tint?: string;
  className?: string;
}

const sizes: Record<IconTileSize, { box: string; icon: number; radius: string }> = {
  sm: { box: "h-9 w-9", icon: 22, radius: "rounded-gt-md" },
  md: { box: "h-11 w-11", icon: 28, radius: "rounded-gt-lg" },
  lg: { box: "h-12 w-12", icon: 30, radius: "rounded-gt-lg" },
  hero: { box: "h-16 w-16", icon: 40, radius: "rounded-gt-xl" },
};

export function IconTile({ icon, children, size = "md", tint, className = "" }: IconTileProps) {
  const s = sizes[size];
  return (
    <span
      className={`grid ${s.box} shrink-0 place-items-center ${s.radius} border-2 border-gt-line-strong bg-gt-bg-3 shadow-gt-xs ${className}`}
      style={tint ? { backgroundColor: tint } : undefined}
    >
      {children ?? (icon ? <PixelIcon name={icon} size={s.icon} /> : null)}
    </span>
  );
}
