/*
 * tweaks.js — self-contained runtime theme/mode/font/density/radius panel
 *
 * Drop-in via a single script tag:
 *   <script src="<relative-path>/assets/js/tweaks.js" defer></script>
 *
 * Injects its own <style> block + <div id="tweaks-panel"> on boot. No external
 * dependencies. Walks document.styleSheets to detect [data-theme="X"] and
 * [data-font="X"] selectors — works with any tokens CSS (greenfield
 * tokens.css OR legacy projects with <project>-shell.css).
 *
 * Also drives state-tabs (multi-state screens). Accepts two DOM shapes:
 *   (a) ARIA:   <div role="tablist" class="state-tabs"><button role="tab">...</button></div>
 *   (b) Legacy: <div class="state-tabs"><button class="state-tab" data-state="...">...</button></div>
 *
 * Source of truth: /home/khujta/projects/gabe_lens/templates/mockup/tweaks.js
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'gabe-mockup-tweaks-v1';

  const DEFAULTS = {
    theme: 'default',
    mode: 'light',
    font: 'default',
    textScale: 1,
    density: 'regular',
    radius: 'medium',
    primaryOverride: '',
    collapsed: false,
  };

  /* ========== Injected styles ========== */

  const PANEL_STYLES = `
    #tweaks-panel {
      position: fixed; top: 0; right: 0;
      width: 280px; height: 100vh;
      background: var(--surface, var(--bg, #fafafa));
      border-left: 1px solid var(--border, #e4e4e7);
      box-shadow: var(--shadow-lg, 0 8px 24px rgba(0,0,0,0.12));
      z-index: 9999; overflow-y: auto;
      font-family: var(--font-body, system-ui, sans-serif);
      font-size: 13px;
      color: var(--text, var(--ink, #18181b));
      transition: width 220ms cubic-bezier(0.2, 0.8, 0.2, 1);
    }
    body.tweaks-collapsed #tweaks-panel { width: 48px; }
    body.tweaks-collapsed #tweaks-panel .tweaks__body { display: none; }

    .tweaks__toggle {
      position: absolute; top: 8px; right: 8px;
      width: 32px; height: 32px;
      border: 1px solid var(--border, #e4e4e7);
      background: var(--bg, #fff);
      border-radius: 8px;
      cursor: pointer;
      color: var(--text, var(--ink, #18181b));
      font-size: 14px; font-family: inherit;
    }
    .tweaks__toggle:hover { background: var(--bg-tertiary, var(--surface-2, #f4f4f5)); }

    .tweaks__body { padding: 56px 16px 16px; }
    .tweaks__header {
      font-family: var(--font-display, inherit);
      font-size: 11px; font-weight: 600;
      text-transform: uppercase; letter-spacing: 0.1em;
      color: var(--secondary, var(--ink-2, #52525b));
      margin-bottom: 16px;
    }
    .tweaks__group { margin-bottom: 20px; }
    .tweaks__group h3 {
      font-size: 11px; font-weight: 600;
      text-transform: uppercase; letter-spacing: 0.05em;
      color: var(--secondary, var(--ink-2, #52525b));
      margin: 0 0 8px;
    }
    .tweaks__row { display: flex; gap: 4px; flex-wrap: wrap; }

    .tweaks__chip {
      flex: 1 1 auto; min-width: 60px;
      padding: 6px 10px;
      border: 1px solid var(--border, #e4e4e7);
      background: var(--bg, #fff);
      color: var(--text, var(--ink, #18181b));
      border-radius: 8px;
      cursor: pointer;
      font-size: 11px; font-family: inherit;
    }
    .tweaks__chip.is-active {
      background: var(--primary, #4a7c59);
      color: var(--primary-ink, #fff);
      border-color: var(--primary, #4a7c59);
    }
    .tweaks__chip:hover:not(.is-active) { background: var(--bg-tertiary, var(--surface-2, #f4f4f5)); }

    .tweaks__color { width: 100%; height: 32px; border: 1px solid var(--border, #e4e4e7); border-radius: 8px; cursor: pointer; }
    .tweaks__reset { margin-top: 6px; padding: 4px 8px; font-size: 11px;
      border: 1px solid var(--border, #e4e4e7); background: transparent;
      color: var(--secondary, var(--ink-2, #52525b)); border-radius: 4px; cursor: pointer; font-family: inherit; }
    .tweaks__select { width: 100%; padding: 6px 8px;
      border: 1px solid var(--border, #e4e4e7);
      background: var(--bg, #fff); color: var(--text, var(--ink, #18181b));
      border-radius: 8px; font-size: 11px; font-family: inherit; }
    .tweaks__range { width: 100%; }
    .tweaks__group code { font-family: var(--font-mono, ui-monospace, monospace); font-size: 0.8em; color: var(--primary, #4a7c59); }

    /* State-tabs styling (used by .state-tabs[role="tablist"] OR .state-tabs with .state-tab[data-state]) */
    .state-tabs {
      display: flex; gap: 4px; flex-wrap: wrap;
      padding: 12px;
      background: var(--bg-tertiary, var(--surface-2, #f4f4f5));
      border-bottom: 1px solid var(--border, #e4e4e7);
    }
    .state-tabs .state-tab {
      padding: 6px 12px;
      border: 1px solid var(--border, #e4e4e7);
      background: var(--bg, #fff);
      color: var(--text, var(--ink, #18181b));
      border-radius: 9999px; cursor: pointer;
      font-size: 11px; font-family: inherit;
    }
    .state-tabs .state-tab.is-active,
    .state-tabs .state-tab.active {
      background: var(--primary, #4a7c59);
      color: var(--primary-ink, #fff);
      border-color: var(--primary, #4a7c59);
    }
    .state-content { display: none; }
    .state-content.active { display: block; }

    /* Avoid panel covering content on desktop */
    @media (min-width: 960px) {
      body:not(.tweaks-collapsed) { padding-right: 280px; }
      body.tweaks-collapsed { padding-right: 48px; }
    }
  `;

  function injectStyles() {
    if (document.getElementById('tweaks-panel-styles')) return;
    const style = document.createElement('style');
    style.id = 'tweaks-panel-styles';
    style.textContent = PANEL_STYLES;
    document.head.appendChild(style);
  }

  function injectPanelContainer() {
    if (document.getElementById('tweaks-panel')) return;
    const div = document.createElement('div');
    div.id = 'tweaks-panel';
    document.body.appendChild(div);
  }

  /* ========== State persistence ========== */

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULTS };
      return { ...DEFAULTS, ...JSON.parse(raw) };
    } catch {
      return { ...DEFAULTS };
    }
  }

  function saveState(state) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
  }

  /* ========== Theme + font detection from loaded stylesheets ========== */

  function detectSelectorValues(attr) {
    const found = new Set(['default']);
    try {
      for (const sheet of document.styleSheets) {
        let rules;
        try { rules = sheet.cssRules; } catch { continue; /* CORS */ }
        for (const rule of rules || []) {
          if (!rule.selectorText) continue;
          const pattern = new RegExp(`\\[data-${attr}="([^"]+)"\\]`, 'g');
          let m;
          while ((m = pattern.exec(rule.selectorText)) !== null) {
            found.add(m[1]);
          }
        }
      }
    } catch {}
    return Array.from(found);
  }

  function detectThemes() { return detectSelectorValues('theme'); }
  function detectFonts()  { return detectSelectorValues('font'); }

  /* ========== Apply state to DOM ========== */

  function applyState(state) {
    const body = document.body;
    body.setAttribute('data-theme',   state.theme);
    body.setAttribute('data-mode',    state.mode);
    body.setAttribute('data-font',    state.font);
    body.setAttribute('data-density', state.density);
    body.setAttribute('data-radius',  state.radius);
    body.style.setProperty('--text-scale', String(state.textScale));
    if (state.primaryOverride) {
      body.style.setProperty('--primary', state.primaryOverride);
    } else {
      body.style.removeProperty('--primary');
    }
    body.classList.toggle('tweaks-collapsed', !!state.collapsed);
  }

  /* ========== Render panel ========== */

  function renderPanel(state) {
    const panel = document.getElementById('tweaks-panel');
    if (!panel) return;

    const themes = detectThemes();
    const fonts  = detectFonts();

    panel.innerHTML = `
      <button class="tweaks__toggle" aria-label="Toggle tweaks" data-act="collapse">
        ${state.collapsed ? '⇤' : '⇥'}
      </button>
      <div class="tweaks__body" ${state.collapsed ? 'hidden' : ''}>
        <header class="tweaks__header">Tweaks</header>

        <section class="tweaks__group">
          <h3>Theme</h3>
          <div class="tweaks__row">
            ${themes.map(t => `
              <button class="tweaks__chip ${state.theme === t ? 'is-active' : ''}"
                      data-act="theme" data-val="${t}">${t}</button>
            `).join('')}
          </div>
        </section>

        <section class="tweaks__group">
          <h3>Mode</h3>
          <div class="tweaks__row">
            <button class="tweaks__chip ${state.mode === 'light' ? 'is-active' : ''}" data-act="mode" data-val="light">light</button>
            <button class="tweaks__chip ${state.mode === 'dark' ? 'is-active' : ''}"  data-act="mode" data-val="dark">dark</button>
          </div>
        </section>

        <section class="tweaks__group">
          <h3>Primary override</h3>
          <input type="color" value="${state.primaryOverride || '#4a7c59'}" data-act="primary" class="tweaks__color">
          <button class="tweaks__reset" data-act="primary-reset">Reset primary</button>
        </section>

        <section class="tweaks__group">
          <h3>Font family</h3>
          <select data-act="font" class="tweaks__select">
            ${fonts.map(f => `<option value="${f}" ${state.font === f ? 'selected' : ''}>${f}</option>`).join('')}
          </select>
        </section>

        <section class="tweaks__group">
          <h3>Text scale — <code>${state.textScale.toFixed(2)}×</code></h3>
          <input type="range" min="0.8" max="1.3" step="0.05" value="${state.textScale}" data-act="scale" class="tweaks__range">
        </section>

        <section class="tweaks__group">
          <h3>Density</h3>
          <div class="tweaks__row">
            ${['compact','regular','comfy'].map(d => `
              <button class="tweaks__chip ${state.density === d ? 'is-active' : ''}" data-act="density" data-val="${d}">${d}</button>
            `).join('')}
          </div>
        </section>

        <section class="tweaks__group">
          <h3>Corner radius</h3>
          <div class="tweaks__row">
            ${['tight','medium','loose'].map(r => `
              <button class="tweaks__chip ${state.radius === r ? 'is-active' : ''}" data-act="radius" data-val="${r}">${r}</button>
            `).join('')}
          </div>
        </section>
      </div>
    `;

    panel.addEventListener('click', onClick);
    panel.addEventListener('input', onInput);

    function onClick(e) {
      const el = e.target.closest('[data-act]');
      if (!el) return;
      const act = el.getAttribute('data-act');
      const val = el.getAttribute('data-val');
      switch (act) {
        case 'collapse':      state.collapsed = !state.collapsed; break;
        case 'theme':         state.theme = val; break;
        case 'mode':          state.mode = val; break;
        case 'density':       state.density = val; break;
        case 'radius':        state.radius = val; break;
        case 'primary-reset': state.primaryOverride = ''; break;
      }
      apply();
    }

    function onInput(e) {
      const el = e.target.closest('[data-act]');
      if (!el) return;
      const act = el.getAttribute('data-act');
      switch (act) {
        case 'scale':   state.textScale = parseFloat(el.value); break;
        case 'primary': state.primaryOverride = el.value; break;
        case 'font':    state.font = el.value; break;
      }
      apply();
    }

    function apply() {
      applyState(state);
      saveState(state);
      renderPanel(state); // re-render updates active markers
    }
  }

  /* ========== State-tabs driver (flexible: ARIA OR legacy class/data) ========== */

  function wireStateTabs() {
    // Accept either selector; de-dup containers seen via both.
    const containers = new Set([
      ...document.querySelectorAll('[role="tablist"].state-tabs'),
      ...document.querySelectorAll('.state-tabs'),
    ]);

    containers.forEach((list) => {
      if (list.__tweaksWired) return;
      list.__tweaksWired = true;

      // Tab items: ARIA role OR legacy class-with-data-state OR legacy .state-tab
      let tabs = Array.from(list.querySelectorAll('[role="tab"]'));
      if (tabs.length === 0) {
        tabs = Array.from(list.querySelectorAll('.state-tab[data-state], .state-tab'));
      }
      if (tabs.length === 0) return;

      // Panel lookup: tablist's next sibling (convention from canonical reference),
      // OR explicit aria-controls on tabs pointing to a common panel.
      const panel = list.nextElementSibling;

      tabs.forEach((tab, i) => {
        tab.addEventListener('click', () => activate(i));
        tab.addEventListener('keydown', (e) => {
          const key = e.key;
          if (key === 'ArrowRight' || key === 'j') { e.preventDefault(); activate((i + 1) % tabs.length); }
          else if (key === 'ArrowLeft'  || key === 'k') { e.preventDefault(); activate((i - 1 + tabs.length) % tabs.length); }
          else if (key === 'Home') { e.preventDefault(); activate(0); }
          else if (key === 'End')  { e.preventDefault(); activate(tabs.length - 1); }
        });
      });

      function activate(idx) {
        tabs.forEach((t, j) => {
          const active = j === idx;
          t.classList.toggle('is-active', active);
          t.classList.toggle('active', active); // legacy class kept for back-compat
          t.setAttribute('aria-selected', active ? 'true' : 'false');
          t.setAttribute('tabindex', active ? '0' : '-1');
        });
        if (panel) {
          panel.querySelectorAll('.state-content').forEach((c, j) => {
            c.classList.toggle('active', j === idx);
          });
        }
        tabs[idx].focus();
      }

      // Preserve initial active tab if author marked one; else default to first.
      const initial = tabs.findIndex(
        (t) => t.classList.contains('is-active') || t.classList.contains('active') || t.getAttribute('aria-selected') === 'true'
      );
      activate(initial >= 0 ? initial : 0);
    });
  }

  /* ========== Boot ========== */

  function boot() {
    injectStyles();
    injectPanelContainer();
    const state = loadState();
    applyState(state);
    renderPanel(state);
    wireStateTabs();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
