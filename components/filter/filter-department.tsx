import { useTranslations } from "use-intl";
import { useDepartment } from "@/hooks/use-department";
import { ACTIVE_ONLY_FILTER } from "@/hooks/use-lookup-pagination";
import type { Department } from "@/types/department";
import { EntityMultiFilter } from "./entity-multi-filter";

interface FilterDepartmentProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly className?: string;
}

/** ตัวกรองแผนกแบบเลือกหลายค่า — clause `department_id|string:id1,id2` */
export function FilterDepartment({
  value,
  onChange,
  className,
}: FilterDepartmentProps) {
  const tfl = useTranslations("field");
  return (
    <EntityMultiFilter<Department>
      value={value}
      onChange={onChange}
      className={className}
      fieldKey="department_id"
      label={tfl("department")}
      useListHook={useDepartment}
      getId={(d) => d.id}
      getLabel={(d) => d.name}
      serverFilter={ACTIVE_ONLY_FILTER}
    />
  );
}
