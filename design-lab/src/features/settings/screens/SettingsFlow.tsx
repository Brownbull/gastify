import { useState, type ComponentType } from "react";
import { SettingsScreen } from "./SettingsScreen";
import { ProfileSubview } from "./ProfileSubview";
import { CardsSubview } from "./CardsSubview";
import { SubscriptionSubview } from "./SubscriptionSubview";
import { NotificationsSubview } from "./NotificationsSubview";
import { LimitsSubview } from "./LimitsSubview";
import { HelpSubview } from "./HelpSubview";
import { PreferencesSubview } from "./PreferencesSubview";
import { ScanSubview } from "./ScanSubview";
import { MemorySubview } from "./MemorySubview";
import { DataSubview } from "./DataSubview";

/**
 * SettingsFlow — the Ajustes navigation container mounted as the AppScaffold
 * overlay. Shows the SettingsScreen list; tapping a row whose subview exists
 * pushes that subview (its back arrow returns here). The list's back arrow
 * (onClose) dismisses the whole overlay. Subviews register here as they're built;
 * rows without a registered subview are inert for now.
 */
type SubviewProps = { onBack?: () => void };

const SUBVIEWS: Record<string, ComponentType<SubviewProps>> = {
  profile: ProfileSubview,
  cards: CardsSubview,
  subscription: SubscriptionSubview,
  notifications: NotificationsSubview,
  limits: LimitsSubview,
  help: HelpSubview,
  preferences: PreferencesSubview,
  scanning: ScanSubview,
  memory: MemorySubview,
  data: DataSubview,
};

export function SettingsFlow({ onClose }: { onClose?: () => void }) {
  const [sub, setSub] = useState<string | null>(null);
  const Sub = sub ? SUBVIEWS[sub] : undefined;
  if (Sub) return <Sub onBack={() => setSub(null)} />;
  return <SettingsScreen onBack={onClose} onSelect={(k) => (SUBVIEWS[k] ? setSub(k) : undefined)} />;
}
