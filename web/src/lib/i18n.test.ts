import { beforeEach, describe, expect, it } from "vitest";
import {
  LOCALE_STORAGE_KEY,
  getPreferredLocale,
  messages,
  negotiateLocale,
  setPreferredLocale,
  translate,
} from "./i18n";

describe("i18n", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("negotiates supported browser locales by language", () => {
    expect(negotiateLocale(["pt-BR", "en-US"])).toBe("pt");
    expect(negotiateLocale(["fr-FR", "es-CL"])).toBe("es");
  });

  it("falls back to Spanish when no requested language is supported", () => {
    expect(negotiateLocale(["fr-FR", "de-DE"])).toBe("es");
  });

  it("uses a stored user locale preference", () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, "en");

    expect(getPreferredLocale()).toBe("en");
    expect(translate("auth.signOut", getPreferredLocale())).toBe("Sign out");
  });

  it("stores only supported locale preferences", () => {
    setPreferredLocale("pt");

    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("pt");
  });

  it("every locale defines the same key set (no missing translation falls back to the raw key)", () => {
    const enKeys = Object.keys(messages.en).sort();
    for (const locale of ["es", "pt"] as const) {
      expect(Object.keys(messages[locale]).sort()).toEqual(enKeys);
    }
  });
});
