import { Suspense } from "react";
import { useParams } from "react-router";
import { NotFoundComponent } from "@/components/not-found-component";
import { SettingSectionSkeleton } from "@/components/ui/setting-section";
import { findInterface } from "./interface-registry";

/**
 * หน้า config ของ interface ตัวเดียว — resolve `:key` จาก registry แล้ว render form
 *
 * key ที่ไม่รู้จักถือเป็น 404 (ไม่ใช่ error) เพราะเป็น URL ที่พิมพ์มั่วหรือ bookmark เก่า
 *
 * @returns React element ของหน้า interface detail
 */
export function Component() {
  const { key } = useParams<{ key: string }>();
  const def = findInterface(key);

  if (!def) return <NotFoundComponent />;

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
