import { FormPageShell } from "@/components/share/form-page-shell";
import { SettingSectionSkeleton } from "@/components/ui/setting-section";
import { Skeleton } from "@/components/ui/skeleton";

/** แถบหัวของ FormPageSkeleton — export ให้หน้าที่มี skeleton body เฉพาะตัวใช้หัวเดียวกัน */
export function FormPageHeaderSkeleton() {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-8 w-20 rounded-md" />
    </div>
  );
}

/**
 * loading state ของหน้า form ที่อยู่ใน FormPageShell — โครงเดียวกับหน้าจริง (หัว +
 * SettingSection สองก้อน) แทน `FormSkeleton` ที่เป็น hero + sidebar 22rem full-bleed
 * ซึ่งไม่มีหน้าไหนในกลุ่มนี้เป็นแบบนั้น
 */
export function FormPageSkeleton({
  width,
}: {
  readonly width?: "default" | "wide";
}) {
  return (
    <FormPageShell header={<FormPageHeaderSkeleton />} width={width}>
      <SettingSectionSkeleton first fields={["half", "half", "half", "half"]} />
      <SettingSectionSkeleton fields={["half", "half", "full"]} />
    </FormPageShell>
  );
}
