/**
 * ToastDemo — emitted by /gabe-mockup spike toast --system for visual +
 * interactive comparison with the canonical mockup.
 *
 * Two rows:
 *   1. Static showcase — all variants visible at once (no auto-dismiss). Use
 *      this row to verify token-chain parity against
 *      ../../../docs/mockups/molecules/toast.html.
 *   2. Trigger row — buttons that dispatch via useToast(). Validates the
 *      Provider + queue + auto-dismiss + hover-pause path.
 *
 * Theme/mode toggle flips <body data-theme/data-mode> the same way tweaks.js
 * does in the static mockup, so the cascade is identical.
 */
import { useEffect, useState } from "react";
import { useToast } from "../components/Toast/useToast";
import { Toast } from "../components/Toast/Toast";

const VARIANTS = ["success", "info", "warning", "error"] as const;
type Variant = (typeof VARIANTS)[number];

const SAMPLE_TITLES: Record<Variant, string> = {
  success: "Gasto guardado",
  info: "Sincronizando",
  warning: "Te quedan 3 escaneos este mes",
  error: "Error al guardar",
};
const SAMPLE_MESSAGES: Record<Variant, string> = {
  success: "Jumbo Costanera Center · $24.890 agregado a Mercado.",
  info: "Subiendo 3 gastos guardados sin conexión.",
  warning: "Pasá a Plan Pro para escaneos ilimitados.",
  error: "No hay conexión. Tu gasto se guardó localmente y se sincronizará después.",
};

export default function ToastDemo() {
  const dispatch = useToast();
  const [theme, setTheme] = useState("normal");
  const [mode, setMode] = useState<"light" | "dark">("light");

  useEffect(() => {
    document.body.dataset.theme = theme;
    document.body.dataset.mode = mode;
  }, [theme, mode]);

  return (
    <main style={{ padding: "40px 48px", maxWidth: 1100, margin: "0 auto" }}>
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ margin: 0, color: "var(--ink)" }}>Toast — React port</h1>
        <p style={{ color: "var(--ink-2)", marginTop: 8 }}>
          Compare against{" "}
          <code>docs/mockups/molecules/toast.html</code> served at port 4173.
        </p>
        <div style={{ display: "flex", gap: 12, marginTop: 16, color: "var(--ink-2)" }}>
          <label>
            Theme:&nbsp;
            <select value={theme} onChange={(e) => setTheme(e.target.value)}>
              <option value="normal">normal</option>
              <option value="professional">professional</option>
              <option value="mono">mono</option>
            </select>
          </label>
          <label>
            Mode:&nbsp;
            <select value={mode} onChange={(e) => setMode(e.target.value as "light" | "dark")}>
              <option value="light">light</option>
              <option value="dark">dark</option>
            </select>
          </label>
        </div>
      </header>

      <section style={{ marginBottom: 36 }}>
        <h2
          style={{
            fontSize: 13,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "var(--ink-3)",
          }}
        >
          Static showcase (no auto-dismiss)
        </h2>
        <div
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--line)",
            borderRadius: 12,
            padding: 24,
          }}
        >
          {/* Override fixed positioning so the stack lays out inline for visual diff */}
          <div className="toast-stack" style={{ position: "relative", bottom: "auto", right: "auto" }}>
            {VARIANTS.map((v) => (
              <Toast
                key={v}
                id={`static-${v}`}
                type={v}
                title={SAMPLE_TITLES[v]}
                message={SAMPLE_MESSAGES[v]}
                duration={0}
                onDismiss={() => {}}
              />
            ))}
          </div>
        </div>
      </section>

      <section>
        <h2
          style={{
            fontSize: 13,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "var(--ink-3)",
          }}
        >
          Dispatch via useToast (queue + auto-dismiss + hover-pause)
        </h2>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {VARIANTS.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() =>
                dispatch[v](SAMPLE_MESSAGES[v], { title: SAMPLE_TITLES[v] })
              }
              style={{
                padding: "10px 18px",
                background: "var(--surface)",
                color: "var(--ink)",
                border: "1px solid var(--line)",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              Trigger {v}
            </button>
          ))}
        </div>
        <p style={{ marginTop: 16, fontSize: 12, color: "var(--ink-3)" }}>
          Default durations: success/info 5s, warning 8s, error sticky (manual close). Hover any
          live toast to pause its timer; mouse-leave resumes it.
        </p>
      </section>
    </main>
  );
}
