import type { ColumnDef } from "@tanstack/react-table";
import { useTranslations } from "use-intl";
import { DataGridColumnHeader } from "@/components/ui/data-grid/data-grid-column-header";
import { CellAction } from "@/components/ui/cell-action";
import { useConfigTable } from "@/components/ui/data-grid/use-config-table";
import { columnSkeletons } from "@/components/ui/data-grid/columns";
import { CircleCheck, CircleX } from "lucide-react";
import type { Location } from "@/types/location";
import type { ParamsDto } from "@/types/params";
import type { useDataGridState } from "@/hooks/use-data-grid-state";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { INVENTORY_TYPE } from "@/constant/location";

const LOCATION_TYPE_VARIANT: Record<INVENTORY_TYPE, BadgeProps["variant"]> = {
  [INVENTORY_TYPE.INVENTORY]: "info",
  [INVENTORY_TYPE.DIRECT]: "success",
  [INVENTORY_TYPE.CONSIGNMENT]: "warning",
};

interface UseLocationTableOptions {
  data: Location[];
  totalRecords: number;
  params: ParamsDto;
  tableConfig: ReturnType<typeof useDataGridState>["tableConfig"];
  onEdit: (location: Location) => void;
  onDelete: (location: Location) => void;
}

/**
 * Hook สำหรับสร้าง TanStack Table สำหรับ Location พร้อมคอลัมน์ code, name, type, physical count, delivery point
 *
 * ใช้ภายใน `LocationComponent` โดยส่งผ่าน prop `useTable` ของ
 * `ConfigListTemplate`
 *
 * @param options - data, totalRecords, params, tableConfig, onEdit, onDelete
 * @returns TanStack table instance
 * @example
 * ```tsx
 * <ConfigListTemplate useTable={useLocationTable} ... />
 * ```
 */
export function useLocationTable({
  data,
  totalRecords,
  params,
  tableConfig,
  onEdit,
  onDelete,
}: UseLocationTableOptions) {
  const tfl = useTranslations("field");
  const columns: ColumnDef<Location>[] = [
    {
      accessorKey: "code",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("code")} />
      ),
      cell: ({ row }) => (
        <CellAction onClick={() => onEdit(row.original)}>
          {row.original.code}
        </CellAction>
      ),
      size: 100,
      meta: { headerTitle: tfl("code"), skeleton: columnSkeletons.textShort },
    },
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
      meta: { headerTitle: tfl("name"), skeleton: columnSkeletons.text },
    },

    {
      accessorKey: "location_type",
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title={tfl("locationType")}
          className="justify-center"
        />
      ),
      cell: ({ row }) => (
        <Badge
          variant={LOCATION_TYPE_VARIANT[row.original.location_type]}
          size="lg"
        >
          {row.original.location_type.toUpperCase()}
        </Badge>
      ),
      size: 120,
      meta: {
        headerTitle: tfl("locationType"),
        cellClassName: "text-center",
        skeleton: columnSkeletons.badge,
      },
    },
    {
      id: "physical_count_type",
      header: tfl("physicalCount"),
      cell: ({ row }) =>
        row.original.physical_count_type === "yes" ? (
          <CircleCheck
            className="mx-auto size-4 text-green-600 dark:text-green-500"
            aria-label="Yes"
          />
        ) : (
          <CircleX
            className="text-muted-foreground/50 mx-auto size-4"
            aria-label="No"
          />
        ),
      size: 150,
      meta: {
        headerTitle: tfl("physicalCount"),
        cellClassName: "text-center",
        headerClassName: "text-center",
        skeleton: columnSkeletons.checkbox,
      },
    },
    {
      id: "delivery_point",
      header: tfl("deliveryPoint"),
      cell: ({ row }) => (
        <span>{row.original.delivery_point?.name ?? "-"}</span>
      ),
      size: 150,
      meta: { headerTitle: tfl("deliveryPoint"), skeleton: columnSkeletons.text },
    },
  ];

  return useConfigTable<Location>({
    data,
    columns,
    totalRecords,
    params,
    tableConfig,
    onDelete,
  });
}
