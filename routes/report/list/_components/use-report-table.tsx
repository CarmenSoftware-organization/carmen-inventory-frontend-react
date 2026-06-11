import { useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  type ColumnDef,
} from "@tanstack/react-table";
import { useTranslations } from "use-intl";
import { DataGridColumnHeader } from "@/components/ui/data-grid/data-grid-column-header";
import { columnSkeletons } from "@/components/ui/data-grid/columns";
import type { useDataGridState } from "@/hooks/use-data-grid-state";
import type { Report } from "@/types/report";

interface UseReportTableOptions {
  reports: Report[];
  onSelect?: (report: Report) => void;
  /** จาก `useDataGridState().tableConfig` — รองรับ sort/page state */
  tableConfig?: ReturnType<typeof useDataGridState>["tableConfig"];
  /** จำนวนหน้าทั้งหมด สำหรับ DataGridPagination */
  pageCount?: number;
}

/**
 * Hook สร้างตารางรายงาน (TanStack Table) พร้อมคอลัมน์มาตรฐาน
 *
 * @param options - reports และ callback เมื่อเลือกแถว
 * @returns instance ของ React Table
 * @example
 * ```tsx
 * const table = useReportTable({
 *   reports,
 *   onSelect: (report) => setSelected(report),
 * });
 * ```
 */
export function useReportTable({
  reports,
  onSelect,
  tableConfig,
  pageCount,
}: UseReportTableOptions) {
  "use no memo";
  const tfl = useTranslations("field");
  const columns: ColumnDef<Report>[] = useMemo(
    () => [
      {
        id: "index",
        header: "#",
        size: 50,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">{row.index + 1}</span>
        ),
        meta: { skeleton: columnSkeletons.number },
      },
      {
        accessorKey: "ReportName",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={tfl("name")} />
        ),
        cell: ({ row }) => (
          <button
            type="button"
            className="text-left text-xs font-medium text-blue-600 hover:underline focus-visible:outline-none dark:text-blue-400"
            onClick={(e) => {
              (e.currentTarget as HTMLButtonElement).blur();
              onSelect?.(row.original);
            }}
          >
            {row.original.ReportName}
          </button>
        ),
        meta: { headerTitle: tfl("name"), skeleton: columnSkeletons.text },
      },
      {
        accessorKey: "ReportGroup",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={tfl("type")} />
        ),
        cell: ({ row }) => (
          <span className="text-xs">{row.getValue("ReportGroup")}</span>
        ),
        meta: { headerTitle: tfl("type"), skeleton: columnSkeletons.textShort },
      },
    ],
    [tfl, onSelect],
  );

  return useReactTable({
    data: reports,
    columns,
    getCoreRowModel: getCoreRowModel(),
    ...tableConfig,
    pageCount,
  });
}
