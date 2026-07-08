import { useEffect, useState } from "react";
import { useTranslations } from "use-intl";
import { toast } from "sonner";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import {
  type ColumnDef,
  type ExpandedState,
  type RowSelectionState,
  getCoreRowModel,
  getExpandedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DataGrid,
  DataGridContainer,
} from "@/components/ui/data-grid/data-grid";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import { useBuCode } from "@/hooks/use-bu-code";
import { useProfile } from "@/hooks/use-profile";
import { httpClient } from "@/lib/http-client";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import { CACHE_DYNAMIC } from "@/lib/cache-config";
import { formatDate } from "@/lib/date-utils";
import { formatCurrency } from "@/lib/currency-utils";
import { cn } from "@/lib/utils";
import { selectColumn } from "@/components/ui/data-grid/columns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import EmptyComponent from "@/components/empty-component";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  ClipboardCheck,
  FileText,
  Loader2,
  Package,
  Workflow,
} from "lucide-react";
import type { PurchaseRequest } from "@/types/purchase-request";
import type { PaginatedResponse } from "@/types/params";
import type { GroupPrPo, GroupPrProduct } from "@/types/purchase-order";
import { WORKFLOW_TYPE } from "@/types/workflows";
import { LookupWorkflow } from "@/components/lookup/lookup-workflow";

// ---------------------------------------------------------------------------
// Main Dialog
// ---------------------------------------------------------------------------

interface PoFromPrDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

export function PoFromPrDialog({ open, onOpenChange }: PoFromPrDialogProps) {
  const t = useTranslations("procurement.purchaseOrder");
  const tc = useTranslations("common");
  const tt = useTranslations("toast");
  const buCode = useBuCode();
  const { userId, data: profile } = useProfile();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<1 | 2>(1);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [groupedData, setGroupedData] = useState<GroupPrPo[]>([]);
  const [workflowId, setWorkflowId] = useState("");
  const [isGrouping, setIsGrouping] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const isPending = isGrouping || isConfirming;
  const selectedCount = Object.keys(rowSelection).filter(
    (id) => rowSelection[id],
  ).length;

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setStep(1);
      setRowSelection({});
      setGroupedData([]);
      setWorkflowId("");
    }
  }, [open]);

  const handleNext = async () => {
    const prIds = Object.keys(rowSelection).filter((id) => rowSelection[id]);
    if (prIds.length === 0 || !buCode) return;

    setIsGrouping(true);
    try {
      const res = await httpClient.post(
        API_ENDPOINTS.PURCHASE_ORDER_GROUP_PR(buCode),
        { pr_ids: prIds },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || "Failed to group PRs");
      }
      const json = await res.json();
      setGroupedData(json.data.groups);
      setStep(2);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to group PRs");
    } finally {
      setIsGrouping(false);
    }
  };

  const handleBack = () => setStep(1);

  const handleConfirm = async () => {
    const prIds = Object.keys(rowSelection).filter((id) => rowSelection[id]);
    if (prIds.length === 0 || !buCode) return;

    setIsConfirming(true);
    try {
      const buyerName = [
        profile?.user_info.firstname,
        profile?.user_info.lastname,
      ]
        .filter(Boolean)
        .join(" ");
      const res = await httpClient.post(
        API_ENDPOINTS.PURCHASE_ORDER_CONFIRM_PR(buCode),
        {
          workflow_id: workflowId,
          pr_ids: prIds,
          buyer_id: userId,
          buyer_name: buyerName,
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || "Failed to confirm PRs");
      }
      await res.json();
      toast.success(tt("createSuccess", { entity: t("entity") }));
      await queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.PURCHASE_ORDERS],
      });
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to confirm PRs");
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={isPending ? undefined : onOpenChange}>
      <DialogContent className="flex flex-col gap-0 p-0 pt-2 sm:max-w-[70vw]!">
        <div className="space-y-4 px-6 pt-6 pb-4">
          <DialogHeader>
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-base">
                  {step === 1 ? t("selectPr") : t("groupPrTitle")}
                </DialogTitle>
                <DialogDescription className="mt-1">
                  {step === 1 ? t("selectPrDesc") : t("groupPrDesc")}
                </DialogDescription>
              </div>
              {selectedCount > 0 && (
                <Badge
                  size="sm"
                  className="bg-module-procurement mt-0.5 shrink-0 tabular-nums"
                >
                  {t("nSelected", { count: selectedCount })}
                </Badge>
              )}
            </div>
          </DialogHeader>

          <StepIndicator currentStep={step} />

          {step === 1 && (
            <div
              className={cn(
                "flex flex-col gap-1.5 rounded-lg border p-3 transition-colors sm:flex-row sm:items-center sm:gap-3",
                // ยังไม่เลือก workflow → เน้นกล่องให้ user รู้ว่าต้องทำก่อน
                workflowId ? "bg-muted/30" : "border-info/50 bg-info/5",
              )}
            >
              <div className="flex items-center gap-2">
                <Workflow
                  className={cn(
                    "size-4 shrink-0",
                    workflowId ? "text-muted-foreground" : "text-primary",
                  )}
                />
                <div className="flex flex-col">
                  <span className="text-xs font-semibold">
                    {t("workflowLabel")}
                  </span>
                  <span className="text-muted-foreground text-[0.625rem]">
                    {t("workflowHint")}
                  </span>
                </div>
              </div>
              <div className="sm:ml-auto sm:w-64">
                <LookupWorkflow
                  value={workflowId}
                  onValueChange={setWorkflowId}
                  workflowType={WORKFLOW_TYPE.PO}
                  disabled={isGrouping}
                  className="w-full text-xs"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-6 pb-4">
          {step === 1 && (
            <SelectPrStep
              open={open}
              hasWorkflow={!!workflowId}
              rowSelection={rowSelection}
              onRowSelectionChange={setRowSelection}
            />
          )}
          {step === 2 && <ReviewGroupStep data={groupedData} />}
        </div>

        <DialogFooter className="bg-muted/20 items-center border-t px-6 py-3 sm:justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="text-muted-foreground"
          >
            {tc("cancel")}
          </Button>
          <div className="flex gap-2">
            {step === 2 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleBack}
                disabled={isConfirming}
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
                {tc("back")}
              </Button>
            )}
            {step === 1 && (
              <Button
                size="sm"
                disabled={selectedCount === 0 || !workflowId || isGrouping}
                onClick={handleNext}
                className="bg-module-procurement! text-primary-foreground hover:bg-module-procurement/90!"
              >
                {isGrouping ? (
                  <Loader2 className="animate-spin" aria-hidden="true" />
                ) : (
                  <ArrowRight aria-hidden="true" />
                )}
                {tc("next")}
              </Button>
            )}
            {step === 2 && (
              <Button
                size="sm"
                variant="success"
                onClick={handleConfirm}
                disabled={isConfirming}
                className="bg-module-procurement! text-primary-foreground hover:bg-module-procurement/90!"
              >
                {isConfirming ? (
                  <Loader2 className="animate-spin" aria-hidden="true" />
                ) : (
                  <ClipboardCheck aria-hidden="true" />
                )}
                {tc("confirm")}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const StepIndicator = ({ currentStep }: { currentStep: 1 | 2 }) => {
  const t = useTranslations("procurement.purchaseOrder");
  const steps = [
    { step: 1, label: t("stepSelectPr") },
    { step: 2, label: t("stepReviewPo") },
  ];

  return (
    <div className="flex items-center gap-2">
      {steps.map((s, i, arr) => {
        const isCompleted = s.step < currentStep;
        const isCurrent = s.step === currentStep;
        return (
          <div key={s.step} className="flex flex-1 items-center gap-2">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full text-[0.6875rem] font-semibold transition-colors",
                  // module-procurement accent ให้ตรงกับ Stepper ของ from-price-list
                  isCompleted &&
                    "bg-module-procurement text-primary-foreground",
                  isCurrent &&
                    "bg-module-procurement ring-module-procurement/20 text-primary-foreground ring-4",
                  !isCompleted &&
                    !isCurrent &&
                    "bg-muted text-muted-foreground",
                )}
              >
                {isCompleted ? <Check className="size-3" /> : s.step}
              </div>
              <span
                className={cn(
                  "text-[0.625rem] font-semibold whitespace-nowrap",
                  isCurrent && "text-foreground",
                  !isCurrent && "text-muted-foreground",
                )}
              >
                {s.label}
              </span>
            </div>
            {i < arr.length - 1 && (
              <div
                className={cn(
                  "mb-4 h-px flex-1",
                  isCompleted ? "bg-module-procurement" : "bg-border",
                )}
                aria-hidden="true"
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

const SelectPrStep = ({
  open,
  hasWorkflow,
  rowSelection,
  onRowSelectionChange,
}: {
  open: boolean;
  hasWorkflow: boolean;
  rowSelection: RowSelectionState;
  onRowSelectionChange: (s: RowSelectionState) => void;
}) => {
  const t = useTranslations("procurement.purchaseOrder");
  const tfl = useTranslations("field");
  const { dateFormat } = useProfile();
  const buCode = useBuCode();

  const { data, isLoading } = useQuery<PaginatedResponse<PurchaseRequest>>({
    queryKey: [QUERY_KEYS.PURCHASE_REQUESTS_FOR_PO, buCode],
    queryFn: async () => {
      const res = await httpClient.get(
        API_ENDPOINTS.PURCHASE_REQUEST_FOR_PO(buCode!),
      );
      if (!res.ok) throw new Error("Failed to fetch purchase requests for PO");
      return res.json();
    },
    // ดึง PR หลังเลือก workflow แล้วเท่านั้น (workflow-first flow)
    enabled: !!buCode && open && hasWorkflow,
    ...CACHE_DYNAMIC,
  });
  const purchaseRequests = data?.data ?? [];

  const columns: ColumnDef<PurchaseRequest>[] = [
    selectColumn<PurchaseRequest>(),
    {
      accessorKey: "pr_no",
      header: tfl("prNo"),
      size: 150,
    },
    {
      accessorKey: "pr_date",
      header: tfl("date"),
      cell: ({ row }) => formatDate(row.getValue("pr_date"), dateFormat),
      size: 100,
      meta: { cellClassName: "text-center", headerClassName: "text-center" },
    },
    {
      accessorKey: "requestor_name",
      header: tfl("requester"),
    },
    {
      accessorKey: "department_name",
      header: tfl("department"),
      size: 180,
    },
    {
      accessorKey: "workflow_name",
      header: t("prWorkflow"),
      size: 180,
      meta: { cellClassName: "text-center", headerClassName: "text-center" },
    },
    {
      accessorKey: "description",
      header: tfl("description"),
      size: 120,
    },
  ];

  const table = useReactTable({
    data: purchaseRequests,
    columns,
    state: { rowSelection },
    onRowSelectionChange: (updater) => {
      const next =
        typeof updater === "function" ? updater(rowSelection) : updater;
      onRowSelectionChange(next);
    },
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    enableRowSelection: true,
  });

  // workflow-first: ยังไม่เลือก workflow → แนะนำให้เลือกก่อน แทนที่จะโชว์ตาราง
  if (!hasWorkflow) {
    return (
      <div className="rounded-lg border border-dashed py-10">
        <EmptyComponent
          icon={Workflow}
          title={t("selectWorkflowFirst")}
          description={t("selectWorkflowFirstDesc")}
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    );
  }

  return (
    <DataGrid
      table={table}
      recordCount={purchaseRequests.length}
      tableLayout={{ checkbox: true, headerSticky: true, rowBorder: true }}
      tableClassNames={{ headerRow: "h-11", bodyRow: "h-11" }}
      emptyMessage={
        <EmptyComponent
          icon={FileText}
          title={t("noPr")}
          description={t("noPrDesc")}
        />
      }
    >
      <DataGridContainer>
        <DataGridTable />
      </DataGridContainer>
    </DataGrid>
  );
};

const ReviewGroupStep = ({ data }: { data: GroupPrPo[] }) => {
  const t = useTranslations("procurement.purchaseOrder");
  const tfl = useTranslations("field");
  const { dateFormat } = useProfile();
  const [expanded, setExpanded] = useState<ExpandedState>({});

  const columns: ColumnDef<GroupPrPo>[] = [
    {
      id: "expander",
      size: 32,
      header: () => null,
      cell: ({ row }) => (
        <button
          type="button"
          onClick={row.getToggleExpandedHandler()}
          aria-label={row.getIsExpanded() ? "Collapse" : "Expand"}
          className="flex items-center justify-center"
        >
          <ChevronRight
            className={`text-muted-foreground size-4 transition-transform ${row.getIsExpanded() ? "rotate-90" : ""}`}
          />
        </button>
      ),
      meta: {
        expandedContent: (po: GroupPrPo) => (
          <ExpandedProducts
            products={po.products}
            currencyCode={po.currency_code}
          />
        ),
      },
    },
    {
      accessorKey: "po_no",
      header: tfl("poNo"),
    },
    {
      accessorKey: "vendor_name",
      header: tfl("vendor"),
    },
    {
      accessorKey: "pr",
      header: t("prRef"),
    },
    {
      accessorKey: "delivery_date",
      header: tfl("deliveryDate"),
      cell: ({ row }) => formatDate(row.getValue("delivery_date"), dateFormat),
      meta: { cellClassName: "text-center", headerClassName: "text-center" },
    },
    {
      accessorKey: "total_price",
      header: tfl("total"),
      cell: ({ row }) => {
        const amount = row.getValue<number>("total_price");
        const currency = row.original.currency_code;
        if (amount == null) return <span></span>;
        return (
          <span className="font-medium tabular-nums">
            {formatCurrency(amount)}
            {currency && (
              <span className="text-muted-foreground ms-1 text-xs font-normal">
                {currency}
              </span>
            )}
          </span>
        );
      },
      meta: { cellClassName: "text-right", headerClassName: "text-right" },
    },
  ];

  const table = useReactTable({
    data,
    columns,
    state: { expanded },
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: () => true,
  });

  return (
    <DataGrid
      table={table}
      recordCount={data.length}
      tableLayout={{ checkbox: true, headerSticky: true, rowBorder: true }}
    >
      <DataGridContainer>
        <DataGridTable />
      </DataGridContainer>
    </DataGrid>
  );
};

const ExpandedProducts = ({
  products,
  currencyCode,
}: {
  products: GroupPrProduct[];
  currencyCode: string;
}) => {
  const tfl = useTranslations("field");

  return (
    <div className="max-w-2xl py-2 pl-16">
      <table className="w-full table-fixed text-xs">
        <thead>
          <tr className="bg-muted/40 text-muted-foreground border-b text-left text-xs font-semibold">
            <th scope="col" className="px-2 py-1 font-semibold">
              {tfl("product")}
            </th>
            <th scope="col" className="w-16 px-2 py-1 text-right font-semibold">
              {tfl("quantity")}
            </th>
            <th scope="col" className="w-28 px-2 py-1 text-right font-semibold">
              {tfl("price")} ({currencyCode})
            </th>
            <th scope="col" className="w-28 px-2 py-1 text-right font-semibold">
              {tfl("total")} ({currencyCode})
            </th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.product_id} className="border-b last:border-0">
              <td className="px-2 py-1">
                <div className="flex min-w-0 items-center gap-1.5">
                  <Package
                    className="text-muted-foreground size-3 shrink-0"
                    aria-hidden="true"
                  />
                  <span className="truncate">{p.product_name}</span>
                </div>
              </td>
              <td className="px-2 py-1 text-right tabular-nums">{p.qty}</td>
              <td className="text-muted-foreground px-2 py-1 text-right tabular-nums">
                {formatCurrency(p.price_per_unit)}
              </td>
              <td className="text-foreground px-2 py-1 text-right font-medium tabular-nums">
                {formatCurrency(p.total)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
