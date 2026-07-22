import { Suspense } from "react";
import { useParams } from "react-router";
import { useTranslations } from "use-intl";
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
  const { isEntitled } = useInterfaceEntitlement();

  const categoryDef = findCategory(category);
  const brandDef = findBrand(category, brand);

  if (!categoryDef || !brandDef || !isEntitled(categoryDef.key, brandDef.key)) {
    return <ErrorState message={t("notFound")} />;
  }

  const Form = brandDef.form ?? categoryDef.form;
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-4xl p-[max(1rem,env(safe-area-inset-bottom))]">
          <SettingSectionSkeleton first fields={["half", "half", "half", "half"]} />
        </div>
      }
    >
      <Form />
    </Suspense>
  );
}
