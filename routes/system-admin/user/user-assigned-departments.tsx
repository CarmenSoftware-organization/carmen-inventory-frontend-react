import { Controller, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import { LookupDepartment } from "@/components/lookup/lookup-department";
import { FieldPlainText } from "@/components/ui/field";
import { AssignSection } from "./user-assigned-ui";
import type { UserAssignedFormValues } from "./user-assigned-form-schema";

interface DepartmentsSectionProps {
  readonly form: UseFormReturn<UserAssignedFormValues>;
  readonly isDisabled: boolean;
  /** ชื่อแผนกที่สังกัดอยู่ตอนเปิดหน้า — มากับตัวผู้ใช้แล้ว */
  readonly departmentName: string | undefined;
}

/**
 * แผนกที่ผู้ใช้สังกัด — **เลือกได้ค่าเดียว** จึงเป็น lookup ไม่ใช่ชุด checkbox
 *
 * โหมดดูแสดงชื่อที่มากับตัวผู้ใช้ตรง ๆ ไม่ผ่าน `readOnly` ของ `LookupDepartment`
 * เพราะตัวนั้นต้องลากทะเบียนแผนกทั้ง BU มาแปลง id เป็นชื่อ ทั้งที่ชื่ออยู่ในมือ
 * แล้ว — ทะเบียนถูกยิงตอนกด Edit เท่านั้น
 */
export function DepartmentsSection({
  form,
  isDisabled,
  departmentName,
}: DepartmentsSectionProps) {
  const t = useTranslations("systemAdmin.user");

  return (
    <AssignSection
      title={t("departmentsTitle")}
      description={t("departmentsDesc")}
    >
      {isDisabled ? (
        <FieldPlainText>{departmentName}</FieldPlainText>
      ) : (
        <Controller
          control={form.control}
          name="department_id"
          render={({ field }) => (
            <LookupDepartment
              value={field.value}
              onValueChange={field.onChange}
              className="w-full"
            />
          )}
        />
      )}
    </AssignSection>
  );
}
