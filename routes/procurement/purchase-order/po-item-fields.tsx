import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "use-intl";
import { useFieldArray, useWatch, type UseFormReturn } from "react-hook-form";
import {
  BoxIcon,
  Check,
  ChevronsDownUp,
  ChevronsUpDown,
  Eye,
  Lock,
  Plus,
  ThumbsDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import EmptyComponent from "@/components/empty-component";
import {
  DataGrid,
  DataGridContainer,
} from "@/components/ui/data-grid/data-grid";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import { PO_STATUS } from "@/types/purchase-order";
import { STAGE_ROLE } from "@/types/stage-role";
import { computePoAction } from "@/constant/purchase-order";
import type { PoFormValues } from "./po-form-schema";
import { PO_ITEM } from "./po-form-schema";
import { PoActionDialog } from "./po-action-dialog";
import { usePoItemTable } from "./use-po-item-table";
import {
  AddLocationRegistryContext,
  type AddLocationRegistry,
} from "./po-locations-add-context";
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
  /** อยู่โหมดแก้ไขไหม — checkbox ตัดสินรายการโผล่เฉพาะตอนแก้ได้ */
  isEditMode?: boolean;
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
  isEditMode = false,
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
  const isApprover =
    role === STAGE_ROLE.APPROVE && poStatus === PO_STATUS.IN_PROGRESS;
  // ต้องอยู่โหมดแก้ไขก่อน ถึงจะเห็น checkbox — ใบที่เปิดอ่านเฉย ๆ ติ๊กไปก็ทำ
  // อะไรต่อไม่ได้ · จากนั้นค่อยดูว่าใบพ้น draft แล้ว (draft ยังไม่มีอะไรให้ตัดสิน)
  const isPoInWorkflow = !!poStatus && poStatus !== "draft";
  // checkbox = การกระทำ ต้องอยู่โหมดแก้ไขถึงจะกดได้จริง
  const showApproveCheckbox = isEditMode && isPoInWorkflow;
  // สถานะรายแถว = ข้อมูล ไม่ใช่การกระทำ — โชว์ตลอดตั้งแต่ใบเข้า workflow
  // โหมดอ่านก็ต้องรู้ว่าแถวไหนผ่าน/ถูกปฏิเสธ แค่กดแก้ไม่ได้
  const showStatusBadge = isPoInWorkflow;

  const table = usePoItemTable({
    form,
    itemFields,
    disabled,
    locationsDisabled,
    readOnly,
    showApproveCheckbox,
    showStatusBadge,
    // ล้างสถานะได้เฉพาะคนที่ตัดสินได้จริง — เกณฑ์เดียวกับปุ่มตัดสินหมู่
    canResetStatus: isApprover && isEditMode,
    onDelete: setDeleteIndex,
  });

  // registry ให้ปุ่ม "+" (action column) เรียก prepend location ของ LocationsEditor
  const addLocationRegistry = useRef<AddLocationRegistry>(new Map()).current;

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

  // กด Save/Submit แล้วติดที่ "ต้องมีอย่างน้อย 1 รายการ" — เติมแถวเปล่าให้เลย
  // ผู้ใช้จะได้เห็นว่าต้องกรอกช่องไหนบ้าง แทนที่จะได้แค่ toast แล้วหน้าว่างเปล่า
  // (กติกาเดียวกับ PR)
  const submitCount = form.formState.submitCount;
  useEffect(() => {
    if (!submitCount) return;
    if (itemFields.length === 0 && !disabled) handleAddItem();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ยิงครั้งเดียวต่อการกด submit
  }, [submitCount]);

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

  const poAction = computePoAction(itemStatuses);
  const canApprove = !!onApprove && isApprover && poAction === "approved";
  const canReject = !!onReject && isApprover && poAction === "rejected";

  const canClose =
    !!onClose &&
    !!poStatus &&
    (poStatus === PO_STATUS.SENT || poStatus === PO_STATUS.PARTIAL);

  const selectedRows = table.getSelectedRowModel().rows;
  const selectedIndices = selectedRows.map((r) => r.index);

  // isEditMode ด้วย — คอมเมนต์ที่ canResetStatus บอกว่า "เกณฑ์เดียวกับปุ่มตัดสินหมู่"
  // แต่ของเดิมสองที่ไม่ตรงกัน (ตรงนั้นเช็ค isEditMode ตรงนี้ไม่เช็ค) selection ค้าง
  // ข้ามโหมดได้ ปุ่มตัดสินจึงโผล่ให้กดในโหมดอ่าน
  const canBulkAct = isApprover && isEditMode && selectedRows.length > 0;
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

  const addAction = (!role || role === STAGE_ROLE.CREATE) && !disabled && (
    <Button type="button" size="sm" onClick={handleAddItem}>
      <Plus /> {t("addItem")}
    </Button>
  );

  return (
    <div className="space-y-3">
      {/* แถวเดียว: ปุ่มตัดสิน (อนุมัติ/ส่งกลับ/ปฏิเสธ/ปิด) ชิดซ้าย — เป็นการ
          กระทำกับแถวที่เลือกไว้ มือไปหาปุ่มตรงที่เพิ่งติ๊ก ไม่ต้องกวาดตาไปสุดขวา
          ส่วน toolbar (กาง/ยุบ, เพิ่มรายการ) เป็นของทั้งตาราง ดันไปขวาด้วย
          ms-auto — ไม่ใช้ justify-between เพราะตอนไม่มีปุ่มตัดสิน toolbar ต้อง
          ยังอยู่ขวาเหมือนเดิม */}
      <div className="flex flex-wrap items-center gap-1.5">
        {showBulkActions && (
          <>
            {canBulkAct && (
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
            {canClose && (
              <Button
                type="button"
                variant="outline"
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
          </>
        )}
        <div className="ms-auto flex flex-wrap items-center gap-1.5">
          {itemFields.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() =>
                table.toggleAllRowsExpanded(!table.getIsAllRowsExpanded())
              }
            >
              {table.getIsAllRowsExpanded() ? (
                <>
                  <ChevronsDownUp /> {tc("collapseAll")}
                </>
              ) : (
                <>
                  <ChevronsUpDown /> {tc("expandAll")}
                </>
              )}
            </Button>
          )}
          {addAction}
        </div>
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

      <AddLocationRegistryContext.Provider value={addLocationRegistry}>
        <DataGrid
          table={table}
          recordCount={itemFields.length}
          tableLayout={{
            checkbox: showApproveCheckbox,
            // table กว้างเกิน container → scroll แนวนอน (เหมือน PR): width =
            // getTotalSize(), column กว้างตาม size px ที่กำหนด
            columnsResizable: true,
          }}
          emptyMessage={
            <EmptyComponent
              icon={BoxIcon}
              title={t("noItems")}
              description={t("noItemsDesc")}
            />
          }
        >
          {/* DataGridContainer = native overflow-auto (เลี่ยง nested scroll ของ
              Radix ScrollArea ที่ทำ scroll แนวนอนสะดุด)
              · pb-3 = ที่ว่างให้ scrollbar แนวนอนยืน — บน macOS แถบนี้ลอยทับ
              เนื้อหาโดยไม่กินที่ ไม่เว้นไว้มันจะไปบังตัวเลขแถวสุดท้าย */}
          <DataGridContainer className="[scrollbar-width:thin] [scrollbar-color:var(--scrollbar-thumb)_transparent] pb-3">
            <DataGridTable />
          </DataGridContainer>
        </DataGrid>
      </AddLocationRegistryContext.Provider>

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
