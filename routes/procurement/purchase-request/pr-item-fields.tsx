// Opt out of React Compiler memoization — useFieldArray + dynamic setValue calls
// cause stale closure issues when auto-memoized.
"use no memo";

import { useEffect, useState } from "react";
import { useFieldArray, useWatch, type UseFormReturn } from "react-hook-form";
import { PrStageRoleProvider } from "./pr-item-cells";
import { useTranslations } from "use-intl";
import {
  AlertTriangle,
  BoxIcon,
  Check,
  ChevronsDownUp,
  ChevronsUpDown,
  Eye,
  Loader2,
  Plus,
  RefreshCcw,
  Scissors,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DataGrid,
  DataGridContainer,
} from "@/components/ui/data-grid/data-grid";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { STAGE_ROLE } from "@/types/stage-role";
import type { BusinessUnit } from "@/types/profile";
import type { PrFormValues } from "./pr-form-schema";
import { usePrItemTable } from "./pr-item-table";
import {
  PrActionDialog,
  type StageOption,
  type ActionDialogItem,
} from "./workflow/pr-action-dialog";
import { lazy, Suspense } from "react";

// แทน next/dynamic ด้วย React.lazy (code-split เหมือนเดิม)
const PrSelectDialog = lazy(() =>
  import("./pr-select-dialog").then((mod) => ({ default: mod.PrSelectDialog })),
);
import EmptyComponent from "@/components/empty-component";
import { PR_ITEM } from "./pr-form-schema";
import { getDeleteDescription } from "@/lib/form-utils";
import { PR_ITEM_STAGE_STATUS } from "@/types/purchase-request";
import { scrollToFirstInvalidField } from "@/lib/form-helpers";
import { PrAskAiMenu } from "./ai/pr-ask-ai-menu";
import { runPrAutoAllocate } from "./pr-auto-allocate";

interface PrItemFieldsProps {
  readonly form: UseFormReturn<PrFormValues>;
  readonly isDisabled: boolean;
  readonly role?: string;
  readonly prId?: string;
  readonly prStatus?: string;
  readonly buCode?: string;
  readonly defaultBu?: BusinessUnit;
  readonly dateFormat: string;
  readonly onSplit?: (detailIds: string[]) => void;
  readonly previousStages?: StageOption[];
  readonly stagesLoading?: boolean;
  readonly onBulkReview?: (
    detailIds: string[],
    messages: Record<number, string>,
    desStage: string,
  ) => void;
}

export function PrItemFields({
  form,
  isDisabled,
  role,
  prId,
  prStatus,
  buCode,
  defaultBu,
  dateFormat,
  onSplit,
  previousStages,
  stagesLoading,
  onBulkReview,
}: PrItemFieldsProps) {
  const t = useTranslations("procurement.purchaseRequest");
  const tc = useTranslations("common");
  const [isAllocating, setIsAllocating] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [bulkAction, setBulkAction] = useState<
    PR_ITEM_STAGE_STATUS.REVIEW | PR_ITEM_STAGE_STATUS.REJECTED | null
  >(null);
  const [showOverQtyWarning, setShowOverQtyWarning] = useState(false);

  const {
    fields: itemFields,
    prepend: prependItem,
    remove: removeItem,
  } = useFieldArray({ control: form.control, name: "items" });

  const workflowId = useWatch({ control: form.control, name: "workflow_id" });
  const canAddItem = !!workflowId;

  const handleAddItem = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    prependItem(
      {
        ...PR_ITEM,
        currency_id: defaultBu?.config?.default_currency_id ?? null,
        delivery_date: tomorrow.toISOString(),
      },
      { shouldFocus: false },
    );

    // Focus the Location lookup trigger in the new (first) row after React commits
    setTimeout(() => {
      const firstRow = document.querySelector("tbody tr");
      const trigger = firstRow?.querySelector<HTMLButtonElement>(
        "button[aria-expanded]",
      );
      if (trigger) {
        trigger.focus();
        trigger.classList.add("ring-2", "ring-ring/50");
        trigger.addEventListener(
          "blur",
          () => trigger.classList.remove("ring-2", "ring-ring/50"),
          { once: true },
        );
      }
    }, 0);
  };

  // กด Save/Submit แล้วติดที่ "ต้องมีอย่างน้อย 1 รายการ" — ขึ้น toast อย่างเดียว
  // ผู้ใช้ยังไม่เห็นอยู่ดีว่าต้องกรอกอะไรบ้าง เพราะยังไม่มีแถวให้ดู เติมแถวเปล่า
  // ให้เลยแล้วช่องที่ต้องกรอกจะขึ้นกรอบแดงเอง (แถวที่มี error ถูกกางให้อยู่แล้ว
  // ผ่าน submitCount ใน pr-item-table)
  const submitCount = form.formState.submitCount;
  useEffect(() => {
    if (!submitCount) return;
    if (itemFields.length === 0 && canAddItem) handleAddItem();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ยิงครั้งเดียวต่อการกด submit
  }, [submitCount]);

  const {
    table,
    selectDialogOpen,
    setSelectDialogOpen,
    allCount,
    pendingCount,
    handleSelectAll,
    handleSelectPending,
  } = usePrItemTable({
    form,
    itemFields,
    isDisabled,
    prStatus,
    role,
    dateFormat,
    buCode,
    baseCurrencyCode: defaultBu?.config?.default_currency?.code,
    onDelete: setDeleteIndex,
  });

  const selectedRows = table.getSelectedRowModel().rows;
  const canBulkAction =
    role === STAGE_ROLE.APPROVE || role === STAGE_ROLE.PURCHASE;

  const handleAutoAllocate = async () => {
    setIsAllocating(true);
    await runPrAutoAllocate(form, buCode, {
      allocating: (count) => t("allocating", { count }),
      allocated: (allocated, total) => t("allocated", { allocated, total }),
      allocateFailed: (count) => t("allocateFailed", { count }),
      noPriceListFound: t("noPriceListFound"),
    });
    setIsAllocating(false);
  };

  const getSelectedIndices = (): number[] => {
    return selectedRows.map((row) => row.index);
  };

  /**
   * Validate รายการที่เลือกก่อนทำ bulk action (approve/review/reject)
   * ถ้ามี item ที่ zod error → expand แถวนั้น + scroll ไป field แรกที่ผิด + เตือน
   * แล้วคืน `true` เพื่อให้ caller block action
   * (zod superRefine บังคับ vendor/price/tax เฉพาะตอน role = purchase อยู่แล้ว
   *  จึงไม่ block ผิดจังหวะที่ stage อื่น)
   */
  const guardSelectedItemErrors = async (): Promise<boolean> => {
    await form.trigger("items");
    const errored = getSelectedIndices().filter((index) => {
      const itemErr = form.formState.errors.items?.[index];
      return !!itemErr && Object.keys(itemErr).length > 0;
    });
    if (errored.length === 0) return false;
    table.setExpanded((prev) => ({
      ...(typeof prev === "object" ? prev : {}),
      ...Object.fromEntries(errored.map((i) => [String(i), true])),
    }));
    scrollToFirstInvalidField();
    toast.warning(t("purchaseIncomplete"));
    return true;
  };

  const handleBulkReview = async () => {
    // send back ไม่ต้องกรอก vendor/price/tax ให้ครบ — ข้าม guard
    const indices = getSelectedIndices();
    for (const index of indices) {
      form.setValue(`items.${index}.stage_status`, PR_ITEM_STAGE_STATUS.REVIEW);
      form.setValue(
        `items.${index}.current_stage_status`,
        PR_ITEM_STAGE_STATUS.REVIEW,
      );
    }
    table.resetRowSelection();
  };

  const handleBulkReject = async () => {
    // reject ไม่ต้องกรอก vendor/price/tax ให้ครบ — ข้าม guard
    setBulkAction(PR_ITEM_STAGE_STATUS.REJECTED);
  };

  const handleBulkApprove = async () => {
    if (await guardSelectedItemErrors()) return;
    const indices = getSelectedIndices();

    const hasOverQty = indices.some((index) => {
      const approvedQty = form.getValues(`items.${index}.approved_qty`);
      const requestedQty = form.getValues(`items.${index}.requested_qty`);
      return approvedQty > requestedQty;
    });

    if (hasOverQty) {
      setShowOverQtyWarning(true);
      return;
    }

    for (const index of indices) {
      form.setValue(
        `items.${index}.stage_status`,
        PR_ITEM_STAGE_STATUS.APPROVE,
      );
      form.setValue(
        `items.${index}.current_stage_status`,
        PR_ITEM_STAGE_STATUS.APPROVE,
      );
    }
    table.resetRowSelection();
  };

  const handleOverQtyConfirm = () => {
    const indices = getSelectedIndices();
    for (const index of indices) {
      form.setValue(
        `items.${index}.stage_status`,
        PR_ITEM_STAGE_STATUS.APPROVE,
      );
      form.setValue(
        `items.${index}.current_stage_status`,
        PR_ITEM_STAGE_STATUS.APPROVE,
      );
    }
    table.resetRowSelection();
    setShowOverQtyWarning(false);
  };

  const handleOverQtyCancel = () => {
    const indices = getSelectedIndices();
    for (const index of indices) {
      const approvedQty = form.getValues(`items.${index}.approved_qty`);
      const requestedQty = form.getValues(`items.${index}.requested_qty`);
      if (approvedQty > requestedQty) {
        form.setValue(`items.${index}.approved_qty`, requestedQty);
      }
    }
    setShowOverQtyWarning(false);
  };

  const handleBulkActionConfirm = (
    messages: Record<number, string>,
    desStage?: string,
  ) => {
    if (!bulkAction) return;
    const indices = getSelectedIndices();

    if (bulkAction === PR_ITEM_STAGE_STATUS.REVIEW && desStage) {
      const detailIds = indices
        .map((i) => form.getValues(`items.${i}.id`))
        .filter((id): id is string => !!id);
      onBulkReview?.(detailIds, messages, desStage);
      table.resetRowSelection();
      setBulkAction(null);
      return;
    }

    for (const index of indices) {
      form.setValue(`items.${index}.stage_status`, bulkAction);
      form.setValue(`items.${index}.current_stage_status`, bulkAction);
      form.setValue(`items.${index}.stage_message`, messages[index] ?? "");
    }
    table.resetRowSelection();
    setBulkAction(null);
  };

  const handleBulkSplit = () => {
    const detailIds = selectedRows
      .map((row) => {
        const item = form.getValues(`items.${row.index}`);
        return item.id;
      })
      .filter((id): id is string => !!id);

    if (detailIds.length === 0) {
      toast.error(t("noSavedItemsForSplit"));
      return;
    }

    onSplit?.(detailIds);
    table.resetRowSelection();
  };

  const bulkActionDialogConfig: Record<
    string,
    {
      title: string;
      description: string;
      confirmLabel: string;
      confirmVariant: "warning" | "destructive";
    }
  > = {
    [PR_ITEM_STAGE_STATUS.REVIEW]: {
      title: t("reviewItemsTitle"),
      description: t("reviewItemsDesc"),
      confirmLabel: t("reviewTitle"),
      confirmVariant: "warning" as const,
    },
    [PR_ITEM_STAGE_STATUS.REJECTED]: {
      title: t("rejectItemsTitle"),
      description: t("rejectItemsDesc"),
      confirmLabel: tc("reject"),
      confirmVariant: "destructive" as const,
    },
  };

  return (
    <PrStageRoleProvider role={role}>
      <div className="space-y-4">
        {/* แถวเดียว: ปุ่มตัดสิน (อนุมัติ/ส่งกลับ/ปฏิเสธ/แยกใบ) ชิดซ้าย — เป็นการ
            กระทำกับแถวที่เพิ่งติ๊ก มือไปหาปุ่มตรงนั้น ไม่ต้องกวาดตาไปสุดขวา
            ส่วนของทั้งตาราง (ถาม AI, กาง/ยุบ, เพิ่มรายการ, จัดราคาอัตโนมัติ)
            ดันไปขวาด้วย ms-auto — ไม่ใช้ justify-between เพราะตอนไม่มีปุ่มตัดสิน
            มันจะเหลือลูกตัวเดียวแล้วไปกองซ้าย */}
        <div className="flex flex-wrap items-center gap-1.5">
          {selectedRows.length > 0 && canBulkAction && (
            <>
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
                {t("reviewTitle")}
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="xs"
                onClick={handleBulkReject}
              >
                <X />
                {tc("reject")}
              </Button>
              {prId && (
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={handleBulkSplit}
                >
                  <Scissors />
                  {t("split")}
                </Button>
              )}
            </>
          )}

          <div className="ms-auto flex flex-wrap items-center gap-1.5">
            {selectedRows.length > 0 && (
              <PrAskAiMenu
                items={selectedRows.map((row) => {
                  const item = form.getValues(`items.${row.index}`);
                  return {
                    productName: item.product_name,
                    productLocalName: item.product_local_name,
                    locationName: item.location_name,
                  };
                })}
              />
            )}
            {(role === STAGE_ROLE.APPROVE || role === STAGE_ROLE.PURCHASE) && (
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
            {!isDisabled && role === STAGE_ROLE.CREATE && (
              <Button type="button" size="sm" onClick={() => handleAddItem()}>
                <Plus /> {t("addItem")}
              </Button>
            )}
            {!isDisabled && role === STAGE_ROLE.PURCHASE && (
              <Button
                type="button"
                size="xs"
                disabled={isAllocating || itemFields.length === 0}
                onClick={handleAutoAllocate}
              >
                {isAllocating ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <RefreshCcw />
                )}
                {t("autoAllocate")}
              </Button>
            )}
          </div>
        </div>

        <DataGrid
          table={table}
          recordCount={itemFields.length}
          tableLayout={{
            checkbox: !!prStatus && prStatus !== "draft",
            columnsResizable: true,
          }}
          emptyMessage={
            <EmptyComponent
              icon={BoxIcon}
              title={t("noItems")}
              description={t("noItemsDesc")}
              content={
                !isDisabled &&
                role === STAGE_ROLE.CREATE && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleAddItem()}
                  >
                    <Plus /> {t("addItem")}
                  </Button>
                )
              }
            />
          }
        >
          {/* DataGridContainer เป็น native scroll container อยู่แล้ว (overflow-auto)
            — ไม่ห่อด้วย Radix ScrollArea เพื่อเลี่ยง nested scroll ที่ทำให้ scroll
            แนวนอนสะดุด (เห็นชัดในโหมด edit ที่ตารางกว้าง/หนักกว่า) */}
          <DataGridContainer className="[scrollbar-width:thin] [scrollbar-color:var(--scrollbar-thumb)_transparent]">
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

        {bulkAction && (
          <PrActionDialog
            open={!!bulkAction}
            onOpenChange={(open) => {
              if (!open) setBulkAction(null);
            }}
            onConfirm={handleBulkActionConfirm}
            items={selectedRows.map(
              (row): ActionDialogItem => ({
                index: row.index,
                productName: form.getValues(`items.${row.index}.product_name`),
                locationName: form.getValues(
                  `items.${row.index}.location_name`,
                ),
              }),
            )}
            {...bulkActionDialogConfig[bulkAction]}
            {...(bulkAction === PR_ITEM_STAGE_STATUS.REVIEW
              ? { stages: previousStages, stagesLoading }
              : {})}
          />
        )}

        <AlertDialog
          open={showOverQtyWarning}
          onOpenChange={setShowOverQtyWarning}
        >
          <AlertDialogContent className="gap-0 p-0 sm:max-w-md">
            {" "}
            <div className="p-5">
              <div className="flex items-start gap-3">
                <div className="bg-muted text-warning-ink flex size-9 shrink-0 items-center justify-center rounded-lg">
                  <AlertTriangle className="size-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <AlertDialogTitle className="text-warning-ink text-base">
                    {t("overQtyWarningTitle")}
                  </AlertDialogTitle>
                  <AlertDialogDescription className="mt-1">
                    {t("overQtyWarningDesc")}
                  </AlertDialogDescription>
                </div>
              </div>
            </div>
            <AlertDialogFooter className="border-t px-5 py-3">
              <AlertDialogCancel onClick={handleOverQtyCancel}>
                {tc("cancel")}
              </AlertDialogCancel>
              <AlertDialogAction
                variant="warning"
                size="default"
                onClick={handleOverQtyConfirm}
              >
                <Check />
                {tc("confirm")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Suspense fallback={null}>
          <PrSelectDialog
            open={selectDialogOpen}
            onOpenChange={setSelectDialogOpen}
            allCount={allCount}
            pendingCount={pendingCount}
            onSelectAll={handleSelectAll}
            onSelectPending={handleSelectPending}
          />
        </Suspense>
      </div>
    </PrStageRoleProvider>
  );
}
