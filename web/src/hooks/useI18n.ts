import { useCallback } from "react";
import { translate, type MessageKey } from "@/lib/i18n";
import { useUiStore } from "@/stores/uiStore";
import type { SupportedLocale } from "@/lib/i18n";

export function useI18n() {
  const locale = useUiStore((s) => s.locale);
  const setLocale = useUiStore((s) => s.setLocale);

  const t = useCallback((key: MessageKey) => translate(key, locale), [locale]);

  return { locale, setLocale, t };
}

export type { SupportedLocale };
