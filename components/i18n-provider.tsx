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
    const fallback = messageLoaders[`../messages/${DEFAULT_LOCALE}.json`];
    void load()
      .catch(() => {
        // chunk โหลดไม่ได้ (stale chunk หลัง redeploy บน CDN / network ล้ม) — ถ้า
        // ไม่ fallback messages จะค้าง null แล้ว provider คืน null = หน้าจอว่าง
        // ถาวร ลองโหลด default locale chunk แทน
        if (load === fallback) throw new Error("default locale chunk failed");
        return fallback();
      })
      .then((mod) => {
        if (!cancelled) setMessages(mod.default);
      })
      .catch(() => {
        // แม้ default ก็โหลดไม่ได้ — ปล่อยให้ messages ค้าง null (โอกาสเกิดน้อยมาก
        // เพราะ default chunk มักถูก cache ไว้แล้ว) ดีกว่า render ด้วย key ดิบ
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
