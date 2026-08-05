import { useState } from "react";
import { useFieldArray, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import { BoxIcon, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SettingSection } from "@/components/ui/setting-section";
import {
  DataGrid,
  DataGridContainer,
} from "@/components/ui/data-grid/data-grid";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import EmptyComponent from "@/components/empty-component";
import type { InventoryAdjustmentType } from "@/types/inventory-adjustment";
import type { AdjFormValues } from "./ia-form-schema";
import { ADJ_ITEM } from "./ia-form-schema";
import { useAdjItemTable } from "./ia-item-table";
import { getDeleteDescription } from "@/lib/form-utils";

interface AdjItemFieldsProps {
  readonly form: UseFormReturn<AdjFormValues>;
  readonly disabled: boolean;
  readonly adjustmentType: InventoryAdjustmentType;
}

export function AdjItemFields({
  form,
  disabled,
  adjustmentType,
}: AdjItemFieldsProps) {
  "use no memo";
  const t = useTranslations("inventoryManagement.inventoryAdjustment");
  const tfl = useTranslations("field");
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  const {
    fields: itemFields,
    prepend: prependItem,
    remove: removeItem,
  } = useFieldArray({ control: form.control, name: "items" });

  const handleAddItem = () => {
    prependItem({ ...ADJ_ITEM });
  };

  const { table } = useAdjItemTable({
    form,
    itemFields,
    disabled,
    onDelete: setDeleteIndex,
    adjustmentType,
  });

  const itemsError = form.formState.errors.items;
  const itemsRootMessage =
    typeof itemsError?.message === "string" ? itemsError.message : undefined;

  return (
    <>
      <SettingSection
        wide
        title={tfl("items")}
        description={t("noItemsDesc")}
        count={itemFields.length}
        action={
          !disabled ? (
            <Button type="button" size="sm" onClick={handleAddItem}>
              <Plus /> {t("addItem")}
            </Button>
          ) : undefined
        }
      >
        <div className="space-y-2">
          {itemsRootMessage && (
            <p className="text-destructive text-xs" role="alert">
              {itemsRootMessage}
            </p>
          )}

          <DataGrid
            table={table}
            recordCount={itemFields.length}
            emptyMessage={
              // ปุ่มเพิ่มรายการอยู่ที่หัวข้อของ section อยู่แล้ว ไม่ต้องมีซ้ำ
              // ในกล่องว่าง — ปุ่มเดียวกันสองที่บนจอเดียว
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
        </div>
      </SettingSection>

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
    </>
  );
}
