import type { Meta, StoryObj } from "@storybook/react-vite";
import { AppSurface, platformFromGlobals } from "@design-system/organisms/AppSurface";
import { CARD_COLOR_CHOICES, CARD_ICON_CHOICES, type PaymentMethod } from "@lib/paymentMethods";
import { CardsSubview } from "./CardsSubview";

/**
 * Features/Settings/Screens/CardsSubview — "Mis métodos de pago": Efectivo + card
 * aliases. Tap a card → edit (alias/color/icon/default/archive); tap Efectivo →
 * set default only. One "Predeterminada" marker. Both lists paginate at 12/page.
 */
const meta: Meta = {
  title: "Features/Settings/Screens/CardsSubview",
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: (_a, { globals }) => (
    <AppSurface platform={platformFromGlobals(globals)}>
      <CardsSubview onBack={() => {}} />
    </AppSurface>
  ),
};

/** 14 archived cards → the archived list paginates (12 per page). */
const MANY_ARCHIVED: PaymentMethod[] = Array.from({ length: 14 }, (_, i) => ({
  id: `arch-${i + 1}`,
  kind: "card",
  label: `Tarjeta archivada ${i + 1}`,
  icon: CARD_ICON_CHOICES[i % CARD_ICON_CHOICES.length],
  color: CARD_COLOR_CHOICES[i % CARD_COLOR_CHOICES.length],
}));

export const WithArchivedPaging: Story = {
  render: (_a, { globals }) => (
    <AppSurface platform={platformFromGlobals(globals)}>
      <CardsSubview onBack={() => {}} initialArchived={MANY_ARCHIVED} />
    </AppSurface>
  ),
};
