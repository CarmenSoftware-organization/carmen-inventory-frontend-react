import type { ColumnDef } from "@tanstack/react-table";
import { useTranslations } from "use-intl";
import { DataGridColumnHeader } from "@/components/ui/data-grid/data-grid-column-header";
import { CellAction } from "@/components/ui/cell-action";
import { useConfigTable } from "@/components/ui/data-grid/use-config-table";
import {
  auditColumns,
  columnSkeletons,
  statusColumn,
} from "@/components/ui/data-grid/columns";
import type { ChartOfAccount } from "@/types/chart-of-account";
import type { ParamsDto } from "@/types/params";
import type { useDataGridState } from "@/hooks/use-data-grid-state";
import { useProfile } from "@/hooks/use-profile";

interface UseCoaTableOptions {
  data: ChartOfAccount[];
  totalRecords: number;
  params: ParamsDto;
  tableConfig: ReturnType<typeof useDataGridState>["tableConfig"];
  onEdit: (item: ChartOfAccount) => void;
  onDelete: (item: ChartOfAccount) => void;
}

/**
 * ตารางรหัสบัญชี — รหัส · ชื่อบัญชี (สองบรรทัด) · ด้านบัญชี · ประเภท · สถานะ
 *
 * @param options - data, totalRecords, params, tableConfig, onEdit, onDelete
 * @returns TanStack table instance
 * @example
 * // route: /config/chart-of-account
 * const { table } = useCoaTable({ data, ... });
 */
export function useCoaTable({
  data,
  totalRecords,
  params,
  tableConfig,
  onEdit,
  onDelete,
}: UseCoaTableOptions) {
  const t = useTranslations("config.chartOfAccount");
  const tfl = useTranslations("field");
  const { dateTimeFormat } = useProfile();

  const columns: ColumnDef<ChartOfAccount>[] = [
    {
      accessorKey: "code",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("code")} />
      ),
      cell: ({ row }) => (
        <CellAction onClick={() => onEdit(row.original)}>
          {row.getValue("code") || "..."}
        </CellAction>
      ),
      size: 80,
      meta: { headerTitle: tfl("code"), skeleton: columnSkeletons.textShort },
    },
    {
      accessorKey: "description_1",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={t("accountName")} />
      ),
      size: 140,
      meta: { headerTitle: t("accountName"), skeleton: columnSkeletons.text },
    },
    {
      accessorKey: "description_2",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("description")} />
      ),
      meta: {
        headerTitle: tfl("description"),
        skeleton: columnSkeletons.text,
      },
    },
    {
      accessorKey: "nature",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("nature")} />
      ),
      cell: ({ row }) => t(`nature.${row.original.nature}`),
      size: 110,
      meta: { headerTitle: tfl("nature"), skeleton: columnSkeletons.textShort },
    },
    {
      accessorKey: "type",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("type")} />
      ),
      cell: ({ row }) => t(`accountType.${row.original.type}`),
      size: 180,
      meta: { headerTitle: tfl("type"), skeleton: columnSkeletons.text },
    },
    statusColumn<ChartOfAccount>(),
    ...auditColumns<ChartOfAccount>(tfl, dateTimeFormat),
  ];

  return useConfigTable<ChartOfAccount>({
    data,
    columns,
    totalRecords,
    params,
    tableConfig,
    onDelete,
    hideStatus: true,
    initialState: {
      columnVisibility: { created_at: false, updated_at: false },
    },
    // ยังไม่เปิด activity — โมดูลนี้ไม่มีในทะเบียนของ activity-registry ฝั่ง backend
    // เปิดไปจะได้เมนูที่กดแล้วว่างเปล่า (ดู CLAUDE.md หัวข้อ Activity sheet)
  });
}
