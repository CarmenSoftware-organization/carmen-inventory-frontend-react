import { Suspense } from "react";
import { useParams } from "react-router";
import { useTranslations } from "use-intl";
import { ErrorState } from "@/components/ui/error-state";
import { SettingSectionSkeleton } from "@/components/ui/setting-section";
import { findInterface } from "./interface-registry";

/**
 * หน้า config ของ interface ตัวเดียว — resolve `:key` จาก registry แล้ว render form
 *
 * key ที่ไม่รู้จักถือเป็น "ไม่พบ" (URL พิมพ์มั่ว/bookmark เก่า) — ใช้ ErrorState แบบ inline
 * ไม่ใช่ NotFoundComponent เพราะหน้านี้ mount อยู่ใน RootLayout (มี sidebar+navbar อยู่แล้ว)
 * ส่วน NotFoundComponent เป็น full-page (min-h-screen + header/logo/footer ของตัวเอง) ไว้ใช้กับ
 * top-level catch-all เท่านั้น — เอามาซ้อนในนี้จะได้ chrome ซ้อน chrome (ตาม department/role
 * edit ที่ใช้ ErrorState inline เมื่อของหายระหว่างอยู่ใน shell)
 *
 * @returns React element ของหน้า interface detail
 */
export function Component() {
  const t = useTranslations("systemAdmin.interface");
  const { key } = useParams<{ key: string }>();
  const def = findInterface(key);

  if (!def) return <ErrorState message={t("notFound")} />;

  const Form = def.form;
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
