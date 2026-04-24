/*
 * tweaks.js — runtime theme/mode/font/density/radius switcher panel
 *
 * Mirrors the Claude.ai Artifacts Tweaks widget. Mounted on every mockup
 * via <div id="tweaks-panel"></div> + <script src="<path>/tweaks.js" defer>.
 *
 * Reads CSS vars from tokens.css to enumerate options. Writes data-* attrs
 * on <body>. Persists selections to localStorage. Also drives state-tabs
 * (role="tablist") keyboard navigation (← → j/k).
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
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }

  function detectThemes() {
    // Walk stylesheets, collect [data-theme="X"] selectors.
    const found = new Set(['default']);
    try {
      for (const sheet of document.styleSheets) {
        let rules;
        try { rules = sheet.cssRules; } catch { continue; }
        for (const rule of rules || []) {
          if (!rule.selectorText) continue;
          const m = rule.selectorText.match(/\[data-theme="([^"]+)"\]/g) || [];
          m.forEach((s) => {
            const name = s.match(/"([^"]+)"/)[1];
            found.add(name);
          });
        }
      }
    } catch {}
    return Array.from(found);
  }

  function detectFonts() {
    const found = new Set(['default']);
    try {
      for (const sheet of document.styleSheets) {
        let rules;
        try { rules = sheet.cssRules; } catch { continue; }
        for (const rule of rules || []) {
          if (!rule.selectorText) continue;
          const m = rule.selectorText.match(/\[data-font="([^"]+)"\]/g) || [];
          m.forEach((s) => {
            const name = s.match(/"([^"]+)"/)[1];
            found.add(name);
          });
        }
      }
    } catch {}
    return Array.from(found);
  }

  function applyState(state) {
    const body = document.body;
    body.setAttribute('data-theme', state.theme);
    body.setAttribute('data-mode', state.mode);
    body.setAttribute('data-font', state.font);
    body.setAttribute('data-density', state.density);
    body.setAttribute('data-radius', state.radius);
    body.style.setProperty('--text-scale', String(state.textScale));
    if (state.primaryOverride) {
      body.style.setProperty('--primary', state.primaryOverride);
    } else {
      body.style.removeProperty('--primary');
    }
    body.classList.toggle('tweaks-collapsed', !!state.collapsed);
  }

  function renderPanel(state) {
    const panel = document.getElementById('tweaks-panel');
    if (!panel) return;

    const themes = detectThemes();
    const fonts = detectFonts();

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
            <button class="tweaks__chip ${state.mode === 'dark' ? 'is-active' : ''}" data-act="mode" data-val="dark">dark</button>
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

    panel.addEventListener('click', (e) => {
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
    });

    panel.addEventListener('input', (e) => {
      const el = e.target.closest('[data-act]');
      if (!el) return;
      const act = el.getAttribute('data-act');
      switch (act) {
        case 'scale':   state.textScale = parseFloat(el.value); break;
        case 'primary': state.primaryOverride = el.value; break;
        case 'font':    state.font = el.value; break;
      }
      apply();
    });

    function apply() {
      applyState(state);
      saveState(state);
      renderPanel(state); // re-render to update active states
    }
  }

  /* ===== State-tabs driver (multi-state screens) ===== */

  function wireStateTabs() {
    document.querySelectorAll('[role="tablist"].state-tabs').forEach((list) => {
      const tabs = Array.from(list.querySelectorAll('[role="tab"]'));
      const panel = list.nextElementSibling; // convention: panel follows tablist

      tabs.forEach((tab, i) => {
        tab.addEventListener('click', () => activate(i));
        tab.addEventListener('keydown', (e) => {
          const key = e.key;
          if (key === 'ArrowRight' || key === 'j') { e.preventDefault(); activate((i + 1) % tabs.length); }
          else if (key === 'ArrowLeft' || key === 'k') { e.preventDefault(); activate((i - 1 + tabs.length) % tabs.length); }
          else if (key === 'Home') { e.preventDefault(); activate(0); }
          else if (key === 'End') { e.preventDefault(); activate(tabs.length - 1); }
        });
      });

      function activate(idx) {
        tabs.forEach((t, j) => {
          const active = j === idx;
          t.classList.toggle('is-active', active);
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

      const initial = tabs.findIndex((t) => t.classList.contains('is-active'));
      activate(initial >= 0 ? initial : 0);
    });
  }

  /* ===== Boot ===== */

  function boot() {
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
