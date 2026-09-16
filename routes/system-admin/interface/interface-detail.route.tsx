import { Suspense } from "react";
import { useParams } from "react-router";
import { useTranslations } from "use-intl";
import { CalendarX } from "lucide-react";
import { ErrorState } from "@/components/ui/error-state";
import { SettingSectionSkeleton } from "@/components/ui/setting-section";
import { useInterfaceEntitlement } from "@/hooks/use-interface-entitlement";
import { findCategory, findBrand } from "./interface-registry";

/**
 * หน้า config ของ interface brand เดียว — resolve `:category/:brand` จาก registry แล้ว render form
 *
 * category/brand ที่ไม่รู้จัก หรือ brand ที่ platform ไม่ได้ให้สิทธิ์ (license) ถือเป็น "ไม่พบ"
 * — ใช้ ErrorState แบบ inline ไม่ใช่ NotFoundComponent เพราะหน้านี้ mount อยู่ใน RootLayout
 * (มี sidebar+navbar อยู่แล้ว) ส่วน NotFoundComponent เป็น full-page ไว้ใช้กับ top-level catch-all
 * เท่านั้น — เอามาซ้อนในนี้จะได้ chrome ซ้อน chrome (ตาม department/role edit)
 *
 * form อ่าน brand จาก `useParams` เอง — หน้านี้แค่ตรวจ resolve/entitlement ก่อน mount
 *
 * @returns React element ของหน้า interface detail
 */
export function Component() {
  const t = useTranslations("systemAdmin.interface");
  const { category, brand } = useParams<{ category: string; brand: string }>();
  const { entitlementOf } = useInterfaceEntitlement();

  const categoryDef = findCategory(category);
  const brandDef = findBrand(category, brand);
  const entitlement =
    categoryDef && brandDef
      ? entitlementOf(categoryDef.key, brandDef.key)
      : "none";

  if (!categoryDef || !brandDef || entitlement === "none") {
    return (
      <ErrorState message={t("notFound")} backTo="/system-admin/interface" />
    );
  }

  const Form = brandDef.form ?? categoryDef.form;
  return (
    <>
      {entitlement === "expired" && (
        // จงใจไม่ใช้ `LicenseExpiredBanner` ตรง ๆ — ตัวนั้น `return null` เมื่อสวิตช์
        // `LICENSE_ENFORCEMENT` ปิด แต่การล็อก interface ไม่ขึ้นกับสวิตช์นั้น
        // คำอธิบายต้องมองเห็นได้ทุกที่ที่การล็อกมองเห็นได้
        <div
          role="alert"
          className="bg-muted flex items-center justify-center gap-2 border-b px-4 py-2 text-xs"
        >
          <CalendarX className="text-destructive size-4 shrink-0" aria-hidden />
          <span className="text-muted-foreground">{t("expiredNotice")}</span>
        </div>
      )}
      <Suspense
        fallback={
          <div className="mx-auto w-full max-w-4xl p-[max(1rem,env(safe-area-inset-bottom))]">
            <SettingSectionSkeleton
              first
              fields={["half", "half", "half", "half"]}
            />
          </div>
        }
      >
        <Form />
      </Suspense>
    </>
  );
}
