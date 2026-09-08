import { useParams } from "react-router";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { DiscardDialog } from "@/components/ui/discard-dialog";
import { SettingSectionSkeleton } from "@/components/ui/setting-section";
import { useNavigationGuard } from "@/hooks/use-navigation-guard";
import { useInterfaceEntitlement } from "@/hooks/use-interface-entitlement";

/**
 * โครงหน้าที่ทุก interface form ใช้ร่วมกัน — header, ปุ่ม Save, skeleton, ErrorState
 * และ guard กันออกจากหน้าตอนแก้ค้าง
 *
 * ไม่ถือ form state เอง: form component เป็นคนถือ `useForm` แล้วส่ง `handleSubmit`
 * เข้ามาเป็น `onSave` กับส่ง `formState.isDirty` เข้ามาเป็น `isDirty` เหตุที่ไม่ให้
 * layout ถือ form state เพราะจะต้องมี generic schema ซึ่งทำให้ interface ที่หน้าตา
 * ต่างกัน (เช่นมี mapping table) ใส่เพิ่มไม่ได้
 *
 * guard อยู่ที่นี่ไม่ใช่ในแต่ละ form เพื่อไม่ให้ก๊อปโค้ดเดียวกันสามรอบ ต่างจาก
 * `default-setting` ตรงที่หน้านี้ไม่มีปุ่ม Cancel (แก้ได้ตลอด ไม่มีโหมด view/edit)
 * จึงใช้แค่ `useNavigationGuard` ไม่ต้องใช้ `useDiscardConfirm`
 *
 * resolve entitlement เองที่นี่แทนที่จะรับ prop เข้ามา — ทุก brand form (4 ไฟล์) mount
 * ผ่านตัวนี้ตัวเดียว จึงล็อกจุดเดียวครอบทุก brand ได้โดยไม่ต้องเจาะ prop `readOnly` ทะลุ
 * ทั้งสี่ฟอร์ม เมื่อ entitlement เป็น `"expired"` ปุ่ม Save และการ submit ฟอร์ม (เช่น กด
 * Enter ใน field) ถูกปิดทั้งคู่
 *
 * **การ์ดนี้เป็น client-side เท่านั้น** — backend ยังไม่มี per-brand gate สำหรับการเขียน
 * interface config: `PUT /api/config/:buCode/app-config/:key` เช็คแค่ feature รวม
 * `configuration.app_config` ไม่มี entry แยกต่อ interface ใน license catalog ที่ generate
 * ไว้ ผู้ใช้ที่แก้ payload เองข้าม UI (เช่นยิง API ตรง) ยังเขียนทับได้อยู่ — ต้องปิดที่ backend
 * ด้วยถึงจะนับเป็นการบังคับใช้จริงตาม design spec (เห็นได้แต่แก้ไม่ได้)
 *
 * @param props.onSave - handleSubmit ของ form ที่ครอบอยู่
 * @param props.isDirty - `form.formState.isDirty` ของ form ที่ครอบอยู่
 * @param props.children - field ของ form (ปกติเป็น SettingSection หลายอัน)
 * @returns React element ของโครงหน้า interface
 */
export function InterfacePageLayout({
  title,
  description,
  onSave,
  isSaving,
  isLoading,
  isError,
  isDirty,
  onRetry,
  errorMessage,
  saveLabel,
  children,
}: {
  readonly title: string;
  readonly description: string;
  readonly onSave: () => void;
  readonly isSaving: boolean;
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly isDirty: boolean;
  readonly onRetry: () => void;
  readonly errorMessage: string;
  readonly saveLabel: string;
  readonly children: React.ReactNode;
}) {
  // แก้ค้างแล้วกดลิงก์/กด back → ถามก่อนทิ้ง
  // ไม่ต้องกัน `!isSaving`: ช่วงที่ save กำลังวิ่งคือช่วงที่เสี่ยงเสียงานที่สุด ต้องกันด้วย
  // และพอ save สำเร็จ form.reset ทำให้ isDirty เป็น false เองอยู่แล้ว (ตาม default-setting)
  const navGuard = useNavigationGuard(isDirty);

  const { category, brand } = useParams<{ category: string; brand: string }>();
  const { entitlementOf } = useInterfaceEntitlement();
  const isExpired = entitlementOf(category ?? "", brand ?? "") === "expired";

  // ปิดทั้งปุ่มและ native submit ของ <form> (เช่นกด Enter ใน field ก็ยังยิง onSubmit ได้
  // แม้ปุ่ม disabled อยู่) — `e?.preventDefault()` ยังต้องเรียกเพื่อกัน browser submit จริง
  // ตอนไม่ expired forward event เดิมต่อให้ `onSave` (ผลลัพธ์ของ `form.handleSubmit`) เพราะ
  // ตัวมันเองก็ต้องใช้ event เรียก preventDefault ของมันเองเช่นกัน
  const guardedSave = (e?: React.SyntheticEvent) => {
    if (isExpired) {
      e?.preventDefault();
      return;
    }
    (onSave as unknown as (e?: React.SyntheticEvent) => void)(e);
  };

  return (
    <div className="mx-auto w-full max-w-4xl p-[max(1rem,env(safe-area-inset-bottom))]">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">{description}</p>
        </div>
        {!isError && !isLoading && (
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={guardedSave}
              disabled={isSaving || isExpired}
            >
              {isSaving ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Save className="size-3.5" aria-hidden="true" />
              )}
              {saveLabel}
            </Button>
          </div>
        )}
      </header>

      {isError && <ErrorState message={errorMessage} onRetry={onRetry} />}

      {!isError && isLoading && (
        <div>
          <SettingSectionSkeleton
            first
            fields={["half", "half", "half", "half"]}
          />
          <SettingSectionSkeleton fields={["half", "half", "full"]} />
        </div>
      )}

      {!isError && !isLoading && (
        <form onSubmit={guardedSave}>{children}</form>
      )}

      <DiscardDialog
        open={navGuard.isOpen}
        onOpenChange={(o) => {
          if (!o) navGuard.cancel();
        }}
        onConfirm={navGuard.confirm}
        onCancel={navGuard.cancel}
        variant="warning"
      />
    </div>
  );
}
