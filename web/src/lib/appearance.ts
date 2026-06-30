/**
 * Appearance preferences (Settings → Preferencias → Apariencia): font family and
 * font size. Both are real, persisted, app-wide preferences applied by reflecting
 * them onto <html> as data-attributes that global.css keys its overrides off.
 *
 * Font family overrides the root --font-family/--font-display vars (the gt font
 * utilities reference them, so the whole app re-fonts). Font size can't ride a
 * var — Tailwind's `@theme inline` bakes literal px into the text-gt-* utilities,
 * so global.css overrides those utilities under [data-fontsize="small"] instead.
 *
 * Defaults (outfit / normal) clear the attribute so the base tokens apply.
 */
export type FontFamilyPref = "outfit" | "space";
export type FontSizePref = "small" | "normal" | "large";

const KEY_FONT = "gastify:fontFamily";
const KEY_SIZE = "gastify:fontSize";

export function getStoredFontFamily(): FontFamilyPref {
  try {
    return localStorage.getItem(KEY_FONT) === "space" ? "space" : "outfit";
  } catch {
    return "outfit";
  }
}

export function getStoredFontSize(): FontSizePref {
  try {
    const value = localStorage.getItem(KEY_SIZE);
    return value === "small" || value === "large" ? value : "normal";
  } catch {
    return "normal";
  }
}

export function setStoredFontFamily(value: FontFamilyPref): void {
  try {
    if (value === "outfit") localStorage.removeItem(KEY_FONT);
    else localStorage.setItem(KEY_FONT, value);
  } catch {
    // ignore: storage unavailable (private mode); the live set() still applies
  }
}

export function setStoredFontSize(value: FontSizePref): void {
  try {
    if (value === "normal") localStorage.removeItem(KEY_SIZE);
    else localStorage.setItem(KEY_SIZE, value);
  } catch {
    // ignore: storage unavailable (private mode); the live set() still applies
  }
}

/** Reflect the prefs onto <html> as data-attributes; global.css does the rest. */
export function applyAppearanceToDom(fontFamily: FontFamilyPref, fontSize: FontSizePref): void {
  if (typeof document === "undefined") return;
  const el = document.documentElement;
  if (fontFamily === "space") el.dataset.font = "space";
  else delete el.dataset.font;
  if (fontSize === "normal") delete el.dataset.fontsize;
  else el.dataset.fontsize = fontSize; // "small" | "large"
}

/** Apply the persisted appearance immediately — called from main before render
 * so the chosen font/size is in place on first paint (no flash). */
export function initAppearance(): void {
  applyAppearanceToDom(getStoredFontFamily(), getStoredFontSize());
}
