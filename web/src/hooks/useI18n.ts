import { useCallback, useState } from "react";
import {
  getPreferredLocale,
  setPreferredLocale,
  translate,
  type MessageKey,
  type SupportedLocale,
} from "@/lib/i18n";

export function useI18n() {
  const [locale, setLocaleState] = useState(getPreferredLocale);

  const setLocale = useCallback((nextLocale: SupportedLocale) => {
    setPreferredLocale(nextLocale);
    setLocaleState(nextLocale);
  }, []);

  const t = useCallback((key: MessageKey) => translate(key, locale), [locale]);

  return { locale, setLocale, t };
}
