"use no memo";

import { useState } from "react";
import { useTranslations } from "use-intl";
import { useFieldArray, type UseFormReturn } from "react-hook-form";
import { BoxIcon, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DataGrid,
  DataGridContainer,
} from "@/components/ui/data-grid/data-grid";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import type { BusinessUnit } from "@/types/profile";
import type { PrtFormValues } from "./prt-form-schema";
import { usePrtItemTable } from "./prt-item-table";
import { PRT_ITEM } from "./prt-form-schema";
import EmptyComponent from "@/components/empty-component";
import { getDeleteDescription } from "@/lib/form-utils";

interface PrtItemFieldsProps {
  readonly form: UseFormReturn<PrtFormValues>;
  readonly disabled: boolean;
  readonly readOnly?: boolean;
  readonly defaultBu?: BusinessUnit;
}

/**
 * ส่วนจัดการรายการสินค้าในเทมเพลต PR รองรับเพิ่ม/ลบรายการ
 * @param props - form, disabled, readOnly state และ defaultBu
 * @returns React element ของรายการสินค้า PRT
 */
export function PrtItemFields({
  form,
  disabled,
  readOnly = false,
  defaultBu,
}: PrtItemFieldsProps) {
  const t = useTranslations("procurement.purchaseRequestTemplate");
  const tfl = useTranslations("field");
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  const {
    fields: itemFields,
    append: appendItem,
    remove: removeItem,
  } = useFieldArray({ control: form.control, name: "items" });

  const handleAddItem = () => {
    appendItem({
      ...PRT_ITEM,
      currency_id: defaultBu?.config?.default_currency_id ?? null,
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
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="border-b pb-2 text-sm font-semibold">
          {tfl("items")}
          {itemFields.length > 0 && (
            <span className="text-muted-foreground ml-1.5 text-xs font-normal">
              ({itemFields.length})
            </span>
          )}
        </h2>
        {!readOnly && (
          <Button
            type="button"
            size="xs"
            disabled={disabled}
            onClick={handleAddItem}
          >
            <Plus /> {t("addItem")}
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
              !readOnly && (
                <Button
                  type="button"
                  size="xs"
                  disabled={disabled}
                  onClick={handleAddItem}
                >
                  <Plus /> {t("addItem")}
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
