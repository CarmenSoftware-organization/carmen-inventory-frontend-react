import { useState } from "react";
import { useFieldArray, useWatch, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import { BoxIcon, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  const locationId = useWatch({ control: form.control, name: "location_id" });
  const hasLocation = !!locationId;

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
      <CardHeader className="border-b">
        <CardTitle className="text-sm">
          {tfl("items")}{" "}
          <span className="text-muted-foreground font-normal">
            ({itemFields.length})
          </span>
        </CardTitle>
        {!disabled && (
          <CardAction>
            <Button
              type="button"
              size="xs"
              onClick={handleAddItem}
              disabled={!hasLocation}
            >
              <Plus /> {t("addItem")}
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {itemsRootMessage && (
          <p className="text-destructive text-xs" role="alert">
            {itemsRootMessage}
          </p>
        )}

        <DataGrid
          table={table}
          recordCount={itemFields.length}
          tableClassNames={{ headerRow: "h-10", bodyRow: "h-10" }}
          emptyMessage={
            <EmptyComponent
              icon={BoxIcon}
              title={t("noItems")}
              description={t("noItemsDesc")}
              content={
                !disabled && (
                  <Button
                    type="button"
                    size="xs"
                    onClick={handleAddItem}
                    disabled={!hasLocation}
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
      </CardContent>

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
