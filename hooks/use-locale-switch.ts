import { useSwitchLocale } from "@/components/locale-switch-context";
import type { SupportedLocale } from "@/i18n/config";

/**
 * สลับภาษาของแอป — แทนเวอร์ชัน Next เดิมที่เซ็ต NEXT_LOCALE cookie + router.refresh()
 * คง return shape เดิม ({ switchLocale, isPending }) ให้ navbar ใช้ต่อได้ทันที
 */
export function useLocaleSwitch() {
  const switchLocale = useSwitchLocale();
  return {
    switchLocale: (locale: SupportedLocale) => switchLocale(locale),
    isPending: false,
  };
}
