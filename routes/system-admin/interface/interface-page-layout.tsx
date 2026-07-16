import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { DiscardDialog } from "@/components/ui/discard-dialog";
import { SettingSectionSkeleton } from "@/components/ui/setting-section";
import { useNavigationGuard } from "@/hooks/use-navigation-guard";

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
  const navGuard = useNavigationGuard(isDirty && !isSaving);

  return (
    <div className="mx-auto max-w-4xl p-[max(1rem,env(safe-area-inset-bottom))]">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">{description}</p>
        </div>
        {!isError && !isLoading && (
          <div className="flex shrink-0 items-center gap-2">
            <Button size="sm" onClick={onSave} disabled={isSaving}>
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
          <SettingSectionSkeleton first fields={["half", "half", "half", "half"]} />
          <SettingSectionSkeleton fields={["half", "half", "full"]} />
        </div>
      )}

      {!isError && !isLoading && <form onSubmit={onSave}>{children}</form>}

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
