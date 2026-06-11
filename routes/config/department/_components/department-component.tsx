
import { useTranslations } from "use-intl";
import { ConfigListTemplate } from "@/components/templates/config-list-template";
import { useDepartment, useDeleteDepartment } from "@/hooks/use-department";
import type { Department } from "@/types/department";
import { useDepartmentTable } from "./use-department-table";
import DepartmentCard from "./department-card";

/**
 * Component หลักของหน้ารายการ Department ใช้ ConfigListTemplate แบบ page-based
 *
 * ส่ง `addPath` และ `getEditPath` ไปยัง `ConfigListTemplate` เพื่อให้ปุ่ม
 * เพิ่ม/แก้ไขนำทางไปยังหน้า new/[id]
 *
 * @returns React element ของหน้ารายการ Department
 * @example
 * ```tsx
 * // ใช้ใน app/(root)/config/department/page.tsx
 * <DepartmentComponent />
 * ```
 */
export default function DepartmentComponent() {
  const tfl = useTranslations("field");
  const ts = useTranslations("status");
  return (
    <ConfigListTemplate<Department>
      translationNamespace="config.department"
      entityNameField="name"
      useList={useDepartment}
      useDelete={useDeleteDepartment}
      useTable={useDepartmentTable}
      permissionPrefix="configuration.department"
      addPath="/config/department/new"
      getEditPath={(d) => `/config/department/${d.id}`}
      exportColumns={[
        { header: tfl("code"), value: (r) => r.code, width: 14 },
        { header: tfl("name"), value: (r) => r.name, width: 28 },
        {
          header: tfl("description"),
          value: (r) => r.description ?? "",
          width: 40,
        },
        {
          header: tfl("status"),
          value: (r) => (r.is_active ? ts("active") : ts("inactive")),
          width: 10,
        },
      ]}
      renderCard={({ item, index, onEdit }) => (
        <DepartmentCard item={item} index={index} onEdit={onEdit} />
      )}
    />
  );
}
