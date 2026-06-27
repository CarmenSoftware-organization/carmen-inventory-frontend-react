// Opt out of React Compiler memoization — useFieldArray + dynamic setValue calls
// cause stale closure issues when auto-memoized.
"use no memo";

import { useState } from "react";
import { useFieldArray, useWatch, type UseFormReturn } from "react-hook-form";
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
import { httpClient } from "@/lib/http-client";
import { buildUrl } from "@/utils/build-query-string";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
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
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
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
import { PR_ITEM, computePrItemAmounts } from "./pr-form-schema";
import { getDeleteDescription } from "@/lib/form-utils";
import {
  PR_ITEM_PRICELIST_COMPARE_TYPE,
  PR_ITEM_STAGE_STATUS,
} from "@/types/purchase-request";
import { formatDate } from "@/lib/date-utils";
import { scrollToFirstInvalidField } from "@/lib/form-helpers";
import { PrAskAiMenu } from "./ai/pr-ask-ai-menu";

/**
 * คำนวณ + set ยอด derive ของ item (discount/tax/net/total) ตอน auto-allocate
 * เพราะ pr-item-expand (ที่ปกติ sync ยอดให้) mount เฉพาะตอน item ถูกขยาย —
 * collapsed row จะไม่ recompute ถ้าไม่ทำตรงนี้
 */
function applyDerivedAmounts(
  form: UseFormReturn<PrFormValues>,
  index: number,
  item: PrFormValues["items"][number],
  price: number,
  taxRate: number,
) {
  const approvedQty = Number(item.approved_qty) || 0;
  const qty = approvedQty > 0 ? approvedQty : Number(item.requested_qty) || 0;
  const isDiscAdj = item.is_discount_adjustment ?? false;
  const isTaxAdj = item.is_tax_adjustment ?? false;
  const amounts = computePrItemAmounts({
    price,
    qty,
    discRate: Number(item.discount_rate) || 0,
    isDiscAdj,
    discAmt: Number(item.discount_amount) || 0,
    taxRate,
    isTaxAdj,
    taxAmt: Number(item.tax_amount) || 0,
  });
  if (!isDiscAdj) {
    form.setValue(`items.${index}.discount_amount`, amounts.discountAmount);
  }
  if (!isTaxAdj) {
    form.setValue(`items.${index}.tax_amount`, amounts.taxAmount);
  }
  form.setValue(`items.${index}.net_amount`, amounts.netAmount);
  form.setValue(`items.${index}.total_price`, amounts.totalPrice);
}

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
  const tfl = useTranslations("field");
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
    const items = form.getValues("items");
    if (items.length === 0 || !buCode) return;
    const bu_code = buCode;

    setIsAllocating(true);
    const toastId = toast.loading(t("allocating", { count: items.length }));
    let allocated = 0;

    const results = await Promise.allSettled(
      items.map(async (item, index) => {
        if (!item.product_id || !item.requested_unit_id || !item.currency_id)
          return;

        const url = buildUrl(API_ENDPOINTS.PRICE_LIST_COMPARE(bu_code), {
          product_id: item.product_id,
          unit_id: item.requested_unit_id,
          at_date: formatDate(item.delivery_date, "yyyy-MM-dd"),
          currency_id: item.currency_id,
        });

        const res = await httpClient.get(url);
        if (!res.ok) throw new Error("fetch failed");

        const json = await res.json();
        const selected = json.data?.selected;
        if (!selected) {
          form.setValue(`items.${index}.vendor_id`, null);
          form.setValue(`items.${index}.vendor_name`, "");
          form.setValue(`items.${index}.pricelist_price`, 0);
          form.setValue(`items.${index}.pricelist_type`, null);
          form.setValue(`items.${index}.pricelist_detail_id`, null);
          form.setValue(`items.${index}.pricelist_no`, null);
          // ไม่มีราคา → ยอด derive กลับเป็น 0 (tax_rate คงเดิม)
          applyDerivedAmounts(form, index, item, 0, Number(item.tax_rate) || 0);
          return;
        }

        form.setValue(`items.${index}.vendor_id`, selected.vendor_id);
        form.setValue(`items.${index}.vendor_name`, selected.vendor_name);
        form.setValue(`items.${index}.pricelist_price`, selected.price);

        form.setValue(
          `items.${index}.pricelist_type`,
          PR_ITEM_PRICELIST_COMPARE_TYPE.AUTOMATIC,
        );
        form.setValue(
          `items.${index}.pricelist_detail_id`,
          selected.pricelist_detail_id,
        );
        form.setValue(`items.${index}.pricelist_no`, selected.pricelist_no);
        form.setValue(`items.${index}.exchange_rate`, selected.exchange_rate);
        form.setValue(`items.${index}.tax_profile_id`, selected.tax_profile_id);
        form.setValue(
          `items.${index}.tax_profile_name`,
          selected.tax_profile_name,
        );
        form.setValue(`items.${index}.tax_rate`, selected.tax_rate);
        // คำนวณ tax_amount/net/total ทันที (collapsed row ไม่มี pr-item-expand sync ให้)
        applyDerivedAmounts(
          form,
          index,
          item,
          selected.price,
          Number(selected.tax_rate) || 0,
        );
        allocated++;
      }),
    );

    toast.dismiss(toastId);
    const failed = results.filter((r) => r.status === "rejected").length;
    if (allocated > 0) {
      toast.success(t("allocated", { allocated, total: items.length }));
    }
    if (failed > 0) {
      toast.error(t("allocateFailed", { count: failed }));
    }
    if (allocated === 0 && failed === 0) {
      toast.warning(t("noPriceListFound"));
    }

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
    if (await guardSelectedItemErrors()) return;
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
    if (await guardSelectedItemErrors()) return;
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
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="border-b pb-2 text-sm font-semibold">{tfl("items")}</h2>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-end gap-1.5">
            <PrAskAiMenu
              items={selectedRows.map((row) => {
                const item = form.getValues(`items.${row.index}`);
                return {
                  productName: item.product_name,
                  productLocalName: item.product_local_name,
                  locationName: item.location_name,
                };
              })}
              disabled={selectedRows.length === 0}
            />
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
              <Button
                type="button"
                size="xs"
                disabled={!canAddItem}
                title={!canAddItem ? t("selectWorkflowFirst") : undefined}
                onClick={() => handleAddItem()}
              >
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
          {selectedRows.length > 0 && canBulkAction && (
            <div className="flex items-center gap-1.5">
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
            </div>
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
                  size="xs"
                  disabled={!canAddItem}
                  title={!canAddItem ? t("selectWorkflowFirst") : undefined}
                  onClick={() => handleAddItem()}
                >
                  <Plus /> {t("addItem")}
                </Button>
              )
            }
          />
        }
      >
        <ScrollArea className="w-full pb-2">
          <DataGridContainer>
            <DataGridTable />
          </DataGridContainer>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </DataGrid>

      {/* {!isAdd && itemFields.length > 0 && prStatus && prStatus !== "draft" && (
        <GrandTotal
          control={form.control}
          itemCount={itemFields.length}
          currencyCode={defaultBu?.config?.default_currency?.code ?? ""}
        />
      )} */}

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
              locationName: form.getValues(`items.${row.index}.location_name`),
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
              <div className="bg-warning/10 text-warning flex size-9 shrink-0 items-center justify-center rounded-lg">
                <AlertTriangle className="size-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <AlertDialogTitle className="text-warning text-base">
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
  );
}
