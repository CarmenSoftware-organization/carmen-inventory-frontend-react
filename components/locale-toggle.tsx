import { useLocale } from "use-intl";
import { useLocaleSwitch } from "@/hooks/use-locale-switch";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@/i18n/config";
import { cn } from "@/lib/utils";

// ชื่อภาษาเขียนด้วยอักษรของภาษานั้นเอง — คนที่อ่านภาษาปัจจุบันไม่ออกต้องหาทางกลับเจอ
const LOCALE_LABELS: Record<SupportedLocale, string> = {
  en: "EN",
  th: "ไทย",
};

/**
 * ปุ่มสลับภาษาแบบ segmented สำหรับหน้าที่อยู่นอก app shell (auth, เอกสารกฎหมาย)
 * ซึ่งไม่มีเมนู navbar ให้เปลี่ยนภาษา — ในแอปใช้ `LangSwitch` ในเมนูผู้ใช้แทน
 */
export function LocaleToggle({ className }: { readonly className?: string }) {
  const locale = useLocale() as SupportedLocale;
  const { switchLocale, isPending } = useLocaleSwitch();

  return (
    <div
      role="group"
      aria-label="Language / ภาษา"
      className={cn(
        "bg-muted/60 flex items-center gap-0.5 rounded-md p-0.5",
        className,
      )}
    >
      {SUPPORTED_LOCALES.map((loc) => (
        <button
          key={loc}
          type="button"
          lang={loc}
          disabled={isPending}
          onClick={() => switchLocale(loc)}
          aria-pressed={locale === loc}
          className={cn(
            "text-micro rounded-sm px-2 py-1 font-semibold transition-colors",
            locale === loc
              ? "bg-card text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {LOCALE_LABELS[loc]}
        </button>
      ))}
    </div>
  );
}
