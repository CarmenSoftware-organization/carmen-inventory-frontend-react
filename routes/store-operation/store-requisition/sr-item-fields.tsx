"use no memo";

import {
  forwardRef,
  useImperativeHandle,
  useState,
} from "react";
import { useFieldArray, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import { BoxIcon, Check, Eye, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DataGrid,
  DataGridContainer,
} from "@/components/ui/data-grid/data-grid";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import EmptyComponent from "@/components/empty-component";
import { STAGE_ROLE } from "@/types/stage-role";
import type { SrFormValues } from "./sr-form-schema";
import { SR_ITEM, SR_ITEM_STAGE } from "./sr-form-schema";
import { useSrItemTable } from "./sr-item-table";
import { SrSelectDialog } from "./sr-select-dialog";
import { SrActionDialog } from "./sr-action-dialog";
import { getDeleteDescription } from "@/lib/form-utils";

export interface SrItemFieldsHandle {
  readonly addItem: () => void;
}

interface SrItemFieldsProps {
  readonly form: UseFormReturn<SrFormValues>;
  readonly disabled: boolean;
  readonly disableAdd?: boolean;
  readonly fromLocationId: string;
  readonly toLocationId: string;
  readonly role?: string;
}

export const SrItemFields = forwardRef<SrItemFieldsHandle, SrItemFieldsProps>(
  function SrItemFields(
    { form, disabled, disableAdd, fromLocationId, toLocationId, role },
    ref,
  ) {
    const t = useTranslations("storeOperation.storeRequisition");
    const tc = useTranslations("common");
    const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
    const [bulkAction, setBulkAction] = useState<
      "approve" | "reject" | null
    >(null);

    const {
      fields: itemFields,
      prepend: prependItem,
      remove: removeItem,
    } = useFieldArray({ control: form.control, name: "items" });

    const handleAddItem = () => {
      prependItem({ ...SR_ITEM });
    };

    useImperativeHandle(
      ref,
      () => ({
        addItem: handleAddItem,
      }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [],
    );

    const {
      table,
      selectDialogOpen,
      setSelectDialogOpen,
      allCount,
      pendingCount,
      handleSelectAll,
      handleSelectPending,
    } = useSrItemTable({
      form,
      itemFields,
      disabled,
      onDelete: setDeleteIndex,
      fromLocationId,
      toLocationId,
      role,
    });

    const selectedRows = table.getSelectedRowModel().rows;
    const canBulkAction =
      !disabled &&
      (role === STAGE_ROLE.APPROVE || role === STAGE_ROLE.ISSUE);

    const getSelectedIndices = () =>
      table.getSelectedRowModel().rows.map((row) => row.index);

    const applyBulkStatus = (status: string) => {
      const indices = getSelectedIndices();
      for (const index of indices) {
        form.setValue(`items.${index}.stage_status`, status, {
          shouldDirty: true,
        });
      }
      table.resetRowSelection();
    };

    const handleBulkApprove = () => {
      applyBulkStatus(SR_ITEM_STAGE.APPROVE);
    };

    const handleBulkReject = () => {
      applyBulkStatus(SR_ITEM_STAGE.REJECT);
      setBulkAction(null);
    };

    const handleBulkReview = () => {
      applyBulkStatus(SR_ITEM_STAGE.REVIEW);
    };

    return (
      <div className="space-y-2">
        {selectedRows.length > 0 && canBulkAction && (
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            <Button
              type="button"
              variant="success"
              size="xs"
              onClick={handleBulkApprove}
            >
              <Check />
              {tc("approve")}
            </Button>
            <Button
              type="button"
              variant="warning"
              size="xs"
              onClick={handleBulkReview}
            >
              <Eye />
              {tc("sendBack")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="xs"
              onClick={() => setBulkAction("reject")}
            >
              <X />
              {tc("reject")}
            </Button>
          </div>
        )}

        <DataGrid
          table={table}
          recordCount={itemFields.length}
          tableLayout={{ checkbox: !disabled }}
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
                    disabled={disableAdd}
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

        <SrSelectDialog
          open={selectDialogOpen}
          onOpenChange={setSelectDialogOpen}
          allCount={allCount}
          pendingCount={pendingCount}
          onSelectAll={handleSelectAll}
          onSelectPending={handleSelectPending}
        />

        <SrActionDialog
          open={bulkAction === "reject"}
          onOpenChange={(o) => !o && setBulkAction(null)}
          title={t("rejectTitle")}
          description={t("rejectConfirm")}
          confirmLabel={tc("reject")}
          confirmVariant="destructive"
          items={selectedRows.map((row) => ({
            index: row.index,
            productName: row.original.product_name ?? "",
            locationName: row.original.unit_name ?? "",
          }))}
          onConfirm={(messages) => {
            for (const row of selectedRows) {
              const msg = messages[row.index];
              if (msg !== undefined) {
                form.setValue(`items.${row.index}.stage_message`, msg, {
                  shouldDirty: true,
                });
              }
            }
            handleBulkReject();
          }}
        />

      </div>
    );
  },
);
