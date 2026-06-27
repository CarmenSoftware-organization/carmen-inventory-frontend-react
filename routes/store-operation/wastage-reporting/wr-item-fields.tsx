"use no memo";

import { useState } from "react";
import { useFieldArray, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import { BoxIcon, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DataGrid,
  DataGridContainer,
} from "@/components/ui/data-grid/data-grid";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import EmptyComponent from "@/components/empty-component";
import type { WrFormValues } from "./wr-form-schema";
import { WR_ITEM } from "./wr-form-schema";
import { useWrItemTable } from "./wr-item-table";
import { getDeleteDescription } from "@/lib/form-utils";

interface WrItemFieldsProps {
  form: UseFormReturn<WrFormValues>;
  disabled: boolean;
}

/**
 * ส่วนแสดงและแก้ไขรายการสินค้าในรายงานของเสีย
 * รองรับเพิ่ม/ลบรายการพร้อม DeleteDialog และตาราง useWrItemTable
 *
 * @param props - form และสถานะ disabled
 * @param props.form - react-hook-form instance ของ WrFormValues
 * @param props.disabled - true ถ้าอยู่ในโหมด view
 * @returns คอมโพเนนต์ฟิลด์รายการสินค้า WR
 * @example
 * <WrItemFields form={form} disabled={mode === "view"} />
 */
export function WrItemFields({ form, disabled }: WrItemFieldsProps) {
  const t = useTranslations("storeOperation.wastageReporting");
  const tfl = useTranslations("field");
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  const {
    fields: itemFields,
    prepend: prependItem,
    remove: removeItem,
  } = useFieldArray({ control: form.control, name: "items" });

  const handleAddItem = () => {
    prependItem({ ...WR_ITEM });
  };

  const { table } = useWrItemTable({
    form,
    itemFields,
    disabled,
    onDelete: setDeleteIndex,
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold border-b pb-2">
          {tfl("items")}{" "}
          <span className="text-muted-foreground font-normal">
            ({itemFields.length})
          </span>
        </h2>
        {!disabled && (
          <Button type="button" size="xs" onClick={handleAddItem}>
            <Plus aria-hidden="true" /> {t("addItem")}
          </Button>
        )}
      </div>

      <DataGrid
        table={table}
        recordCount={itemFields.length}
        emptyMessage={
          <EmptyComponent
            icon={BoxIcon}
            title={t("noItems")}
            description={t("noItemsDesc")}
            content={
              !disabled && (
                <Button type="button" size="xs" onClick={handleAddItem}>
                  <Plus aria-hidden="true" /> {t("addItem")}
                </Button>
              )
            }
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
    </div>
  );
}
