import { useTranslations } from "use-intl";
import { StatusFilter } from "@/components/ui/status-filter";
import { useDepartment } from "@/hooks/use-department";

interface UserDepartmentFilterProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
}

/**
 * ตัวเลือกแผนกในเมนู filter ของหน้ารายการผู้ใช้
 *
 * ทะเบียนแผนกถูกยิงตอน component นี้ถูก render เท่านั้น — คือตอน **hover** แถว
 * แผนกในเมนู filter (submenu ของ `ListFilterMenu` render เฉพาะแถวที่ active),
 * ตอนเปิด bottom sheet บนมือถือ หรือตอนกด chip เพื่อแก้ค่า — ไม่ใช่ตอนเปิดหน้า
 * ซึ่งคนส่วนใหญ่ไม่ได้แตะ filter เลย
 *
 * เป็น single-select (`StatusFilter`) ไม่ใช่ `FilterDepartment` แบบ multi ของ
 * ที่อื่น เพราะ label ที่นี่เป็นข้อความจริง `code - name` ไม่ใช่ i18n key
 */
export function UserDepartmentFilter({
  value,
  onChange,
}: UserDepartmentFilterProps) {
  const t = useTranslations("systemAdmin.user");
  const { data } = useDepartment({ perpage: -1 });

  const options = (data?.data ?? [])
    .filter((d) => d.is_active)
    .map((d) => ({
      label: `${d.code} - ${d.name}`,
      value: `department_id|string:${d.id}`,
    }));

  return (
    <StatusFilter
      value={value}
      onChange={onChange}
      placeholder={t("department")}
      options={options}
      className="w-full"
    />
  );
}
