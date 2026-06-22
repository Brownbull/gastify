/* ARCHIVED 2026-06-16 (DM-41): Profile-menu layout spike. WINNER = Option C (grouped
   + logout divider), folded into the production PerfilMenu in organisms/Nav.tsx.
   Kept for provenance; excluded from the Storybook glob (*.archive.tsx). */
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { Platform } from "@design-system/organisms/AppSurface";
import { AppSurface } from "@design-system/organisms/AppSurface";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { LogOutIcon } from "@design-system/assets/icons";
import { ProfileButton, AppHeader } from "@design-system/organisms/Nav";
import { optionArgType, PLATFORM_ARGTYPE, type SpikeArgs, type SpikeOption } from "../AtomSpike";
import { SpikeGrid, Option } from "../spikeLayout";

/**
 * SPIKE — Profile menu (Gustify ProfileMenu port). Opens from the top-right
 * avatar (mobile/tablet = panel + backdrop) or the nav/rail (desktop = dropdown).
 * Six destinations: Notificaciones · Historial de productos · Historial de
 * transacciones · Reportes · Ajustes · Cerrar sesión (logout tinted danger).
 *
 * A/B/C/D vary LAYOUT/DENSITY (DM-6): A faithful (header + rows) · B compact
 * (no user header) · C grouped (sections + logout divider) · D big-touch.
 * The platform toggle drives panel (mobile/tablet) vs dropdown (desktop) chrome
 * + the AppSurface device frame; "Compare" shows the four side by side.
 */

interface MenuItem {
  id: string;
  label: string;
  icon: string; // pixel-icon name, or "svg:logout"
  badge?: string;
  danger?: boolean;
}

const ITEMS: MenuItem[] = [
  { id: "notificaciones", label: "Notificaciones", icon: "nav-alerts", badge: "3" },
  { id: "hist-productos", label: "Historial de productos", icon: "item-pantry" },
  { id: "hist-transacciones", label: "Historial de transacciones", icon: "nav-history" },
  { id: "reportes", label: "Reportes", icon: "nav-reports" },
  { id: "ajustes", label: "Ajustes", icon: "nav-settings" },
  { id: "logout", label: "Cerrar sesión", icon: "svg:logout", danger: true },
];

function ItemIcon({ icon, size = 24 }: { icon: string; size?: number }) {
  if (icon === "svg:logout") return <LogOutIcon className="h-6 w-6 text-gt-negative" />;
  return <PixelIcon name={icon} size={size} className="shrink-0" />;
}

function Header() {
  return (
    <div className="flex items-center gap-gt-10 border-b-2 border-gt-line bg-gt-bg-3 px-gt-10 py-gt-10">
      <ProfileButton initials="R" />
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-gt-display text-gt-md font-extrabold text-gt-ink">Rosa Martínez</span>
        <span className="truncate text-gt-xs font-medium text-gt-ink-3">rosa@correo.cl</span>
      </span>
    </div>
  );
}

function Row({ item, big = false }: { item: MenuItem; big?: boolean }) {
  return (
    <button
      type="button"
      className={`flex w-full items-center gap-gt-10 rounded-gt-lg text-left font-gt-display font-extrabold transition duration-150 ease-gt-bounce focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gt-primary/20 ${
        big ? "px-gt-12 py-gt-12 text-gt-md" : "px-gt-10 py-gt-8 text-gt-sm"
      } ${item.danger ? "text-gt-negative hover:bg-gt-negative/10" : "text-gt-ink hover:bg-gt-warning/20"}`}
    >
      <ItemIcon icon={item.icon} size={big ? 28 : 24} />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.badge ? (
        <span className="grid h-5 min-w-5 place-items-center rounded-gt-pill border-2 border-gt-line-strong bg-gt-negative px-gt-4 text-[10px] font-extrabold leading-none text-white">
          {item.badge}
        </span>
      ) : null}
    </button>
  );
}

const SHELL = "w-[252px] overflow-hidden rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface shadow-gt-md";

/** A · Faithful — header + flat item list (logout tinted). */
function MenuA() {
  return (
    <div className={SHELL}>
      <Header />
      <div className="flex flex-col p-gt-8">
        {ITEMS.map((it) => <Row key={it.id} item={it} />)}
      </div>
    </div>
  );
}

/** B · Compact — no user header, denser rows. */
function MenuB() {
  return (
    <div className={SHELL}>
      <div className="flex flex-col p-gt-6">
        {ITEMS.map((it) => <Row key={it.id} item={it} />)}
      </div>
    </div>
  );
}

/** C · Grouped — header + sections, divider before logout. */
function MenuC() {
  const main = ITEMS.filter((i) => i.id !== "logout");
  const logout = ITEMS.find((i) => i.id === "logout")!;
  return (
    <div className={SHELL}>
      <Header />
      <div className="flex flex-col p-gt-8">
        {main.map((it) => <Row key={it.id} item={it} />)}
        <div className="my-gt-6 border-t-2 border-gt-line" />
        <Row item={logout} />
      </div>
    </div>
  );
}

/** D · Big-touch — larger rows + icons, generous spacing. */
function MenuD() {
  return (
    <div className={SHELL}>
      <Header />
      <div className="flex flex-col gap-gt-2 p-gt-10">
        {ITEMS.map((it) => <Row key={it.id} item={it} big />)}
      </div>
    </div>
  );
}

const MENUS: Record<string, () => React.ReactNode> = { A: MenuA, B: MenuB, C: MenuC, D: MenuD };

/**
 * Render one menu in-context: anchored under the top-right avatar in an
 * AppSurface frame. Mobile/tablet = panel (dim backdrop). Desktop = dropdown
 * (no backdrop), anchored top-right.
 */
function InContext({ option, platform }: { option: string; platform: Platform }) {
  const Menu = MENUS[option] ?? MenuA;
  const isPanel = platform !== "desktop";
  return (
    <div className="bg-gt-bg p-gt-24">
      <AppSurface platform={platform}>
        <div className="relative min-h-[520px]">
          <AppHeader variant="browse" title="Productos" />
          {/* dim backdrop for the mobile/tablet panel variant */}
          {isPanel ? <div className="absolute inset-0 z-40 bg-gt-ink/35" /> : null}
          {/* the menu, anchored top-right under the avatar */}
          <div className={`absolute right-gt-12 top-[64px] ${isPanel ? "z-50" : "z-40"}`}>
            <Menu />
          </div>
        </div>
      </AppSurface>
    </div>
  );
}

const OPTIONS: SpikeOption[] = [
  { id: "A", label: "Faithful (header + rows)", note: "Gustify-faithful: user header (avatar+name+email) + flat item list; logout tinted danger; notifications badge.", render: () => <MenuA /> },
  { id: "B", label: "Compact (no header)", note: "Drops the user header for a denser overflow-style menu — just the six destinations, tight rows.", render: () => <MenuB /> },
  { id: "C", label: "Grouped (+ logout divider)", note: "Header + the five destinations, then a divider before Cerrar sesión to set the destructive action apart.", render: () => <MenuC /> },
  { id: "D", label: "Big-touch", note: "Larger rows + 28px icons + generous spacing — easiest mobile-thumb targets.", render: () => <MenuD /> },
];

const meta = {
  title: "Design System/Spikes/Profile Menu",
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  args: { option: "compare", platform: "mobile" },
  argTypes: { option: optionArgType(OPTIONS), platform: PLATFORM_ARGTYPE },
  render: (args: SpikeArgs) => {
    if (args.option === "compare") {
      return (
        <SpikeGrid
          title="Profile menu — layout/density (A/B/C/D)"
          intro="Opens from the top-right avatar (mobile/tablet = panel + backdrop) or nav/rail (desktop = dropdown). 6 destinations incl. logout. A faithful · B compact · C grouped · D big-touch. Pick an option in Controls to see it in the device frame + panel/dropdown chrome by platform."
        >
          {OPTIONS.map((o) => (
            <Option key={o.id} id={o.id} label={o.label} note={o.note}>
              {o.render()}
            </Option>
          ))}
        </SpikeGrid>
      );
    }
    return <InContext option={args.option} platform={args.platform} />;
  },
} satisfies Meta<SpikeArgs>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Explore: Story = {};
