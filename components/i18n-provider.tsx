import { useCallback, useEffect, useState } from "react";
import { IntlProvider } from "use-intl";
import type { Messages } from "use-intl";
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from "@/i18n/config";
import { LocaleSwitchContext } from "@/components/locale-switch-context";

/**
 * แทน NextIntlClientProvider — locale เก็บใน localStorage (เดิมคือ NEXT_LOCALE cookie)
 * messages โหลดเป็น chunk แยกต่อภาษา ผ่าน import.meta.glob
 */

const LOCALE_STORAGE_KEY = "carmen.locale";

const messageLoaders = import.meta.glob<{ default: Messages }>(
  "../messages/*.json",
);

const readStoredLocale = (): SupportedLocale => {
  try {
    const raw = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (SUPPORTED_LOCALES.includes(raw as SupportedLocale)) {
      return raw as SupportedLocale;
    }
  } catch {
    // storage unavailable
  }
  return DEFAULT_LOCALE;
};

export function I18nProvider({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  const [locale, setLocale] = useState<SupportedLocale>(readStoredLocale);
  const [messages, setMessages] = useState<Messages | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = messageLoaders[`../messages/${locale}.json`];
    void load().then((mod) => {
      if (!cancelled) setMessages(mod.default);
    });
    document.documentElement.lang = locale;
    return () => {
      cancelled = true;
    };
  }, [locale]);

  const switchLocale = useCallback((next: SupportedLocale) => {
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      // storage unavailable — สลับเฉพาะ session นี้
    }
    setLocale(next);
  }, []);

  // กัน flash ของ untranslated keys — chunk ภาษาโหลดเร็ว (local asset)
  if (!messages) return null;

  return (
    <LocaleSwitchContext.Provider value={switchLocale}>
      <IntlProvider locale={locale} messages={messages} timeZone="Asia/Bangkok">
        {children}
      </IntlProvider>
    </LocaleSwitchContext.Provider>
  );
}
