import { useMemo } from "react";
import { useTranslations } from "use-intl";
import { useQuery } from "@tanstack/react-query";
import {
  type ColumnDef,
  type RowSelectionState,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { FileText, Loader2, Workflow } from "lucide-react";
import {
  DataGrid,
  DataGridContainer,
} from "@/components/ui/data-grid/data-grid";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import { selectColumn } from "@/components/ui/data-grid/columns";
import { Field, FieldLabel } from "@/components/ui/field";
import EmptyComponent from "@/components/empty-component";
import { LookupWorkflow } from "@/components/lookup/lookup-workflow";
import { useBuCode } from "@/hooks/use-bu-code";
import { useProfile } from "@/hooks/use-profile";
import { httpClient } from "@/lib/http-client";
import { formatDate } from "@/lib/date-utils";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import { CACHE_DYNAMIC } from "@/lib/cache-config";
import { WORKFLOW_TYPE } from "@/types/workflows";
import type { PurchaseRequest } from "@/types/purchase-request";
import type { PaginatedResponse } from "@/types/params";

interface StepSelectPrProps {
  readonly workflowId: string;
  readonly onWorkflowChange: (id: string) => void;
  readonly rowSelection: RowSelectionState;
  readonly onRowSelectionChange: (next: RowSelectionState) => void;
  readonly disabled: boolean;
}

/**
 * เลือกใบขอซื้อที่จะรวมเป็นใบสั่งซื้อ
 *
 * **เลือกลำดับขั้นอนุมัติก่อน** แล้วรายการใบขอซื้อถึงจะโหลด — ใบสั่งซื้อที่ได้จะ
 * เดินตาม workflow นั้น เลือกทีหลังเท่ากับต้องกลับมาเลือกใบใหม่ทั้งหมด
 */
export function StepSelectPr({
  workflowId,
  onWorkflowChange,
  rowSelection,
  onRowSelectionChange,
  disabled,
}: StepSelectPrProps) {
  "use no memo";
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
    enabled: !!buCode && !!workflowId,
    ...CACHE_DYNAMIC,
  });

  // TanStack ต้องได้ reference ที่นิ่ง — `data?.data ?? []` สร้าง array ใหม่ทุก
  // render แล้ว useReactTable จะ sync state ไม่จบ (เจอจริงที่ vendor-certificate-section
  // หลังเซฟ vendor สำเร็จ วนไป 245,156 รอบ)
  const purchaseRequests = useMemo(() => data?.data ?? [], [data]);

  const columns = useMemo<ColumnDef<PurchaseRequest>[]>(
    () => [
      selectColumn<PurchaseRequest>(),
      { accessorKey: "pr_no", header: tfl("prNo"), size: 150 },
      {
        accessorKey: "pr_date",
        header: tfl("date"),
        cell: ({ row }) => formatDate(row.getValue("pr_date"), dateFormat),
        size: 100,
        meta: { cellClassName: "text-center", headerClassName: "text-center" },
      },
      { accessorKey: "requestor_name", header: tfl("requester") },
      { accessorKey: "department_name", header: tfl("department"), size: 180 },
      {
        accessorKey: "workflow_name",
        header: t("prWorkflow"),
        size: 180,
        meta: { cellClassName: "text-center", headerClassName: "text-center" },
      },
      { accessorKey: "description", header: tfl("description"), size: 120 },
    ],
    [t, tfl, dateFormat],
  );

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

  return (
    <div className="space-y-3">
      <Field className="sm:max-w-sm">
        <FieldLabel required>{t("workflowLabel")}</FieldLabel>
        <LookupWorkflow
          value={workflowId}
          onValueChange={onWorkflowChange}
          workflowType={WORKFLOW_TYPE.PO}
          creatableOnly
          disabled={disabled}
          className="w-full text-xs"
        />
        <p className="text-muted-foreground text-micro">{t("workflowHint")}</p>
      </Field>

      {!workflowId ? (
        <div className="rounded-lg border border-dashed py-10">
          <EmptyComponent
            icon={Workflow}
            title={t("selectWorkflowFirst")}
            description={t("selectWorkflowFirstDesc")}
          />
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="text-muted-foreground size-6 animate-spin" />
        </div>
      ) : (
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
          <DataGridContainer scroll className="max-h-[28rem]">
            <DataGridTable />
          </DataGridContainer>
        </DataGrid>
      )}
    </div>
  );
}
