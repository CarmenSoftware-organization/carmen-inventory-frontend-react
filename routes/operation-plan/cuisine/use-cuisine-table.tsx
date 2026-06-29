import type { ColumnDef } from "@tanstack/react-table";
import { useTranslations } from "use-intl";
import { DataGridColumnHeader } from "@/components/ui/data-grid/data-grid-column-header";
import { CellAction } from "@/components/ui/cell-action";
import { Badge } from "@/components/ui/badge";
import { useConfigTable } from "@/components/ui/data-grid/use-config-table";
import type { Cuisine } from "@/types/cuisine";
import type { ParamsDto } from "@/types/params";
import type { useDataGridState } from "@/hooks/use-data-grid-state";
import {
  CUISINE_REGION_CONFIG,
  CUISINE_REGION_LABEL_KEY,
} from "@/constant/cuisine";

interface UseCuisineTableOptions {
  cuisines: Cuisine[];
  totalRecords: number;
  params: ParamsDto;
  tableConfig: ReturnType<typeof useDataGridState>["tableConfig"];
  onEdit: (cuisine: Cuisine) => void;
  onDelete: (cuisine: Cuisine) => void;
}

/**
 * Hook สร้างคอลัมน์และ instance ของตาราง cuisine สำหรับ DataGrid
 * @param options - ข้อมูล cuisines, params และ callbacks
 * @returns table instance พร้อมใช้งานกับ DataGrid
 * @example
 * const table = useCuisineTable({ cuisines, totalRecords, params, tableConfig, onEdit, onDelete });
 * return <DataGrid table={table} />;
 */
export function useCuisineTable({
  cuisines,
  totalRecords,
  params,
  tableConfig,
  onEdit,
  onDelete,
}: UseCuisineTableOptions) {
  const tfl = useTranslations("field");
  const t = useTranslations("operationPlan.cuisine");

  const columns: ColumnDef<Cuisine>[] = [
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
      meta: { headerTitle: tfl("name") },
    },
    {
      accessorKey: "region",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("region")} className="justify-center" />
      ),
      cell: ({ row }) => {
        const region = row.getValue("region") as string;
        const config = CUISINE_REGION_CONFIG[region];
        return config ? (
          <Badge size="sm" className={config.className}>
            {t(CUISINE_REGION_LABEL_KEY[region])}
          </Badge>
        ) : (
          region
        );
      },
      size: 150,
      meta: { headerTitle: tfl("region"), cellClassName: "text-center" },
    },
  ];

  return useConfigTable<Cuisine>({
    data: cuisines,
    columns,
    totalRecords,
    params,
    tableConfig,
    onDelete,
  });
}
