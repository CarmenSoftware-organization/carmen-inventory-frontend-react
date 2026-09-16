import { useMemo, useState } from "react";
import { useTranslations } from "use-intl";
import { useQuery } from "@tanstack/react-query";
import {
  type ColumnDef,
  type RowSelectionState,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Building2,
  FileText,
  FilterX,
  ListFilterPlus,
  Loader2,
  UserRound,
  Workflow,
} from "lucide-react";
import {
  DataGrid,
  DataGridContainer,
} from "@/components/ui/data-grid/data-grid";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import { selectColumn } from "@/components/ui/data-grid/columns";
import { Field, FieldLabel } from "@/components/ui/field";
import EmptyComponent from "@/components/empty-component";
import { ListFilter } from "@/components/list-filter/list-filter";
import { Button } from "@/components/ui/button";
import { LookupWorkflow } from "@/components/lookup/lookup-workflow";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
import { usePoRowFilter, type PoFilterField } from "../po-row-filter";

const FILTER_FIELDS: PoFilterField<PurchaseRequest>[] = [
  {
    key: "requestor_id",
    labelKey: "field.requester",
    // ใช้ไอคอนชุดเดียวกับที่ ListFilterMenu ให้ช่องคน/แผนก/ลำดับขั้นอยู่แล้ว
    // สามคีย์นี้ยังไม่มีในตารางของมัน เลยต้องบอกเอง ไม่งั้นได้ไอคอนกลางของ
    // ช่อง custom เหมือนกันหมดทั้งสามช่อง
    icon: UserRound,
    of: (r) => [r.requestor_id, r.requestor_name],
  },
  {
    key: "department_id",
    labelKey: "field.department",
    icon: Building2,
    of: (r) => [r.department_id, r.department_name],
  },
  {
    key: "workflow_id",
    labelKey: "procurement.purchaseOrder.prWorkflow",
    icon: Workflow,
    of: (r) => [r.workflow_id, r.workflow_name],
  },
];

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
  const tc = useTranslations("common");
  const tl = useTranslations("lookup");
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
  const allRows = useMemo(() => data?.data ?? [], [data]);
  const filter = usePoRowFilter(allRows, FILTER_FIELDS);
  // กรองที่ `data` ได้เลย ไม่ต้องผ่าน globalFilter — ตารางนี้ผูก selection กับ
  // `row.id` ไม่ใช่ index ตัดแถวออกแล้วใบที่ติ๊กไว้ก่อนหน้าไม่หลุด (ต่างจาก
  // ตารางสินค้าใน PR ที่ทุก cell ผูกกับ index ของ field array)
  const purchaseRequests = useMemo(
    () => allRows.filter(filter.matches),
    [allRows, filter.matches],
  );

  const canFilter = !!workflowId && !isLoading && allRows.length > 0;

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

  const workflowOf = useMemo(() => {
    const m = new Map<string, { id: string; name: string }>();
    for (const pr of allRows) {
      m.set(pr.id, { id: pr.workflow_id, name: pr.workflow_name });
    }
    return m;
  }, [allRows]);

  const [crossWorkflow, setCrossWorkflow] = useState<{
    next: RowSelectionState;
    workflowId: string;
    workflowName: string;
  } | null>(null);

  const applySelection = (next: RowSelectionState) => {
    const ids = Object.keys(next).filter((id) => next[id]);
    const workflows = new Set(
      ids.map((id) => workflowOf.get(id)?.id).filter(Boolean),
    );
    // ใบที่รวมเป็นใบสั่งซื้อเดียวกันต้องมาจาก workflow เดียวกัน — ปล่อยให้ติ๊ก
    // ข้ามได้แล้วไปตกตอน group คือให้ผู้ใช้เสียเวลาเลือกฟรี ๆ ทั้งหน้า
    if (workflows.size > 1) {
      // ใบที่เพิ่งติ๊กคือเจตนาล่าสุด ใบเก่าที่ workflow ไม่ตรงคือส่วนที่จะถูกทิ้ง
      const added = ids.find((id) => !rowSelection[id]);
      const wf = added ? workflowOf.get(added) : undefined;
      if (added && wf) {
        setCrossWorkflow({
          next: Object.fromEntries(
            ids
              .filter((id) => workflowOf.get(id)?.id === wf.id)
              .map((id) => [id, true]),
          ),
          workflowId: wf.id,
          workflowName: wf.name,
        });
        return;
      }
    }
    onRowSelectionChange(next);
  };

  const table = useReactTable({
    data: purchaseRequests,
    columns,
    state: { rowSelection },
    onRowSelectionChange: (updater) => {
      const next =
        typeof updater === "function" ? updater(rowSelection) : updater;
      applySelection(next);
    },
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    enableRowSelection: true,
  });

  return (
    <div className="space-y-3">
      <Field className="sm:max-w-md">
        <FieldLabel required>{t("workflowLabel")}</FieldLabel>
        <div className="flex items-center gap-2">
          <LookupWorkflow
            value={workflowId}
            onValueChange={onWorkflowChange}
            workflowType={WORKFLOW_TYPE.PO}
            creatableOnly
            disabled={disabled}
            className="w-full text-xs"
          />
          {/* กรองแถวฝั่ง client จากใบที่โหลดมาแล้ว — ไม่มี onSaveClick เพราะ
              saved view ผูกกับหน้า list ไม่ใช่ตารางในหน้านี้ · ปิดไว้จนกว่าจะมี
              ของให้กรองจริง ไม่ซ่อน ปุ่มที่โผล่มาทีหลังจะดันของข้าง ๆ ขยับ */}
          {/* shrink-0 — ช่องเลือกเป็น w-full ปุ่มข้าง ๆ จะโดนบีบจนตัวหนังสือหาย */}
          <div className="shrink-0">
            {/* ยังไม่มีของให้กรอง = ปุ่มหลอกที่กดไม่ได้ ไม่ใช่ไม่มีปุ่ม — ปุ่มที่
                โผล่มาทีหลังจะดันของข้าง ๆ ขยับ และคนที่เคยเห็นก็จะหาไม่เจอ
                (ListFilter ของกลางไม่มีสถานะปิด และไม่ควรไปเพิ่มให้ทุกหน้า list
                แบกเพราะหน้านี้หน้าเดียว) */}
            {canFilter ? (
              <ListFilter
                fields={filter.fields}
                values={filter.values}
                setValue={filter.setValue}
                onClearAll={filter.clearAll}
                activeCount={filter.activeCount}
              />
            ) : (
              <Button size="sm" variant="outline" disabled>
                <ListFilterPlus aria-hidden="true" />
                {tc("filter")}
              </Button>
            )}
          </div>
        </div>
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
            // กรองจนไม่เหลือแถว ≠ ไม่มีใบขอซื้อรอทำใบสั่งซื้อ — ข้อความเดียวกัน
            // จะหลอกให้ถอยออกไปทั้งที่ของอยู่ครบ แค่ถูกซ่อน
            filter.activeCount > 0 ? (
              <EmptyComponent
                icon={FilterX}
                title={tc("noSearchResult")}
                description={tl("noFoundDesc")}
              />
            ) : (
              <EmptyComponent
                icon={FileText}
                title={t("noPr")}
                description={t("noPrDesc")}
              />
            )
          }
        >
          <DataGridContainer scroll className="max-h-[28rem]">
            <DataGridTable />
          </DataGridContainer>
        </DataGrid>
      )}
      <ConfirmDialog
        open={!!crossWorkflow}
        onOpenChange={(open) => {
          if (!open) setCrossWorkflow(null);
        }}
        title={t("crossWorkflowTitle")}
        description={t("crossWorkflowDesc", {
          workflow: crossWorkflow?.workflowName ?? "",
        })}
        confirmText={tc("confirm")}
        onConfirm={() => {
          if (crossWorkflow) onRowSelectionChange(crossWorkflow.next);
          setCrossWorkflow(null);
        }}
      />
    </div>

  );
}
