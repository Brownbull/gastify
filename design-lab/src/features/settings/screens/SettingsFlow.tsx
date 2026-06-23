import { useState, type ComponentType } from "react";
import { SettingsScreen } from "./SettingsScreen";
import { GruposSubview } from "./GruposSubview";
import { NotificacionesSubview } from "./NotificacionesSubview";
import { AyudaSubview } from "./AyudaSubview";

/**
 * SettingsFlow — the Ajustes navigation container mounted as the AppScaffold
 * overlay. Shows the SettingsScreen list; tapping a row whose subview exists
 * pushes that subview (its back arrow returns here). The list's back arrow
 * (onClose) dismisses the whole overlay. Subviews register here as they're built;
 * rows without a registered subview are inert for now.
 */
type SubviewProps = { onBack?: () => void };

const SUBVIEWS: Record<string, ComponentType<SubviewProps>> = {
  grupos: GruposSubview,
  notificaciones: NotificacionesSubview,
  ayuda: AyudaSubview,
};

export function SettingsFlow({ onClose }: { onClose?: () => void }) {
  const [sub, setSub] = useState<string | null>(null);
  const Sub = sub ? SUBVIEWS[sub] : undefined;
  if (Sub) return <Sub onBack={() => setSub(null)} />;
  return <SettingsScreen onBack={onClose} onSelect={(k) => (SUBVIEWS[k] ? setSub(k) : undefined)} />;
}
