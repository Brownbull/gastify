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
    "nav.insights": "Analisis",
    "nav.settings": "Ajustes",
    "auth.signOut": "Cerrar sesion",
    "auth.signInGoogle": "Entrar con Google",
    "auth.tagline": "Control inteligente de gastos",
    "auth.sessionExpired": "La sesion expiro",
    "dashboard.title": "Inicio",
    "dashboard.welcome": "Escanea un recibo o revisa tus movimientos.",
    "locale.label": "Idioma",
    "settings.title": "Ajustes",
    "settings.profile": "Perfil",
    "settings.appearance": "Apariencia",
    "settings.account": "Cuenta",
    "settings.email": "Correo electronico",
    "settings.displayName": "Nombre",
    "settings.colorTheme": "Tema de color",
    "settings.themeMode": "Modo",
    "settings.theme.normal": "Normal",
    "settings.theme.professional": "Profesional",
    "settings.theme.mono": "Monocromo",
    "settings.mode.light": "Claro",
    "settings.mode.dark": "Oscuro",
    "settings.exportData": "Exportar datos",
    "settings.exportDataDesc": "Descarga tus datos en formato JSON",
    "settings.dangerZone": "Zona de peligro",
    "settings.deleteAccount": "Eliminar cuenta",
    "settings.deleteAccountDesc": "Borra permanentemente todos tus datos",
    "settings.deleteConfirm": "Escribe ELIMINAR para confirmar",
    "settings.saved": "Guardado",
  },
  en: {
    "app.name": "Gastify",
    "nav.dashboard": "Dashboard",
    "nav.scan": "Scan",
    "nav.statements": "Statements",
    "nav.transactions": "Transactions",
    "nav.insights": "Insights",
    "nav.settings": "Settings",
    "auth.signOut": "Sign out",
    "auth.signInGoogle": "Sign in with Google",
    "auth.tagline": "Smart expense tracking",
    "auth.sessionExpired": "Session expired",
    "dashboard.title": "Dashboard",
    "dashboard.welcome": "Scan a receipt or view your transactions.",
    "locale.label": "Language",
    "settings.title": "Settings",
    "settings.profile": "Profile",
    "settings.appearance": "Appearance",
    "settings.account": "Account",
    "settings.email": "Email",
    "settings.displayName": "Display name",
    "settings.colorTheme": "Color theme",
    "settings.themeMode": "Mode",
    "settings.theme.normal": "Normal",
    "settings.theme.professional": "Professional",
    "settings.theme.mono": "Monochrome",
    "settings.mode.light": "Light",
    "settings.mode.dark": "Dark",
    "settings.exportData": "Export data",
    "settings.exportDataDesc": "Download your data as JSON",
    "settings.dangerZone": "Danger zone",
    "settings.deleteAccount": "Delete account",
    "settings.deleteAccountDesc": "Permanently delete all your data",
    "settings.deleteConfirm": "Type DELETE to confirm",
    "settings.saved": "Saved",
  },
  pt: {
    "app.name": "Gastify",
    "nav.dashboard": "Inicio",
    "nav.scan": "Escanear",
    "nav.statements": "Faturas",
    "nav.transactions": "Transacoes",
    "nav.insights": "Analises",
    "nav.settings": "Ajustes",
    "auth.signOut": "Sair",
    "auth.signInGoogle": "Entrar com Google",
    "auth.tagline": "Controle inteligente de gastos",
    "auth.sessionExpired": "Sessao expirada",
    "dashboard.title": "Inicio",
    "dashboard.welcome": "Escaneie um recibo ou veja suas transacoes.",
    "locale.label": "Idioma",
    "settings.title": "Ajustes",
    "settings.profile": "Perfil",
    "settings.appearance": "Aparencia",
    "settings.account": "Conta",
    "settings.email": "Email",
    "settings.displayName": "Nome de exibicao",
    "settings.colorTheme": "Tema de cor",
    "settings.themeMode": "Modo",
    "settings.theme.normal": "Normal",
    "settings.theme.professional": "Profissional",
    "settings.theme.mono": "Monocromo",
    "settings.mode.light": "Claro",
    "settings.mode.dark": "Escuro",
    "settings.exportData": "Exportar dados",
    "settings.exportDataDesc": "Baixe seus dados em formato JSON",
    "settings.dangerZone": "Zona de perigo",
    "settings.deleteAccount": "Excluir conta",
    "settings.deleteAccountDesc": "Exclua permanentemente todos os seus dados",
    "settings.deleteConfirm": "Digite EXCLUIR para confirmar",
    "settings.saved": "Salvo",
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
