
import { useTranslations } from "use-intl";
import { useUnit, useDeleteUnit } from "@/hooks/use-unit";
import type { Unit } from "@/types/unit";
import { UnitDialog } from "@/components/share/unit-dialog";
import { ConfigListTemplate } from "@/components/templates/config-list-template";
import { useUnitTable } from "./use-unit-table";
import UnitCard from "./unit-card";

/**
 * Component หลักของหน้ารายการ Unit ใช้ ConfigListTemplate พร้อม dialog
 *
 * ใช้ `ConfigListTemplate` แบบ dialog-based โดยส่ง `renderDialog`
 * เป็น `UnitDialog` สำหรับการเพิ่ม/แก้ไข
 *
 * @returns React element ของหน้ารายการ Unit
 * @example
 * ```tsx
 * // ใช้ใน app/(root)/config/unit/page.tsx
 * <UnitComponent />
 * ```
 */
export default function UnitComponent() {
  const tfl = useTranslations("field");
  const ts = useTranslations("status");
  return (
    <ConfigListTemplate<Unit>
      translationNamespace="config.unit"
      entityNameField="name"
      useList={useUnit}
      useDelete={useDeleteUnit}
      useTable={useUnitTable}
      permissionPrefix="product_management.unit"
      exportColumns={[
        { header: tfl("name"), value: (r) => r.name, width: 24 },
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
      renderDialog={({ open, onOpenChange, entity, readOnly }) => (
        <UnitDialog
          open={open}
          onOpenChange={onOpenChange}
          unit={entity}
          readOnly={readOnly}
        />
      )}
      renderCard={({ item, index, onEdit }) => (
        <UnitCard item={item} index={index} onEdit={onEdit} />
      )}
    />
  );
}
