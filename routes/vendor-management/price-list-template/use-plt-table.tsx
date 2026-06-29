import type { ColumnDef } from "@tanstack/react-table";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useTranslations } from "use-intl";
import { DataGridColumnHeader } from "@/components/ui/data-grid/data-grid-column-header";
import { CellAction } from "@/components/ui/cell-action";
import { Badge } from "@/components/ui/badge";
import {
  selectColumn,
  indexColumn,
  actionColumn,
  columnSkeletons,
} from "@/components/ui/data-grid/columns";
import type { PriceListTemplate } from "@/types/price-list-template";
import type { ParamsDto } from "@/types/params";
import type { useDataGridState } from "@/hooks/use-data-grid-state";

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
        const variantMap: Record<
          string,
          "outline" | "success" | "secondary"
        > = {
          draft: "outline",
          active: "success",
          inactive: "secondary",
        };
        const labelMap: Record<string, string> = {
          draft: ts("draft"),
          active: ts("active"),
          inactive: ts("inactive"),
        };
        return (
          <Badge size="lg" variant={variantMap[status] ?? "outline"}>
            {labelMap[status] ?? status}
          </Badge>
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
    ...tableConfig,
    pageCount: Math.ceil(totalRecords / (Number(params.perpage) || 10)),
  });
}
