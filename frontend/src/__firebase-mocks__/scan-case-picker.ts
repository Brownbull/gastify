// Dev-mode-only scan-case picker.
//
// Intercepts every click on `<input type="file" accept="image/*">` and
// shows an 8-option modal so we can pick which UX state to demo. Each
// case maps to a ScanOutcome consumed by gemini-mock.ts. The selected
// option:
//   1. sets window.__mockScanOutcome (consumed by gemini-mock.ts)
//   2. generates a labeled PNG filler image
//   3. attaches it to the input + fires `change` so the legacy code's
//      FileReader path runs as if a real image had been picked.
//
// Cases are grouped: 5 success-shaped flows (top) and 3 error variants
// (bottom). The error variants throw with distinct Firebase-callable
// error codes so the legacy services/gemini.ts handler differentiates
// them into distinct toast messages.

import type { ScanOutcome } from './gemini-mock';

interface CaseDef {
  outcome: ScanOutcome;
  label: string;
  description: string;
  // Hex colour for the filler image background, lets you visually confirm
  // which case you picked even after dismissing the modal.
  colour: string;
}

const CASES: CaseDef[] = [
  // ── Success-shaped flows (group A) ──
  {
    outcome: 'happy',
    label: 'Camino feliz',
    description: 'Extracción correcta y alta confianza — abre el flujo de guardado rápido.',
    colour: '#4ade80',
  },
  {
    outcome: 'warning',
    label: 'Con advertencias',
    description: 'Items no suman al total — surge el diálogo de discrepancia antes de guardar.',
    colour: '#fbbf24',
  },
  {
    outcome: 'currency-mismatch',
    label: 'Otra moneda',
    description: 'Boleta en USD cuando tu moneda por defecto es CLP — abre el diálogo de moneda.',
    colour: '#60a5fa',
  },
  {
    outcome: 'unknown-merchant',
    label: 'Comercio nuevo',
    description: 'Comercio que no existe en tus mapeos — primer escaneo sin historial.',
    colour: '#a78bfa',
  },
  {
    outcome: 'low-confidence-coerced',
    label: 'Boleta confusa',
    description: 'Confianza baja con campos genéricos ("Unknown", "Producto ilegible") — UI debe mostrar incertidumbre.',
    colour: '#94a3b8',
  },

  // ── Error variants (group B) ──
  {
    outcome: 'error',
    label: 'Error: fallo genérico',
    description: 'El backend falla con un error sin causa específica — toast genérico + reintento.',
    colour: '#f87171',
  },
  {
    outcome: 'error-no-credits',
    label: 'Error: créditos agotados',
    description: 'Sin créditos disponibles — toast con CTA para comprar más.',
    colour: '#e11d48',
  },
  {
    outcome: 'error-rate-limit',
    label: 'Error: límite de uso',
    description: 'Demasiadas solicitudes por minuto — toast con sugerencia de esperar.',
    colour: '#fb7185',
  },
];

const STYLE_ID = 'mock-scan-picker-styles';

let installed = false;

export function installScanCasePicker(): void {
  if (installed) return;
  if (typeof document === 'undefined') return;
  installed = true;

  injectStyles();
  patchFileInputClick();
}

function injectStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .mock-scan-picker-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.6);
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      backdrop-filter: blur(2px);
    }
    .mock-scan-picker-modal {
      background: #ffffff;
      border-radius: 16px;
      max-width: 540px;
      width: 100%;
      box-shadow: 0 24px 48px rgba(0, 0, 0, 0.25);
      overflow: hidden;
      font-family: var(--font-family, system-ui), system-ui, sans-serif;
    }
    .mock-scan-picker-header {
      padding: 18px 20px 8px;
    }
    .mock-scan-picker-eyebrow {
      font-size: 11px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #64748b;
      font-weight: 600;
    }
    .mock-scan-picker-title {
      margin: 6px 0 4px;
      font-size: 18px;
      color: #0f172a;
      font-weight: 700;
    }
    .mock-scan-picker-sub {
      margin: 0;
      font-size: 13px;
      color: #475569;
      line-height: 1.45;
    }
    .mock-scan-picker-body {
      padding: 8px 12px 16px;
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
    }
    .mock-scan-picker-divider {
      grid-column: 1 / -1;
      border-top: 1px dashed #e2e8f0;
      margin: 6px 0 2px;
      padding-top: 4px;
      font-size: 10px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #94a3b8;
      font-weight: 600;
    }
    .mock-scan-picker-option {
      display: flex;
      gap: 10px;
      align-items: stretch;
      padding: 10px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      text-align: left;
      cursor: pointer;
      font-family: inherit;
      transition: border-color 120ms, background-color 120ms, transform 120ms;
      min-height: 64px;
    }
    .mock-scan-picker-option:hover {
      background: #f1f5f9;
      border-color: #94a3b8;
    }
    .mock-scan-picker-option:active {
      transform: scale(0.99);
    }
    .mock-scan-picker-swatch {
      flex: 0 0 8px;
      width: 8px;
      align-self: stretch;
      border-radius: 4px;
    }
    .mock-scan-picker-text {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .mock-scan-picker-name {
      font-size: 14px;
      color: #0f172a;
      font-weight: 600;
    }
    .mock-scan-picker-desc {
      font-size: 12px;
      color: #475569;
      line-height: 1.4;
    }
    .mock-scan-picker-cancel {
      padding: 10px 20px 16px;
      display: flex;
      justify-content: flex-end;
    }
    .mock-scan-picker-cancel button {
      background: transparent;
      border: none;
      color: #64748b;
      font-size: 13px;
      cursor: pointer;
      padding: 6px 10px;
      border-radius: 6px;
    }
    .mock-scan-picker-cancel button:hover { background: #f1f5f9; }
  `;
  document.head.appendChild(style);
}

function patchFileInputClick(): void {
  const proto = window.HTMLInputElement.prototype;
  const originalClick = proto.click;

  proto.click = function patchedClick(this: HTMLInputElement) {
    if (this.type !== 'file' || !this.accept || !this.accept.includes('image/')) {
      return originalClick.call(this);
    }
    if ((this.dataset.mockBypass ?? '') === '1') {
      // Picker is recursing into the real native click via the bypass flag.
      this.dataset.mockBypass = '';
      return originalClick.call(this);
    }
    showCasePicker(this);
  };
}

function showCasePicker(input: HTMLInputElement): void {
  const overlay = document.createElement('div');
  overlay.className = 'mock-scan-picker-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');

  const modal = document.createElement('div');
  modal.className = 'mock-scan-picker-modal';

  const header = document.createElement('div');
  header.className = 'mock-scan-picker-header';
  header.innerHTML = `
    <div class="mock-scan-picker-eyebrow">mock build · gastify</div>
    <h2 class="mock-scan-picker-title">¿Qué caso de escaneo querés simular?</h2>
    <p class="mock-scan-picker-sub">El frontend está en modo mock. En lugar de subir una imagen real, elegí el resultado que querés ver — el flujo continúa con datos simulados.</p>
  `;
  modal.appendChild(header);

  const body = document.createElement('div');
  body.className = 'mock-scan-picker-body';

  let lastWasError = false;
  for (const cas of CASES) {
    const isError = cas.outcome.startsWith('error');
    if (isError && !lastWasError) {
      // Visual break between success-shaped cases and error variants.
      const divider = document.createElement('div');
      divider.className = 'mock-scan-picker-divider';
      divider.textContent = 'Errores';
      body.appendChild(divider);
    }
    lastWasError = isError;

    const opt = document.createElement('button');
    opt.type = 'button';
    opt.className = 'mock-scan-picker-option';
    opt.innerHTML = `
      <div class="mock-scan-picker-swatch" style="background:${cas.colour}"></div>
      <div class="mock-scan-picker-text">
        <div class="mock-scan-picker-name">${cas.label}</div>
        <div class="mock-scan-picker-desc">${cas.description}</div>
      </div>
    `;
    opt.addEventListener('click', () => {
      void selectCase(input, cas, overlay);
    });
    body.appendChild(opt);
  }

  modal.appendChild(body);

  const footer = document.createElement('div');
  footer.className = 'mock-scan-picker-cancel';
  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.textContent = 'Cancelar';
  cancel.addEventListener('click', () => overlay.remove());
  footer.appendChild(cancel);
  modal.appendChild(footer);

  overlay.appendChild(modal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
  document.body.appendChild(overlay);
}

async function selectCase(
  input: HTMLInputElement,
  cas: CaseDef,
  overlay: HTMLElement,
): Promise<void> {
  type WithMock = Window & { __mockScanOutcome?: ScanOutcome };
  (window as WithMock).__mockScanOutcome = cas.outcome;
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.info('[mock scan picker] selected', cas.outcome);
  }

  const file = await renderCaseFile(cas);
  const dt = new DataTransfer();
  dt.items.add(file);
  input.files = dt.files;
  input.dispatchEvent(new Event('change', { bubbles: true }));
  overlay.remove();
}

function renderCaseFile(cas: CaseDef): Promise<File> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 480;
    canvas.height = 640;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      const fallback = new Blob([new Uint8Array([])], { type: 'image/png' });
      resolve(new File([fallback], `mock-${cas.outcome}.png`, { type: 'image/png' }));
      return;
    }
    // Background tint to match swatch colour
    ctx.fillStyle = cas.colour;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Inner panel
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(36, 60, canvas.width - 72, canvas.height - 120);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(48, 72, canvas.width - 96, canvas.height - 144);
    // Caption
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 28px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('MOCK BOLETA', canvas.width / 2, 160);
    ctx.font = '500 18px system-ui, sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText('gastify dev fixture', canvas.width / 2, 200);
    ctx.font = 'bold 36px system-ui, sans-serif';
    ctx.fillStyle = cas.colour;
    ctx.fillText(cas.label.toUpperCase(), canvas.width / 2, 320);
    ctx.font = '500 16px system-ui, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText(`outcome: ${cas.outcome}`, canvas.width / 2, 360);
    ctx.fillText(new Date().toISOString().slice(0, 10), canvas.width / 2, 440);

    canvas.toBlob((blob) => {
      const safeBlob = blob ?? new Blob([new Uint8Array([])], { type: 'image/png' });
      resolve(new File([safeBlob], `mock-${cas.outcome}.png`, { type: 'image/png' }));
    }, 'image/png');
  });
}
