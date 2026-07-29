import type { ColumnDef } from "@tanstack/react-table";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useTranslations } from "use-intl";
import { DataGridColumnHeader } from "@/components/ui/data-grid/data-grid-column-header";
import { CellAction } from "@/components/ui/cell-action";
import { StatusDotBadge } from "@/components/ui/status-dot-badge";
import { PL_STATUS_TONE } from "@/constant/price-list";
import {
  selectColumn,
  indexColumn,
  actionColumn,
  columnSkeletons,
} from "@/components/ui/data-grid/columns";
import type { PriceListTemplate } from "@/types/price-list-template";
import type { ParamsDto } from "@/types/params";
import type { useDataGridState } from "@/hooks/use-data-grid-state";
import { useProfile } from "@/hooks/use-profile";
import { AuditCell } from "@/components/share/audit-cell";

interface UsePriceListTemplateTableOptions {
  templates: PriceListTemplate[];
  totalRecords: number;
  params: ParamsDto;
  tableConfig: ReturnType<typeof useDataGridState>["tableConfig"];
  onEdit: (template: PriceListTemplate) => void;
  onDelete: (template: PriceListTemplate) => void;
}

/**
 * Hook สร้างตาราง price list template list พร้อม column และ config สำหรับ DataGrid
 * @param props - templates, total, params, tableConfig และ callbacks สำหรับ edit/delete
 * @returns react-table instance
 * @example
 * const { table } = usePriceListTemplateTable({ templates, totalRecords, params, tableConfig, onEdit, onDelete });
 */
export function usePriceListTemplateTable({
  templates,
  totalRecords,
  params,
  tableConfig,
  onEdit,
  onDelete,
}: UsePriceListTemplateTableOptions) {
  "use no memo";
  const { dateTimeFormat } = useProfile();
  const t = useTranslations("vendorManagement.priceListTemplate");
  const tfl = useTranslations("field");
  const ts = useTranslations("status");

  const dataColumns: ColumnDef<PriceListTemplate>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("name")} />
      ),
      cell: ({ row }) => (
        <CellAction onClick={() => onEdit(row.original)}>
          {row.getValue("name") || "..."}
        </CellAction>
      ),
      meta: { headerTitle: tfl("name"), skeleton: columnSkeletons.text },
    },
    {
      id: "currency_code",
      accessorFn: (row) => row.currency?.code ?? "",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("currency")} />
      ),
      enableSorting: false,
      meta: {
        headerTitle: tfl("currency"),
        skeleton: columnSkeletons.textShort,
      },
    },
    {
      accessorKey: "validity_period",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("validityPeriod")} />
      ),
      cell: ({ row }) => {
        const val = row.getValue<number | null>("validity_period");
        return val === null ? "—" : t("validityDays", { count: val });
      },
      enableSorting: false,
      meta: {
        headerTitle: tfl("validityPeriod"),
        skeleton: columnSkeletons.textShort,
      },
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title={tfl("status")}
          className="justify-center"
        />
      ),
      cell: ({ row }) => {
        const status = row.getValue<string>("status");
        const labelMap: Record<string, string> = {
          draft: ts("draft"),
          active: ts("active"),
          inactive: ts("inactive"),
        };
        return (
          <StatusDotBadge
            size="lg"
            tone={PL_STATUS_TONE[status] ?? "neutral"}
          >
            {labelMap[status] ?? status}
          </StatusDotBadge>
        );
      },
      size: 100,
      enableSorting: false,
      meta: {
        headerTitle: tfl("status"),
        cellClassName: "text-center",
        headerClassName: "text-center",
        skeleton: columnSkeletons.badge,
      },
    },
    {
      id: "created_at",
      accessorFn: (row) => row.audit?.created?.at ?? "",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("created")} />
      ),
      cell: ({ row }) => (
        <AuditCell
          entry={row.original.audit?.created}
          dateTimeFormat={dateTimeFormat}
        />
      ),
      size: 160,
      meta: { headerTitle: tfl("created"), skeleton: columnSkeletons.text },
    },
    {
      id: "updated_at",
      accessorFn: (row) => row.audit?.updated?.at ?? "",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("updated")} />
      ),
      cell: ({ row }) => (
        <AuditCell
          entry={row.original.audit?.updated}
          dateTimeFormat={dateTimeFormat}
        />
      ),
      size: 160,
      meta: { headerTitle: tfl("updated"), skeleton: columnSkeletons.text },
    },
  ];

  const allColumns: ColumnDef<PriceListTemplate>[] = [
    selectColumn<PriceListTemplate>(),
    indexColumn<PriceListTemplate>(params),
    ...dataColumns,
    actionColumn<PriceListTemplate>(onDelete),
  ];

  return useReactTable({
    data: templates,
    columns: allColumns,
    getCoreRowModel: getCoreRowModel(),
    // คอลัมน์ audit ซ่อนเป็น default (เปิดได้จากเมนู Toggle Columns)
    initialState: { columnVisibility: { created_at: false, updated_at: false } },
    ...tableConfig,
    pageCount: Math.ceil(totalRecords / (Number(params.perpage) || 10)),
  });
}
