import { useState } from "react";
import { useTranslations } from "use-intl";
import { useFieldArray, useWatch, type UseFormReturn } from "react-hook-form";
import { BoxIcon, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DataGrid,
  DataGridContainer,
} from "@/components/ui/data-grid/data-grid";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { SettingSection } from "@/components/ui/setting-section";
import type { BusinessUnit } from "@/types/profile";
import type { PrtFormValues } from "./prt-form-schema";
import { usePrtItemTable } from "./use-prt-item-table";
import { PRT_ITEM } from "./prt-form-schema";
import EmptyComponent from "@/components/empty-component";
import { getDeleteDescription } from "@/lib/form-utils";

interface PrtItemFieldsProps {
  readonly form: UseFormReturn<PrtFormValues>;
  readonly disabled: boolean;
  readonly readOnly?: boolean;
  readonly defaultBu?: BusinessUnit;
}

export function PrtItemFields({
  form,
  disabled,
  readOnly = false,
  defaultBu,
}: PrtItemFieldsProps) {
  "use no memo";
  const t = useTranslations("procurement.purchaseRequestTemplate");
  const tfl = useTranslations("field");
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  const {
    fields: itemFields,
    prepend: prependItem,
    remove: removeItem,
  } = useFieldArray({ control: form.control, name: "items" });

  // คลังกับสินค้าของแต่ละรายการผูกกับเวิร์กโฟลว์ของแม่แบบ ยังไม่เลือกก็ยังไม่รู้ว่า
  // แม่แบบนี้เอาไว้ใช้กับขั้นตอนไหน — กันตั้งแต่ปุ่มเพิ่มรายการ ดีกว่าปล่อยให้กรอกไป
  // ครึ่งทางแล้วค่อยรู้ · ปุ่มยังกดได้ ไม่ปิดตาย ไม่งั้นคนกดไม่ติดแล้วไม่รู้ว่าทำไม
  const workflowId = useWatch({ control: form.control, name: "workflow_id" });

  const handleAddItem = () => {
    if (!workflowId) {
      toast.warning(t("selectWorkflowFirst"));
      return;
    }
    // แถวใหม่ขึ้นบนสุด "รายการก่อนหน้า" จึงคือแถวแรกปัจจุบัน — แม่แบบหนึ่งชุดมัก
    // เป็นของที่เข้าคลังเดียวกันทั้งชุด เติมคลัง + จุดส่งของให้ล่วงหน้าแล้วแก้เองได้
    // (ทรงเดียวกับ PR/PO/GRN) · อ่านผ่าน getValues ไม่ใช่ itemFields[0] เพราะ
    // field array เก็บค่าตอน mount ไม่ใช่ค่าล่าสุดที่ผู้ใช้เพิ่งเลือก
    const prev = form.getValues("items.0");
    const carriedLocation = prev?.location_id
      ? {
          location_id: prev.location_id,
          location_name: prev.location_name,
          location_code: prev.location_code,
          delivery_point_id: prev.delivery_point_id,
          delivery_point_name: prev.delivery_point_name,
        }
      : {};

    prependItem({
      ...PRT_ITEM,
      currency_id: defaultBu?.config?.default_currency_id ?? null,
      ...carriedLocation,
    });
  };

  const { table } = usePrtItemTable({
    form,
    itemFields,
    disabled,
    readOnly,
    onDelete: setDeleteIndex,
  });

  return (
    <SettingSection
      wide
      frameless
      title={tfl("items")}
      description={t("itemsDesc")}
      count={itemFields.length}
      action={
        !readOnly ? (
          <Button
            type="button"
            size="sm"
            disabled={disabled}
            onClick={handleAddItem}
            variant="secondary"
          >
            <Plus /> {t("addItem")}
          </Button>
        ) : undefined
      }
    >
      <DataGrid
        table={table}
        recordCount={itemFields.length}
        // โหมดอ่านชิดบน — คลังมีรหัสเป็นบรรทัดรอง เซลล์อื่นไม่มี
        tableLayout={{ cellAlign: readOnly ? "top" : "middle" }}
        emptyMessage={
          <EmptyComponent
            icon={BoxIcon}
            title={t("noItems")}
            description={t("noItemsDesc")}
          />
        }
      >
        <DataGridContainer>
          <DataGridTable />
        </DataGridContainer>
      </DataGrid>

      <DeleteDialog
        open={deleteIndex !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteIndex(null);
        }}
        title={t("removeItem")}
        description={getDeleteDescription(deleteIndex, form)}
        onConfirm={() => {
          if (deleteIndex === null) return;
          removeItem(deleteIndex);
          setDeleteIndex(null);
        }}
      />
    </SettingSection>
  );
}
