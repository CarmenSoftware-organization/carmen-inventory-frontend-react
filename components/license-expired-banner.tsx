import { useTranslations } from "use-intl";
import { CalendarX } from "lucide-react";
import { useLicense } from "@/hooks/use-license";

/**
 * แถบเตือนทั่วแอปเมื่อสัญญาของ BU ปัจจุบันหมดอายุหรือถูกระงับ
 *
 * mount ครั้งเดียวใน root-layout เหมือน `ActivitySheetHost` — อย่า render เองในหน้าใหม่
 *
 * เขียนเป็น **allowlist** ไม่ใช่ blocklist — ขึ้นเฉพาะ `state === "expired"` กับ
 * `"inactive"` เท่านั้น (ต่างจากร่างเดิมที่เช็ค `state !== "active" && state !== "none"`
 * ซึ่งตกกรณี `"unresolved"` — backend อ่าน DB ไม่สำเร็จชั่วคราว ไม่ใช่สัญญาที่ถูกระงับจริง
 * การขึ้น banner ตอนนั้นจะหลอกผู้ใช้ทุกคนว่าสัญญามีปัญหาทั้งที่ backend เองก็ปล่อยผ่านอยู่)
 * ไม่แสดงเมื่อ state เป็น "none" เพราะกรณีนั้นทุกโมดูลถูกล็อกอยู่แล้วที่ sidebar/module
 * landing/RouteGuard — การขึ้น banner ซ้ำอีกชั้นเป็นการบอกเรื่องเดิมสองครั้ง
 *
 * **ต้องเช็ค `enforced` ก่อนเสมอ** — สวิตช์ `LICENSE_ENFORCEMENT` (shadow mode ของ FE)
 * ปิดอยู่โดย default ระหว่าง rollout ถ้าไม่เช็ค ลูกค้าทุกคนจะเห็น "สัญญาหมดอายุ"
 * ตั้งแต่วันแรกที่ deploy ทั้งที่ backend ยังไม่บังคับอะไรจริง (ดู hooks/use-license.ts)
 */
export function LicenseExpiredBanner() {
  const { enforced, state, endDate } = useLicense();
  const t = useTranslations("license");

  if (!enforced) return null;
  if (state !== "expired" && state !== "inactive") return null;

  const formatted = endDate
    ? new Date(endDate).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "";

  return (
    <div
      role="alert"
      className="bg-muted flex items-center justify-center gap-2 border-b px-4 py-2 text-xs"
    >
      {/* สีแดงอยู่ที่ไอคอนจุดเดียว พื้นเป็น neutral ตาม docs/DESIGN.md */}
      <CalendarX className="text-destructive size-4 shrink-0" aria-hidden />
      <span className="text-muted-foreground">
        {state === "expired"
          ? t("expiredBanner", { date: formatted })
          : t("inactiveBanner")}
      </span>
    </div>
  );
}
