
import { useState } from "react";
import { useTranslations } from "use-intl";
import { useDepartment } from "@/hooks/use-department";
import { LookupCombobox } from "./lookup-combobox";

interface LookupDepartmentProps {
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly className?: string;
  readonly error?: string;
}

/**
 * Lookup Popover สำหรับเลือกแผนก (Department)
 *
 * ดึงข้อมูลผ่าน `useDepartment` hook (endpoint `/departments`) พร้อม server-side search
 * และ filter เฉพาะ `is_active = true` ใช้ `LookupCombobox` เป็น UI หลัก
 * เหมาะสำหรับใช้ในฟอร์ม PR/PO/SR เพื่อกำหนดแผนกที่รับผิดชอบ
 *
 * @param value - id ของ department ที่เลือกอยู่
 * @param onValueChange - callback เมื่อเปลี่ยนค่า ส่งเฉพาะ id
 * @param disabled - ปิดการใช้งาน lookup
 * @param placeholder - ข้อความ placeholder ตอนยังไม่เลือก
 * @param className - className เพิ่มเติม
 * @returns JSX popover element ของ department lookup
 * @example
 * ```tsx
 * <Controller
 *   name="department_id"
 *   control={form.control}
 *   render={({ field }) => (
 *     <LookupDepartment value={field.value} onValueChange={field.onChange} />
 *   )}
 * />
 * ```
 */
export function LookupDepartment({
  value,
  onValueChange,
  disabled,
  placeholder,
  className,
  error,
}: LookupDepartmentProps) {
  const tl = useTranslations("lookup");
  const tfl = useTranslations("field");
  // Lazy: ยิง API ตอนเปิด popover ครั้งแรก หรือเมื่อมีค่าเลือกไว้แล้ว (resolve label)
  const [hasOpened, setHasOpened] = useState(false);
  const { data, isLoading } = useDepartment(undefined, {
    enabled: hasOpened || !!value,
  });
  const departments = data?.data ?? [];

  return (
    <LookupCombobox
      value={value}
      onValueChange={(id) => onValueChange(id)}
      onOpenChange={(open) => {
        if (open) setHasOpened(true);
      }}
      items={departments}
      getId={(d) => d.id}
      getLabel={(d) => d.name}
      placeholder={placeholder ?? tl("select", { entity: tfl("department") })}
      searchPlaceholder={tl("search", { entity: tfl("department") })}
      disabled={disabled}
      className={className}
      isLoading={isLoading}
      error={error}
    />
  );
}
