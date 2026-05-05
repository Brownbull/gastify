import { createFileRoute } from '@tanstack/react-router';
import { SettingsShell } from '../../design-system/screens/Settings';

export const Route = createFileRoute('/settings/')({
  component: SettingsIndexRoute,
});

function SettingsIndexRoute() {
  return <SettingsShell layout="desktop" />;
}
