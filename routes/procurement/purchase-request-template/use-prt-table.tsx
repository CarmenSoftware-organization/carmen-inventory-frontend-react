import { useTranslations } from "use-intl";
import type { ColumnDef } from "@tanstack/react-table";
import { DataGridColumnHeader } from "@/components/ui/data-grid/data-grid-column-header";
import { CellAction } from "@/components/ui/cell-action";
import { useConfigTable } from "@/components/ui/data-grid/use-config-table";
import type { PurchaseRequestTemplate } from "@/types/purchase-request";
import type { ParamsDto } from "@/types/params";
import type { useDataGridState } from "@/hooks/use-data-grid-state";
import {
  auditColumns,
  columnSkeletons,
  statusColumn,
} from "@/components/ui/data-grid/columns";
import { useProfile } from "@/hooks/use-profile";

interface UsePrtTableOptions {
  templates: PurchaseRequestTemplate[];
  totalRecords: number;
  params: ParamsDto;
  tableConfig: ReturnType<typeof useDataGridState>["tableConfig"];
  onEdit: (template: PurchaseRequestTemplate) => void;
  onDelete: (template: PurchaseRequestTemplate) => void;
}

export function usePrtTable({
  templates,
  totalRecords,
  params,
  tableConfig,
  onEdit,
  onDelete,
}: UsePrtTableOptions) {
  const tfl = useTranslations("field");
  const { dateTimeFormat } = useProfile();

  const columns: ColumnDef<PurchaseRequestTemplate>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("name")} />
      ),
      cell: ({ row }) => (
        <CellAction onClick={() => onEdit(row.original)}>
          {row.original.name || "..."}
        </CellAction>
      ),
      meta: { headerTitle: tfl("name") },
    },
    {
      accessorKey: "workflow_name",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("workflow")} />
      ),
      meta: {
        headerTitle: tfl("workflow"),
        skeleton: columnSkeletons.text,
      },
    },
    {
      accessorKey: "description",
      header: tfl("description"),
      meta: {
        headerTitle: tfl("description"),
        skeleton: columnSkeletons.text,
      },
    },
    // status column แทรกเองก่อน created/updated (useConfigTable ส่ง hideStatus)
    statusColumn<PurchaseRequestTemplate>(),
    ...auditColumns<PurchaseRequestTemplate>(tfl, dateTimeFormat),
  ];

  return useConfigTable<PurchaseRequestTemplate>({
    data: templates,
    columns,
    totalRecords,
    params,
    tableConfig,
    onDelete,
    hideStatus: true,
    // คอลัมน์ audit ซ่อนเป็น default (เปิดได้จากเมนู Toggle Columns)
    initialState: { columnVisibility: { created_at: false, updated_at: false } },
    activity: { id: (r) => r.id, label: (r) => r.name },
  });
}
