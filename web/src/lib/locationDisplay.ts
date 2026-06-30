/**
 * Foreign-location display (Settings → Escaneo → Indicador de país extranjero).
 * A FOREIGN purchase — its country differs from the user's home `default_country` —
 * shows its country as a flag emoji or the ISO code, per the user's pref. A home
 * (or uncompared) purchase shows the plain ISO code.
 */
export type ForeignLocationFormat = "code" | "flag";

const KEY_FOREIGN = "gastify:foreignLocationFormat";

/** Persisted code/flag pref (default "code", which clears the key). */
export function getStoredForeignFormat(): ForeignLocationFormat {
  try {
    return localStorage.getItem(KEY_FOREIGN) === "flag" ? "flag" : "code";
  } catch {
    return "code";
  }
}

export function setStoredForeignFormat(value: ForeignLocationFormat): void {
  try {
    if (value === "code") localStorage.removeItem(KEY_FOREIGN);
    else localStorage.setItem(KEY_FOREIGN, value);
  } catch {
    // storage unavailable (private mode); the live store value still applies
  }
}

/** Flag emoji from a 2-letter ISO 3166-1 alpha-2 code (Unicode regional indicators). */
export function countryToFlag(code: string): string {
  const cc = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return cc;
  return String.fromCodePoint(...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

/**
 * The location label for a transaction (e.g. "Orlando 🇺🇸" or "Orlando, US"). Returns
 * null when there's no country. Foreign + "flag" → "City 🇺🇸"; otherwise "City, CODE".
 */
export function transactionLocationLabel(
  country: string | null | undefined,
  city: string | null | undefined,
  homeCountry: string | null | undefined,
  format: ForeignLocationFormat,
): string | null {
  if (!country) return null;
  const code = country.trim().toUpperCase();
  const foreign = !!homeCountry && code !== homeCountry.trim().toUpperCase();
  const indicator = foreign && format === "flag" ? countryToFlag(code) : code;
  if (!city) return indicator;
  return foreign && format === "flag" ? `${city} ${indicator}` : `${city}, ${indicator}`;
}
