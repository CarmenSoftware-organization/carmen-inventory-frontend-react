import { Lock, ShieldCheck } from "lucide-react";
import { useLocale, useTranslations } from "use-intl";
import {
  formatAppStatusTime,
  type AppStatusSnapshot,
} from "@/lib/app-status-store";

/**
 * แถบสถานะแอปใต้ navbar — mount ครั้งเดียวใน root-layout เหมือน `LicenseExpiredBanner`
 *
 * - **read_only (ผู้ใช้ทั่วไป)** — บอกก่อนผู้ใช้กรอกฟอร์ม ปุ่มบันทึกยังกดได้ (ปิดทุกปุ่มต้องแตะ
 *   หลายร้อยหน้า) ถ้ากดแล้วโดน 503 จะได้ toast ที่แปลแล้วจาก `errors.byCode.APP_READ_ONLY`
 * - **ผู้ได้รับยกเว้น (maintenance/read_only)** — กันคนที่ทดสอบลืมว่าคนอื่นใช้งานไม่ได้
 *
 * maintenance ของผู้ใช้ทั่วไปกับ disabled ไม่มาถึงตรงนี้ — root-layout แทนทั้งแอปด้วย
 * `AppStatusScreen` ไปแล้ว · สีอยู่ที่ไอคอนจุดเดียว พื้น neutral
 */
export function AppStatusBanner({
  snapshot,
}: {
  readonly snapshot: AppStatusSnapshot;
}) {
  const t = useTranslations("appStatus");
  const locale = useLocale();

  if (snapshot.status === "running" || snapshot.status === "disabled") {
    return null;
  }

  if (snapshot.bypass) {
    return (
      <div
        role="status"
        className="bg-muted flex items-center justify-center gap-2 border-b px-4 py-2 text-xs"
      >
        <ShieldCheck className="text-warning-ink size-4 shrink-0" aria-hidden />
        <span className="text-muted-foreground">
          {t(
            snapshot.status === "maintenance"
              ? "bypassMaintenanceBanner"
              : "bypassReadOnlyBanner",
          )}
        </span>
      </div>
    );
  }

  if (snapshot.status !== "read_only") return null;

  return (
    <div
      role="status"
      className="bg-muted flex items-center justify-center gap-2 border-b px-4 py-2 text-xs"
    >
      <Lock className="text-warning-ink size-4 shrink-0" aria-hidden />
      <span className="text-muted-foreground">
        {snapshot.until
          ? t("readOnlyBannerUntil", {
              time: formatAppStatusTime(snapshot.until, locale),
            })
          : t("readOnlyBanner")}
        {snapshot.message && <> — {snapshot.message}</>}
      </span>
    </div>
  );
}
