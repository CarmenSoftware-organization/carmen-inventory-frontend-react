import { Link } from "react-router";
import { TriangleAlert } from "lucide-react";
import { useTranslations } from "use-intl";
import { PERMISSIONS } from "@/constant/permissions";
import { useCan } from "@/hooks/use-can";
import { useProfile } from "@/hooks/use-profile";
import { resolveBuCurrencyStatus } from "@/lib/bu-currency-status";

/**
 * แถบเตือนทั่วแอปเมื่อ BU ปัจจุบันไม่มี default currency ที่ใช้ได้ — ตอนนั้น `useProfile`
 * fallback เป็น THB / ทศนิยม 2 เงียบ ๆ ผู้ใช้ทุกคนจึงเห็นยอดเงินผิดสกุล แถบนี้จึงขึ้นให้
 * **ทุกคน** แต่ลิงก์ไปแก้ขึ้นเฉพาะคนที่แก้ Company Profile ได้
 *
 * mount ครั้งเดียวใน root-layout เหมือน `LicenseExpiredBanner` — อย่า render เองในหน้าใหม่
 */
export function BuCurrencyBanner() {
  const { defaultBu, isSuccess } = useProfile();
  const { can } = useCan();
  const t = useTranslations("buCurrency");

  if (!isSuccess || !defaultBu) return null;

  const status = resolveBuCurrencyStatus(defaultBu.config);
  if (status !== "missing" && status !== "invalid") return null;

  return (
    <div
      role="alert"
      className="bg-muted flex items-center justify-center gap-2 border-b px-4 py-2 text-xs"
    >
      {/* สีเหลืองอยู่ที่ไอคอนจุดเดียว พื้นเป็น neutral ตาม docs/DESIGN.md */}
      <TriangleAlert className="text-warning-ink size-4 shrink-0" aria-hidden />
      <span className="text-muted-foreground">
        {status === "missing"
          ? t("missing", { bu: defaultBu.code })
          : t("invalid", { bu: defaultBu.code })}{" "}
        {can(PERMISSIONS.system_admin.business_unit.update) ? (
          <Link
            to="/system-admin/company-profile"
            className="text-foreground font-medium underline underline-offset-2"
          >
            {t("goToSettings")}
          </Link>
        ) : (
          t("contactAdmin")
        )}
      </span>
    </div>
  );
}
