export const SUPPORTED_LOCALES = ["es", "en", "pt"] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const LOCALE_STORAGE_KEY = "gastify:locale";

const DEFAULT_LOCALE: SupportedLocale = "es";

export const messages = {
  es: {
    "app.name": "Gastify",
    "nav.dashboard": "Inicio",
    "nav.scan": "Escanear",
    "nav.statements": "Estados",
    "nav.transactions": "Movimientos",
    "auth.signOut": "Cerrar sesion",
    "auth.signInGoogle": "Entrar con Google",
    "auth.tagline": "Control inteligente de gastos",
    "auth.sessionExpired": "La sesion expiro",
    "dashboard.title": "Inicio",
    "dashboard.welcome": "Escanea un recibo o revisa tus movimientos.",
    "locale.label": "Idioma",
  },
  en: {
    "app.name": "Gastify",
    "nav.dashboard": "Dashboard",
    "nav.scan": "Scan",
    "nav.statements": "Statements",
    "nav.transactions": "Transactions",
    "auth.signOut": "Sign out",
    "auth.signInGoogle": "Sign in with Google",
    "auth.tagline": "Smart expense tracking",
    "auth.sessionExpired": "Session expired",
    "dashboard.title": "Dashboard",
    "dashboard.welcome": "Scan a receipt or view your transactions.",
    "locale.label": "Language",
  },
  pt: {
    "app.name": "Gastify",
    "nav.dashboard": "Inicio",
    "nav.scan": "Escanear",
    "nav.statements": "Faturas",
    "nav.transactions": "Transacoes",
    "auth.signOut": "Sair",
    "auth.signInGoogle": "Entrar com Google",
    "auth.tagline": "Controle inteligente de gastos",
    "auth.sessionExpired": "Sessao expirada",
    "dashboard.title": "Inicio",
    "dashboard.welcome": "Escaneie um recibo ou veja suas transacoes.",
    "locale.label": "Idioma",
  },
} satisfies Record<SupportedLocale, Record<string, string>>;

export type MessageKey = keyof (typeof messages)["en"];

export function isSupportedLocale(value: string): value is SupportedLocale {
  return SUPPORTED_LOCALES.includes(value as SupportedLocale);
}

export function negotiateLocale(languages: readonly string[]): SupportedLocale {
  for (const language of languages) {
    const locale = language.toLowerCase().split("-")[0];
    if (isSupportedLocale(locale)) return locale;
  }

  return DEFAULT_LOCALE;
}

export function getPreferredLocale(): SupportedLocale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;

  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored && isSupportedLocale(stored)) return stored;
  } catch {
    return DEFAULT_LOCALE;
  }

  return negotiateLocale(
    window.navigator.languages ?? [window.navigator.language],
  );
}

export function setPreferredLocale(locale: SupportedLocale) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // localStorage unavailable
  }
}

export function translate(key: MessageKey, locale = getPreferredLocale()) {
  return messages[locale][key] ?? messages.en[key] ?? key;
}
