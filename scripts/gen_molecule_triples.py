#!/usr/bin/env python3
"""
gen_molecule_triples.py — D18 cascade scaffolder for gastify mockups-legacy.

Emits 3 platform-scoped files per molecule:
  <slug>-mobile.html    — wraps demo in `.screen-phone` (390 x 844)
  <slug>-tablet.html    — wraps demo in `.tablet-surface` (820 x 1180)
  <slug>-desktop.html   — wraps demo in `.desktop-surface` (1120 x 720)

Plus rewrites the consolidated `<slug>.html` into a 3-card landing page
linking the per-platform variants.

Discardable scaffolder — run once during the cascade, then leave behind.
"""
from __future__ import annotations

from pathlib import Path
from textwrap import dedent

ROOT = Path(__file__).resolve().parent.parent
MOLECULES_DIR = ROOT / "docs" / "mockups-legacy" / "molecules"

# ---------------------------------------------------------------------------
# Per-molecule canonical demo snippet (mounts inside a surface wrapper)
# ---------------------------------------------------------------------------

MOLECULES: dict[str, dict] = {
    "banner": {
        "display": "Banner",
        "subtitle": "Inline status surface — info / warning / error / offline. Class names mirror "
                    "<code>frontend/src/features/batch-review/views/BatchCaptureCreditSection.tsx</code>.",
        "demo": dedent("""\
            <div class=\"banner banner--warning\" role=\"status\">
              <span class=\"banner__icon\" aria-hidden=\"true\">!</span>
              <span class=\"banner__body\">Te quedan <strong>3 escaneos</strong> este mes. Pasá a Plan Pro o esperá hasta el 1 de mayo.</span>
              <div class=\"banner__actions\">
                <button class=\"btn btn--primary btn--sm\">Ver planes</button>
                <button class=\"btn btn--icon btn--sm\" aria-label=\"Cerrar\">&times;</button>
              </div>
            </div>
            <div class=\"banner banner--info\" role=\"status\" style=\"margin-top: 12px;\">
              <span class=\"banner__icon\" aria-hidden=\"true\">i</span>
              <span class=\"banner__body\">Tu sincronización terminó hace 2 minutos. <strong>128 gastos al día</strong>.</span>
              <div class=\"banner__actions\">
                <button class=\"btn btn--ghost btn--sm\">Ver detalle</button>
              </div>
            </div>
            <div class=\"banner banner--error\" role=\"alert\" style=\"margin-top: 12px;\">
              <span class=\"banner__icon\" aria-hidden=\"true\">!</span>
              <span class=\"banner__body\"><strong>No pudimos cargar tu estado de cuenta.</strong> Probá subirlo de nuevo.</span>
              <div class=\"banner__actions\">
                <button class=\"btn btn--ghost btn--sm\">Reintentar</button>
              </div>
            </div>
        """),
        # Offline edge-bleed only renders meaningfully on phone (full-width, no radius)
        "platform_overrides": {
            "mobile": dedent("""\
                <div class=\"banner banner--warning\" role=\"status\">
                  <span class=\"banner__icon\" aria-hidden=\"true\">!</span>
                  <span class=\"banner__body\">Te quedan <strong>3 escaneos</strong> este mes.</span>
                  <div class=\"banner__actions\">
                    <button class=\"btn btn--primary btn--sm\">Ver planes</button>
                  </div>
                </div>
                <div class=\"banner banner--info\" role=\"status\" style=\"margin-top: 12px;\">
                  <span class=\"banner__icon\" aria-hidden=\"true\">i</span>
                  <span class=\"banner__body\">Sync hace 2 min · <strong>128 gastos</strong>.</span>
                </div>
                <div class=\"banner banner--offline\" role=\"status\" style=\"margin-top: 12px; border-radius: 0; border-left: 0; border-right: 0;\">
                  <span class=\"banner__icon\" aria-hidden=\"true\">&#x2298;</span>
                  <span class=\"banner__body\">Sin conexión. Tus gastos se sincronizarán al reconectar.</span>
                </div>
            """),
        },
    },
    "toast-system": {
        "display": "Toast system",
        "subtitle": "Transient notification overlay. Single-toast semantics in the live frontend "
                    "(<code>useToast</code> hook). Position differs per platform — see surface overrides.",
        "demo": dedent("""\
            <div class=\"toast-stack toast-stack--inline\">
              <div class=\"toast toast--success\" role=\"status\" aria-live=\"polite\">
                <span class=\"toast__icon\" aria-hidden=\"true\">
                  <svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><polyline points=\"20 6 9 17 4 12\"/></svg>
                </span>
                Gasto guardado
              </div>
              <div class=\"toast toast--info\" role=\"status\" aria-live=\"polite\" style=\"margin-top: 8px;\">
                <span class=\"toast__icon\" aria-hidden=\"true\">
                  <svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.5\" stroke-linecap=\"round\"><circle cx=\"12\" cy=\"12\" r=\"10\"/><line x1=\"12\" y1=\"16\" x2=\"12\" y2=\"12\"/><line x1=\"12\" y1=\"8\" x2=\"12.01\" y2=\"8\"/></svg>
                </span>
                Procesando recibo…
              </div>
              <div class=\"toast toast--error\" role=\"alert\" aria-live=\"assertive\" style=\"margin-top: 8px;\">
                <span class=\"toast__icon\" aria-hidden=\"true\">
                  <svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.5\" stroke-linecap=\"round\"><circle cx=\"12\" cy=\"12\" r=\"10\"/><line x1=\"15\" y1=\"9\" x2=\"9\" y2=\"15\"/><line x1=\"9\" y1=\"9\" x2=\"15\" y2=\"15\"/></svg>
                </span>
                No pude guardar el gasto
              </div>
            </div>
        """),
    },
    "card-celebration": {
        "display": "Card · celebration",
        "subtitle": "Reward / streak / milestone surface. Used by Insights + first-completion flows.",
        "demo": dedent("""\
            <div class=\"card-celebration\" role=\"status\">
              <button class=\"card-celebration__dismiss\" aria-label=\"Cerrar\">&times;</button>
              <div class=\"card-celebration__icon\" aria-hidden=\"true\">🎉</div>
              <h3 class=\"card-celebration__title\">¡Llegaste a 30 gastos!</h3>
              <p class=\"card-celebration__body\">Llevás un récord de 7 días seguidos registrando. Seguí así para desbloquear el logro <strong>Constancia</strong>.</p>
              <button class=\"btn btn--primary\">Ver mi progreso</button>
            </div>
        """),
    },
    "card-empty": {
        "display": "Card · empty state",
        "subtitle": "First-run / no-data surface. Used in History (no transactions yet), Groups (no group), Reports (no period).",
        "demo": dedent("""\
            <div class=\"card-empty\">
              <div class=\"card-empty__icon\" aria-hidden=\"true\">📭</div>
              <h3 class=\"card-empty__title\">Aún no hay gastos</h3>
              <p class=\"card-empty__body\">Escaneá tu primer recibo o ingresalo a mano para empezar a ver tus gastos acá.</p>
              <div class=\"card-empty__actions\">
                <button class=\"btn btn--primary\">Escanear ahora</button>
                <button class=\"btn btn--ghost\">Ingresar a mano</button>
              </div>
            </div>
        """),
    },
    "card-stat": {
        "display": "Card · stat",
        "subtitle": "Single KPI tile. Composes into stat grids on Dashboard / Insights / Trends.",
        "demo": dedent("""\
            <div class=\"card-stat\">
              <span class=\"card-stat__label\">Este mes</span>
              <span class=\"card-stat__value\">$248.500</span>
              <span class=\"card-stat__delta card-stat__delta--up\">+12% vs mes pasado</span>
            </div>
            <div class=\"card-stat\" style=\"margin-top: 12px;\">
              <span class=\"card-stat__label\">Gastos registrados</span>
              <span class=\"card-stat__value\">42</span>
              <span class=\"card-stat__delta card-stat__delta--down\">-3 vs mes pasado</span>
            </div>
        """),
        "platform_overrides": {
            "desktop": dedent("""\
                <div style=\"display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; padding: 24px;\">
                  <div class=\"card-stat\">
                    <span class=\"card-stat__label\">Este mes</span>
                    <span class=\"card-stat__value\">$248.500</span>
                    <span class=\"card-stat__delta card-stat__delta--up\">+12%</span>
                  </div>
                  <div class=\"card-stat\">
                    <span class=\"card-stat__label\">Gastos</span>
                    <span class=\"card-stat__value\">42</span>
                    <span class=\"card-stat__delta card-stat__delta--down\">-3</span>
                  </div>
                  <div class=\"card-stat\">
                    <span class=\"card-stat__label\">Promedio</span>
                    <span class=\"card-stat__value\">$5.917</span>
                    <span class=\"card-stat__delta\">igual</span>
                  </div>
                </div>
            """),
            "tablet": dedent("""\
                <div style=\"display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; padding: 24px;\">
                  <div class=\"card-stat\">
                    <span class=\"card-stat__label\">Este mes</span>
                    <span class=\"card-stat__value\">$248.500</span>
                    <span class=\"card-stat__delta card-stat__delta--up\">+12% vs mes pasado</span>
                  </div>
                  <div class=\"card-stat\">
                    <span class=\"card-stat__label\">Gastos registrados</span>
                    <span class=\"card-stat__value\">42</span>
                    <span class=\"card-stat__delta card-stat__delta--down\">-3 vs mes pasado</span>
                  </div>
                </div>
            """),
        },
    },
    "card-transaction": {
        "display": "Card · transaction",
        "subtitle": "List row — used in History, Group transactions, Reconciliation list. Compact on phone, expanded on tablet/desktop.",
        "demo": dedent("""\
            <div class=\"card-transaction\">
              <div class=\"card-transaction__icon\" aria-hidden=\"true\">🛒</div>
              <div class=\"card-transaction__body\">
                <div class=\"card-transaction__title\">Líder Florida</div>
                <div class=\"card-transaction__meta\">Supermercado · Hoy 14:32</div>
              </div>
              <div class=\"card-transaction__amount\">-$28.490</div>
            </div>
            <div class=\"card-transaction\" style=\"margin-top: 8px;\">
              <div class=\"card-transaction__icon\" aria-hidden=\"true\">⛽</div>
              <div class=\"card-transaction__body\">
                <div class=\"card-transaction__title\">Copec</div>
                <div class=\"card-transaction__meta\">Combustible · Ayer 19:08</div>
              </div>
              <div class=\"card-transaction__amount\">-$42.000</div>
            </div>
            <div class=\"card-transaction\" style=\"margin-top: 8px;\">
              <div class=\"card-transaction__icon\" aria-hidden=\"true\">🍽️</div>
              <div class=\"card-transaction__body\">
                <div class=\"card-transaction__title\">Liguria Manuel Montt</div>
                <div class=\"card-transaction__meta\">Restaurant · Lun 21:45</div>
              </div>
              <div class=\"card-transaction__amount\">-$36.700</div>
            </div>
        """),
    },
    "state-tabs": {
        "display": "State tabs",
        "subtitle": "Multi-state mockup driver — toggles <code>.state-content.active</code> via the shared "
                    "<code>tweaks.js</code> ARIA-or-legacy state-tab handler. Used inside every multi-state screen.",
        "demo": dedent("""\
            <div role=\"tablist\" class=\"state-tabs\" aria-label=\"Demo states\">
              <button role=\"tab\" aria-selected=\"true\" tabindex=\"0\" class=\"is-active\">Idle</button>
              <button role=\"tab\" aria-selected=\"false\" tabindex=\"-1\">Loading</button>
              <button role=\"tab\" aria-selected=\"false\" tabindex=\"-1\">Empty</button>
              <button role=\"tab\" aria-selected=\"false\" tabindex=\"-1\">Error</button>
            </div>
            <div class=\"state-content active\" role=\"tabpanel\" style=\"padding: 24px; background: var(--surface); border-radius: 12px; margin-top: 12px;\">
              <p style=\"margin: 0; color: var(--text-secondary); font-size: 13px;\">Cuerpo del estado <strong>idle</strong>. Cambiá la pestaña para ver el resto.</p>
            </div>
        """),
    },
}

PLATFORMS = {
    "mobile": {
        "wrap_class": "screen-phone",
        "label": "📱 Mobile · 390 × 844",
        "label_text": "Mobile",
        "glyph": "📱",
        "dim": "390 × 844",
    },
    "tablet": {
        "wrap_class": "tablet-surface",
        "label": "📐 Tablet · 820 × 1180",
        "label_text": "Tablet",
        "glyph": "📐",
        "dim": "820 × 1180",
    },
    "desktop": {
        "wrap_class": "desktop-surface",
        "label": "🖥️ Desktop · 1120 × 720",
        "label_text": "Desktop",
        "glyph": "🖥️",
        "dim": "1120 × 720",
    },
}

# ---------------------------------------------------------------------------
# Templates
# ---------------------------------------------------------------------------

PLATFORM_PAGE_TMPL = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{display} · {plat_label_text} — gastify (mockups-legacy)</title>
  <link rel="stylesheet" href="../assets/css/desktop-shell.css">
  <link rel="stylesheet" href="../assets/css/atoms.css">
  <link rel="stylesheet" href="../assets/css/molecules.css">
  <style>
    body {{ margin: 0; background: var(--bg-secondary, var(--bg)); color: var(--text-primary); min-height: 100vh; padding: 32px 320px 32px 32px; font-family: var(--font-family); }}
    h1 {{ font-size: 22px; margin: 0 0 4px 0; font-weight: 700; }}
    .subtitle {{ color: var(--text-secondary); font-size: 13px; margin: 0 0 20px 0; max-width: 720px; line-height: 1.5; }}
    .surface-meta {{ font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-tertiary); font-weight: 600; }}
    .crossref-row {{ display: flex; gap: 12px; flex-wrap: wrap; margin-top: 24px; font-size: 12px; }}
    .crossref-row a {{ color: var(--primary); text-decoration: none; padding: 6px 10px; border: 1px solid var(--border-light); border-radius: 999px; background: var(--surface); }}
    .crossref-row a:hover {{ filter: brightness(0.97); }}
  </style>
</head>
<body>
  <h1>{display}</h1>
  <p class="subtitle">{subtitle}</p>
  <span class="surface-meta">{plat_label}</span>

  <div class="{wrap_class}">
    <div class="surface-frame">
{demo_indented}
    </div>
  </div>

  <nav class="crossref-row" aria-label="Platform variants">
    <a href="./{slug}.html">↩ Landing</a>
    <a href="./{slug}-mobile.html">📱 Mobile</a>
    <a href="./{slug}-tablet.html">📐 Tablet</a>
    <a href="./{slug}-desktop.html">🖥️ Desktop</a>
  </nav>

  <script src="../assets/js/tweaks.js" defer></script>
</body>
</html>
"""

LANDING_PAGE_TMPL = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Molecule: {display} — gastify (mockups-legacy)</title>
  <link rel="stylesheet" href="../assets/css/desktop-shell.css">
  <link rel="stylesheet" href="../assets/css/atoms.css">
  <link rel="stylesheet" href="../assets/css/molecules.css">
  <style>
    body {{ margin: 0; background: var(--bg); color: var(--text-primary); min-height: 100vh; padding: 40px 320px 48px 48px; font-family: var(--font-family); }}
    h1 {{ font-size: 24px; margin: 0 0 6px 0; font-weight: 700; }}
    .subtitle {{ color: var(--text-secondary); font-size: 13px; margin: 0 0 32px 0; max-width: 720px; line-height: 1.5; }}
    .platform-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-bottom: 32px; }}
    .platform-card {{ display: flex; flex-direction: column; gap: 8px; padding: 20px; border: 1px solid var(--border-light); border-radius: 14px; background: var(--surface); text-decoration: none; color: inherit; transition: transform 120ms ease, box-shadow 120ms ease; }}
    .platform-card:hover {{ transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); }}
    .platform-card__glyph {{ font-size: 32px; line-height: 1; }}
    .platform-card__title {{ font-size: 15px; font-weight: 700; color: var(--text-primary); }}
    .platform-card__dim {{ font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-tertiary); font-weight: 600; }}
    .platform-card__desc {{ font-size: 12px; color: var(--text-secondary); line-height: 1.5; }}
    .crossref {{ background: var(--bg-secondary); padding: 16px 18px; border-radius: 10px; border: 1px solid var(--border-light); font-size: 13px; color: var(--text-secondary); line-height: 1.7; margin-top: 24px; }}
    .crossref a {{ color: var(--primary); text-decoration: none; font-weight: 600; }}
    .crossref a:hover {{ text-decoration: underline; }}
    .crossref strong {{ color: var(--text-primary); }}
  </style>
</head>
<body>
  <h1>Molecule · {display}</h1>
  <p class="subtitle">{subtitle}</p>

  <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-tertiary); font-weight: 600; margin: 0 0 12px 0;">Platform variants (D18)</p>
  <div class="platform-grid">
    <a class="platform-card" href="./{slug}-mobile.html">
      <span class="platform-card__glyph" aria-hidden="true">📱</span>
      <span class="platform-card__title">Mobile</span>
      <span class="platform-card__dim">390 × 844 · phone frame</span>
      <span class="platform-card__desc">Renders inside <code>.screen-phone</code>. Edge-bleed offline banner, single-column stacking.</span>
    </a>
    <a class="platform-card" href="./{slug}-tablet.html">
      <span class="platform-card__glyph" aria-hidden="true">📐</span>
      <span class="platform-card__title">Tablet</span>
      <span class="platform-card__dim">820 × 1180 · iPad portrait</span>
      <span class="platform-card__desc">Renders inside <code>.tablet-surface</code>. Bottom-nav still applies (under 1024 sidebar threshold).</span>
    </a>
    <a class="platform-card" href="./{slug}-desktop.html">
      <span class="platform-card__glyph" aria-hidden="true">🖥️</span>
      <span class="platform-card__title">Desktop</span>
      <span class="platform-card__dim">1120 × 720 · edge-to-edge</span>
      <span class="platform-card__desc">Renders inside <code>.desktop-surface</code>. Wider cards, side-nav, toast bottom-right.</span>
    </a>
  </div>

  <div class="crossref">
    <strong>Composition:</strong>
    <ul style="margin: 8px 0 0; padding-left: 20px;">
      <li><strong>Atoms used (one level down):</strong> see per-platform files for live demo + <a href="../atoms/index.html">atoms catalog</a></li>
      <li><strong>Used by screens:</strong> see <a href="./SCREEN-USAGE.md">SCREEN-USAGE.md</a> — populated as L4 screens land.</li>
      <li><strong>Cross-platform invariants:</strong> class names, ARIA roles, state matrix identical across all three files. Differences are scoped to <code>.screen-phone</code> / <code>.tablet-surface</code> / <code>.desktop-surface</code> overrides in <a href="../assets/css/molecules.css">molecules.css</a>.</li>
    </ul>
  </div>

  <script src="../assets/js/tweaks.js" defer></script>
</body>
</html>
"""


# ---------------------------------------------------------------------------
# Generation
# ---------------------------------------------------------------------------

def indent_block(block: str, spaces: int = 6) -> str:
    """Indent every non-empty line in `block` by `spaces` spaces."""
    pad = " " * spaces
    return "\n".join(pad + line if line else line for line in block.splitlines())


def emit_platform_file(slug: str, plat: str, mol: dict) -> Path:
    plat_meta = PLATFORMS[plat]
    demo = mol.get("platform_overrides", {}).get(plat, mol["demo"])
    out = MOLECULES_DIR / f"{slug}-{plat}.html"
    body = PLATFORM_PAGE_TMPL.format(
        display=mol["display"],
        subtitle=mol["subtitle"],
        slug=slug,
        wrap_class=plat_meta["wrap_class"],
        plat_label=plat_meta["label"],
        plat_label_text=plat_meta["label_text"],
        demo_indented=indent_block(demo, spaces=6),
    )
    out.write_text(body, encoding="utf-8")
    return out


def emit_landing(slug: str, mol: dict) -> Path:
    out = MOLECULES_DIR / f"{slug}.html"
    body = LANDING_PAGE_TMPL.format(
        display=mol["display"],
        subtitle=mol["subtitle"],
        slug=slug,
    )
    out.write_text(body, encoding="utf-8")
    return out


def main() -> None:
    if not MOLECULES_DIR.exists():
        raise SystemExit(f"Molecules dir missing: {MOLECULES_DIR}")

    written: list[Path] = []
    for slug, mol in MOLECULES.items():
        for plat in PLATFORMS:
            written.append(emit_platform_file(slug, plat, mol))
        written.append(emit_landing(slug, mol))

    print(f"Wrote {len(written)} files:")
    for p in written:
        print(f"  - {p.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
