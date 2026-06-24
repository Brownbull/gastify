import { PixelIcon } from "@design-system/assets/PixelIcon";
import { Button } from "@design-system/atoms/Button";
import { expandHex } from "@lib/hexColor";

/**
 * LandingScreen — the marketing entry (mobile + desktop). A hero with the
 * wordmark, tagline and mascot + the primary CTAs, then the feature highlights.
 * Replaces the onboarding carousel as the way into sign-up / sign-in.
 */
export interface LandingScreenProps {
  platform?: "mobile" | "tablet" | "desktop";
  onSignUp?: () => void;
  onSignIn?: () => void;
}

const FEATURES: { icon: string; color: string; title: string; body: string }[] = [
  { icon: "nav-scan", color: "#7B6EF6", title: "Escaneo con IA", body: "Saca una foto a la boleta y la IA extrae el comercio, los ítems y el total." },
  { icon: "chart-pie", color: "#F59E0B", title: "Análisis claro", body: "Mira a dónde se va tu plata, por categoría y por mes." },
  { icon: "settings-groups", color: "#10B981", title: "Grupos compartidos", body: "Comparte gastos con tu familia, roommates o amigos." },
  { icon: "fin-coin", color: "#3B82F6", title: "Multi-moneda", body: "Registra tus gastos en pesos, dólares o euros." },
];

function FeatureCard({ icon, color, title, body }: (typeof FEATURES)[number]) {
  return (
    <div className="flex items-start gap-gt-12 rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface px-gt-12 py-gt-12 shadow-gt-sm">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-gt-xl border-2 border-gt-line-strong" style={{ backgroundColor: `${expandHex(color)}26` }}>
        <PixelIcon name={icon} size={30} />
      </span>
      <span className="flex min-w-0 flex-col gap-gt-2">
        <span className="font-gt-display text-gt-md font-extrabold text-gt-ink">{title}</span>
        <span className="text-gt-sm font-medium text-gt-ink-2">{body}</span>
      </span>
    </div>
  );
}

export function LandingScreen({ platform = "mobile", onSignUp, onSignIn }: LandingScreenProps) {
  const desktop = platform === "desktop";
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-gt-bg">
      <div className="mx-auto flex w-full flex-1 flex-col gap-gt-24 px-gt-16 pb-gt-24 pt-gt-16" style={{ maxWidth: desktop ? "58rem" : undefined }}>
        {/* hero */}
        <section className="flex flex-col items-center gap-gt-12 pt-gt-16 text-center">
          <span className="font-gt-display font-extrabold leading-none text-gt-primary" style={{ fontSize: desktop ? 56 : 40 }}>gastify</span>
          <div className="flex flex-col gap-gt-6">
            <h1 className="font-gt-display font-extrabold leading-tight text-gt-ink" style={{ fontSize: desktop ? 40 : 28 }}>Tu dinero, bajo control</h1>
            <p className="mx-auto max-w-sm text-gt-md font-medium text-gt-ink-2">
              Escanea boletas, entiende tus gastos y compártelos con tu familia.
            </p>
          </div>
          <PixelIcon name="snowshoe-character" size={desktop ? 140 : 108} />
          <div className="flex w-full max-w-xs flex-col gap-gt-8">
            <Button variant="primary" fullWidth onClick={onSignUp}>Crear cuenta</Button>
            <p className="text-gt-sm font-bold text-gt-ink-2">
              ¿Ya tienes cuenta?{" "}
              <button type="button" onClick={onSignIn} className="font-gt-display font-extrabold text-gt-primary">Iniciar sesión</button>
            </p>
          </div>
        </section>

        {/* features */}
        <section className="flex flex-col gap-gt-12 pb-gt-8">
          <p className="text-center font-gt-display text-gt-sm font-extrabold uppercase tracking-wide text-gt-ink-3">Todo lo que necesitas</p>
          <div className={desktop ? "grid grid-cols-2 gap-gt-12" : "flex flex-col gap-gt-10"}>
            {FEATURES.map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
