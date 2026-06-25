/**
 * Minimal stroke icon set (24×24, currentColor) — dependency-free stand-ins
 * until an icon direction is locked in the design grammar (Phase 4).
 * Naming follows the product destinations they serve.
 */
import type { ReactNode } from "react";

export interface IconProps {
  className?: string;
}

function Svg({ className = "h-5 w-5", children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function HomeIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
      <path d="M10 21v-6h4v6" />
    </Svg>
  );
}

export function CameraIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 7h3l2-3h6l2 3h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z" />
      <circle cx="12" cy="13" r="3.5" />
    </Svg>
  );
}

export function LayersIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path d="m3 13 9 5 9-5" />
    </Svg>
  );
}

export function FileTextIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 3h8l4 4v14H6V3Z" />
      <path d="M14 3v4h4" />
      <path d="M9 12h6M9 16h6" />
    </Svg>
  );
}

export function ListIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M8 6h12M8 12h12M8 18h12" />
      <circle cx="4" cy="6" r="0.5" />
      <circle cx="4" cy="12" r="0.5" />
      <circle cx="4" cy="18" r="0.5" />
    </Svg>
  );
}

export function TagIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 3h8l10 10-8 8L3 11V3Z" />
      <circle cx="7.5" cy="7.5" r="1.5" />
    </Svg>
  );
}

export function TrendingUpIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="m3 17 6-6 4 4 8-8" />
      <path d="M15 7h6v6" />
    </Svg>
  );
}

export function BarChartIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5 21v-8M12 21V4M19 21v-12" />
    </Svg>
  );
}

export function PieChartIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3a9 9 0 1 0 9 9h-9V3Z" />
      <path d="M14.5 2.5a9 9 0 0 1 7 7h-7v-7Z" />
    </Svg>
  );
}

export function BellIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
      <path d="M10 19.5a2.2 2.2 0 0 0 4 0" />
    </Svg>
  );
}

export function UsersIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3 20a6 6 0 0 1 12 0" />
      <circle cx="17.5" cy="9.5" r="2.5" />
      <path d="M16.5 14.8a5 5 0 0 1 4.5 5" />
    </Svg>
  );
}

export function SettingsIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5 5l2.1 2.1M16.9 16.9 19 19M19 5l-2.1 2.1M7.1 16.9 5 19" />
    </Svg>
  );
}

export function UserIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
    </Svg>
  );
}

export function ReceiptIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 2h12v20l-2-1.5L14 22l-2-1.5L10 22l-2-1.5L6 22V2Z" />
      <path d="M9 7h6M9 11h6M9 15h4" />
    </Svg>
  );
}

export function MenuIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </Svg>
  );
}

export function MapPinIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 21s7-6.3 7-11a7 7 0 0 0-14 0c0 4.7 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </Svg>
  );
}

export function XIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Svg>
  );
}

export function ChevronDownIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="m6 9 6 6 6-6" />
    </Svg>
  );
}

/** Back-chevron (utility action; stroke is allowed for back/close/submit). */
export function ChevronLeftIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="m15 18-6-6 6-6" />
    </Svg>
  );
}

export function ArrowLeftIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </Svg>
  );
}

/** Sort glyph — descending bars (long→short) with a down arrow. */
export function SortIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M11 5h10M11 10h7M11 15h4" />
      <path d="M4 5v12" />
      <path d="m1.5 14.5 2.5 3 2.5-3" />
    </Svg>
  );
}

/** Share glyph (Lucide-style) — three nodes connected by links. */
export function ShareIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
    </Svg>
  );
}

/** Log-out glyph (Lucide-style) — door frame + arrow exiting right. */
export function LogOutIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </Svg>
  );
}
