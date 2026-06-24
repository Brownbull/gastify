import { useState } from "react";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { Button } from "@design-system/atoms/Button";
import { expandHex } from "@lib/hexColor";

/** Three first-run slides introducing the app's value, then "Comenzar" → auth. */
const SLIDES: { icon: string; color: string; title: string; body: string }[] = [
  { icon: "nav-scan", color: "#7B6EF6", title: "Escanea tus boletas", body: "La IA extrae el comercio, los ítems y el total — sin escribir nada." },
  { icon: "chart-pie", color: "#F59E0B", title: "Entiende tus gastos", body: "Mira a dónde se va tu plata, por categoría y por mes." },
  { icon: "settings-groups", color: "#10B981", title: "Comparte con tu grupo", body: "Gastos compartidos con tu familia, roommates o amigos." },
];

export function OnboardingScreen({ onDone }: { onDone?: () => void }) {
  const [i, setI] = useState(0);
  const slide = SLIDES[i];
  const last = i === SLIDES.length - 1;
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-gt-bg px-gt-20 pb-gt-24" style={{ paddingTop: 44 }}>
      <div className="flex h-8 items-center justify-end">
        <button type="button" onClick={onDone} className="font-gt-display text-gt-sm font-extrabold text-gt-ink-3 transition hover:text-gt-ink">
          Saltar
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-gt-16 text-center">
        <span
          className="grid h-32 w-32 place-items-center rounded-gt-3xl border-2 border-gt-line-strong shadow-gt-md"
          style={{ backgroundColor: `${expandHex(slide.color)}26` }}
        >
          <PixelIcon name={slide.icon} size={84} />
        </span>
        <div className="flex flex-col gap-gt-8">
          <h1 className="font-gt-display text-gt-3xl font-extrabold text-gt-ink">{slide.title}</h1>
          <p className="max-w-xs text-gt-md font-medium text-gt-ink-2">{slide.body}</p>
        </div>
      </div>

      <div className="flex items-center justify-center gap-gt-6 pb-gt-16">
        {SLIDES.map((_, n) => (
          <span key={n} className={`h-2.5 rounded-gt-pill transition-all ${n === i ? "w-6 bg-gt-primary" : "w-2.5 bg-gt-line-strong"}`} />
        ))}
      </div>

      <Button variant="primary" fullWidth onClick={() => (last ? onDone?.() : setI(i + 1))}>
        {last ? "Comenzar" : "Siguiente"}
      </Button>
    </div>
  );
}
