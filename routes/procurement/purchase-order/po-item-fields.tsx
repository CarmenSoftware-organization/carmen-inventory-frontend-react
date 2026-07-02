import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "use-intl";
import { useFieldArray, useWatch, type UseFormReturn } from "react-hook-form";
import { Check, Eye, Lock, Plus, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import {
  DataGrid,
  DataGridContainer,
} from "@/components/ui/data-grid/data-grid";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { PO_STATUS } from "@/types/purchase-order";
import { STAGE_ROLE } from "@/types/stage-role";
import { computePoAction } from "@/constant/purchase-order";
import type { PoFormValues } from "./po-form-schema";
import { PO_ITEM } from "./po-form-schema";
import { PoActionDialog } from "./po-action-dialog";
import { usePoItemTable } from "./use-po-item-table";
import { PoItemComputedSync } from "./po-item-table";
import { getDeleteDescription } from "@/lib/form-utils";

interface PoItemFieldsProps {
  form: UseFormReturn<PoFormValues>;
  /** counter จากฟอร์ม — เพิ่มทุกครั้งที่ validation ไม่ผ่าน เพื่อ auto-expand row ที่ location error */
  revealErrorSignal: number;
  disabled: boolean;
  /** disabled แยกสำหรับ location editor — ปกติเท่ากับ `disabled` แต่ PO
   *  จาก price list จะล็อก field อื่นหมดแล้วปล่อยให้แก้ location ได้ */
  locationsDisabled?: boolean;
  role?: string;
  poStatus?: string;
  onApprove?: () => void;
  onReject?: () => void;
  onClose?: (reason: string) => void;
  isPending?: boolean;
}

export function PoItemFields({
  form,
  revealErrorSignal,
  disabled,
  locationsDisabled = disabled,
  role,
  poStatus,
  onApprove,
  onReject,
  onClose,
  isPending,
}: PoItemFieldsProps) {
  "use no memo";
  const t = useTranslations("procurement.purchaseOrder");
  const tc = useTranslations("common");
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [bulkAction, setBulkAction] = useState<"close" | "reject" | null>(null);
  // signal นับครั้ง add — เพิ่มทีละ 1 ทุกครั้งที่ prepend item ใหม่ (auto-expand row บนสุด)
  const [addSignal, setAddSignal] = useState(0);

  const {
    fields: itemFields,
    prepend: prependItem,
    remove: removeItem,
  } = useFieldArray({ control: form.control, name: "items" });

  const readOnly = role === STAGE_ROLE.APPROVE;
  const showApproveCheckbox = !!poStatus && poStatus !== "draft";

  const table = usePoItemTable({
    form,
    itemFields,
    disabled,
    locationsDisabled,
    readOnly,
    showApproveCheckbox,
    onDelete: setDeleteIndex,
  });

  const handleAddItem = () => {
    prependItem({ ...PO_ITEM });
    setAddSignal((c) => c + 1);
  };

  // add item ใหม่ → prepend อยู่ index 0 → auto-expand ให้กรอก location ได้เลย
  useEffect(() => {
    if (!addSignal) return;
    const topId = itemFields[0]?.id;
    if (topId) {
      table.setExpanded((prev) => ({
        ...(typeof prev === "object" ? prev : {}),
        [topId]: true,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addSignal]);

  // validation ไม่ผ่าน: field location/order_qty อยู่ในส่วน expand → auto-expand
  // แถวที่ติด error ให้ scrollToFirstInvalidField เจอ field
  useEffect(() => {
    if (!revealErrorSignal) return;
    const itemErrors = form.formState.errors.items;
    if (!itemErrors) return;
    const next: Record<string, boolean> = {};
    itemFields.forEach((f, i) => {
      if (itemErrors[i]?.locations || itemErrors[i]?.order_qty) {
        next[f.id] = true;
      }
    });
    if (Object.keys(next).length === 0) return;
    table.setExpanded((prev) => ({
      ...(typeof prev === "object" ? prev : {}),
      ...next,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealErrorSignal]);

  const items = useWatch({ control: form.control, name: "items" });

  const itemStatuses = useMemo(
    () =>
      items.map((item) =>
        typeof item?.current_stage_status === "string"
          ? item.current_stage_status
          : "",
      ),
    [items],
  );

  const isApprover =
    role === STAGE_ROLE.APPROVE && poStatus === PO_STATUS.IN_PROGRESS;
  const poAction = computePoAction(itemStatuses);
  const canApprove = !!onApprove && isApprover && poAction === "approved";
  const canReject = !!onReject && isApprover && poAction === "rejected";

  const canClose =
    !!onClose &&
    !!poStatus &&
    (poStatus === PO_STATUS.SENT || poStatus === PO_STATUS.PARTIAL);

  const selectedRows = table.getSelectedRowModel().rows;
  const selectedIndices = selectedRows.map((r) => r.index);

  const canBulkAct = isApprover && selectedRows.length > 0;
  const showBulkActions = selectedRows.length > 0 && (canBulkAct || canClose);

  const handleBulkApprove = () => {
    for (const index of selectedIndices) {
      form.setValue(`items.${index}.stage_status`, "approve");
      form.setValue(`items.${index}.current_stage_status`, "approved");
    }
    table.resetRowSelection();
  };

  const handleBulkReview = () => {
    for (const index of selectedIndices) {
      form.setValue(`items.${index}.stage_status`, "review");
      form.setValue(`items.${index}.current_stage_status`, "review");
    }
    table.resetRowSelection();
  };

  const handleBulkActionConfirm = (messages: Record<number, string>) => {
    if (bulkAction === "close") {
      onClose?.(messages[0] ?? "");
    } else if (bulkAction === "reject") {
      for (const index of selectedIndices) {
        form.setValue(`items.${index}.stage_status`, "reject");
        form.setValue(`items.${index}.stage_message`, messages[0] ?? "");
        form.setValue(`items.${index}.current_stage_status`, "rejected");
      }
    }
    table.resetRowSelection();
    setBulkAction(null);
  };

  const bulkActionDialogConfig: Record<
    string,
    {
      title: string;
      description: string;
      confirmLabel: string;
      confirmVariant: "destructive" | "warning";
    }
  > = {
    close: {
      title: t("closeTitle"),
      description: t("closeConfirm"),
      confirmLabel: tc("close"),
      confirmVariant: "warning",
    },
    reject: {
      title: t("rejectTitle"),
      description: t("rejectConfirm"),
      confirmLabel: tc("reject"),
      confirmVariant: "destructive",
    },
  };

  // suppress unused-variable warnings — kept for future footer integration
  void canApprove;
  void canReject;

  const itemsError = form.formState.errors.items?.message;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        {showBulkActions && canBulkAct && (
          <>
            <Button
              type="button"
              variant="success"
              size="xs"
              disabled={isPending}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleBulkApprove();
              }}
            >
              <Check />
              {tc("approve")}
            </Button>
            <Button
              type="button"
              variant="warning"
              size="xs"
              disabled={isPending}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleBulkReview();
              }}
            >
              <Eye />
              {tc("review")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="xs"
              disabled={isPending}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setBulkAction("reject");
              }}
            >
              <ThumbsDown />
              {tc("reject")}
            </Button>
          </>
        )}
        {showBulkActions && canClose && (
          <Button
            type="button"
            variant="warning"
            size="xs"
            disabled={isPending}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setBulkAction("close");
            }}
          >
            <Lock />
            {tc("close")}
          </Button>
        )}
        {(!role || role === STAGE_ROLE.CREATE) && !disabled && (
          <Button type="button" size="xs" onClick={handleAddItem}>
            <Plus /> {t("addItem")}
          </Button>
        )}
      </div>

      {itemsError && (
        <p className="text-destructive text-xs" role="alert">
          {itemsError}
        </p>
      )}

      {/* compute sync — 1 ต่อ item, เขียน derived order_qty/pricing/base_qty กลับ form */}
      {itemFields.map((item, i) => (
        <PoItemComputedSync
          key={item.id}
          control={form.control}
          form={form}
          index={i}
        />
      ))}

      <DataGrid
        table={table}
        recordCount={itemFields.length}
        tableLayout={{
          checkbox: showApproveCheckbox,
        }}
        emptyMessage={
          <div className="text-muted-foreground py-10 text-center text-sm">
            {t("noItems")}
          </div>
        }
      >
        <ScrollArea className="w-full">
          <DataGridContainer>
            <DataGridTable />
          </DataGridContainer>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
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

      {bulkAction && (
        <PoActionDialog
          open={!!bulkAction}
          onOpenChange={(open) => {
            if (!open) setBulkAction(null);
          }}
          onConfirm={handleBulkActionConfirm}
          isPending={isPending}
          {...bulkActionDialogConfig[bulkAction]}
        />
      )}
    </div>
  );
}
