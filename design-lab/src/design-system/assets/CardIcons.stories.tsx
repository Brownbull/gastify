import type { Meta, StoryObj } from "@storybook/react-vite";
import { PixelIcon } from "./PixelIcon";
import { CARD_ICONS, CARD_COLOR_GLYPHS, type CardIcon } from "@lib/cardIcons";

/**
 * Card Icons — the reusable set of generic pixel-art card glyphs for the
 * credit/debit cards common in Chile (banks · retail · networks). Each is a
 * generic card differentiated ONLY by the issuer's brand color + a text label —
 * NO reproduced logos or wordmarks. Used by the PaymentPicker / statement card
 * selector. The generation recipe is documented at the bottom so the set can be
 * extended without re-deriving the prompt.
 */
const meta: Meta = {
  title: "Design System/Assets/Card Icons",
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj;

function CardTile({ c }: { c: CardIcon }) {
  return (
    <div className="flex flex-col items-center gap-gt-6 rounded-gt-2xl border-2 border-gt-line bg-gt-surface p-gt-12 shadow-gt-xs">
      <PixelIcon name={c.icon} size={40} />
      <span className="text-center font-gt-display text-gt-xs font-extrabold text-gt-ink">{c.label}</span>
      <span className="flex items-center gap-gt-4 text-[10px] font-bold text-gt-ink-3">
        <span className="h-3 w-3 rounded-gt-pill border border-gt-line-strong" style={{ backgroundColor: c.color }} />
        {c.icon}
      </span>
    </div>
  );
}

function Section({ title, kind }: { title: string; kind: CardIcon["kind"] }) {
  const items = CARD_ICONS.filter((c) => c.kind === kind);
  return (
    <section className="flex flex-col gap-gt-8">
      <h3 className="font-gt-display text-gt-lg font-extrabold text-gt-ink">{title}</h3>
      <div className="grid grid-cols-3 gap-gt-12 sm:grid-cols-4 md:grid-cols-5">
        {items.map((c) => <CardTile key={c.id} c={c} />)}
      </div>
    </section>
  );
}

export const AllCards: Story = {
  render: () => (
    <div className="flex flex-col gap-gt-24 bg-gt-bg p-gt-16">
      <header className="flex flex-col gap-gt-4">
        <h2 className="font-gt-display text-gt-3xl font-extrabold text-gt-ink">Card Icons (Chile)</h2>
        <p className="max-w-prose text-gt-sm text-gt-ink-2">
          Generic pixel-art cards for Chilean banks, retail cards, and networks — differentiated by
          the issuer's brand COLOR + a text label. No reproduced logos or wordmarks.
        </p>
      </header>

      <Section title="Bancos" kind="bank" />
      <Section title="Tarjetas de retail" kind="retail" />
      <Section title="Redes" kind="network" />

      {/* the raw color glyphs */}
      <section className="flex flex-col gap-gt-8">
        <h3 className="font-gt-display text-gt-lg font-extrabold text-gt-ink">Glifos base (por color)</h3>
        <div className="flex flex-wrap gap-gt-12">
          {CARD_COLOR_GLYPHS.map((g) => (
            <div key={g} className="flex flex-col items-center gap-gt-4 rounded-gt-xl border-2 border-gt-line bg-gt-surface p-gt-10 shadow-gt-xs">
              <PixelIcon name={g} size={40} />
              <span className="text-[10px] font-bold text-gt-ink-3">{g}</span>
            </div>
          ))}
        </div>
      </section>

      {/* generation recipe */}
      <section className="flex flex-col gap-gt-8">
        <h3 className="font-gt-display text-gt-lg font-extrabold text-gt-ink">Cómo generar uno nuevo</h3>
        <div className="flex flex-col gap-gt-6 rounded-gt-xl border-2 border-gt-line bg-gt-bg-3 p-gt-16 text-gt-sm text-gt-ink-2">
          <p className="font-bold text-gt-ink">PixelLab (pixflux), 32×32 — solo color, sin logo:</p>
          <pre className="overflow-x-auto whitespace-pre-wrap rounded-gt-lg border-2 border-gt-line bg-gt-surface p-gt-12 font-mono text-gt-xs leading-relaxed text-gt-ink">{`description: "A plain <COLOR> credit card icon, front view, solid <COLOR>
  body with a small gold chip, no text no logo no symbols, clean flat
  pixel art UI icon, dark outline"
negative_description: "text, letters, logo, brand, wordmark, words,
  numbers, symbols, blurry, 3d, realistic"
outline: "single color black outline"   shading: "flat shading"
detail: "low detail"   no_background: true   text_guidance_scale: 13
save_to_file: public/pixel-icons/card-<color>.png`}</pre>
          <p>Luego agrega una fila en <code className="font-mono text-gt-xs">lib/cardIcons.ts</code> mapeando el emisor → <code className="font-mono text-gt-xs">card-&lt;color&gt;</code> + su hex de marca.</p>
          <p className="font-bold text-gt-ink">Regla: nunca reproducir el logo o wordmark de la marca — solo color + etiqueta.</p>
        </div>
      </section>
    </div>
  ),
};
