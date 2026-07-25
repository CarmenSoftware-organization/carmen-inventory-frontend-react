import type { ColumnDef } from "@tanstack/react-table";
import { useTranslations } from "use-intl";
import { DataGridColumnHeader } from "@/components/ui/data-grid/data-grid-column-header";
import { CellAction } from "@/components/ui/cell-action";
import { useConfigTable } from "@/components/ui/data-grid/use-config-table";
import { columnSkeletons, statusColumn } from "@/components/ui/data-grid/columns";
import { AuditCell } from "@/components/share/audit-cell";
import { useProfile } from "@/hooks/use-profile";
import type { EcoLabel } from "@/types/eco-label";
import type { ParamsDto } from "@/types/params";
import type { useDataGridState } from "@/hooks/use-data-grid-state";

interface UseEcoLabelTableOptions {
  data: EcoLabel[];
  totalRecords: number;
  params: ParamsDto;
  tableConfig: ReturnType<typeof useDataGridState>["tableConfig"];
  onEdit: (ecoLabel: EcoLabel) => void;
  onDelete: (ecoLabel: EcoLabel) => void;
}

export function useEcoLabelTable({
  data,
  totalRecords,
  params,
  tableConfig,
  onEdit,
  onDelete,
}: UseEcoLabelTableOptions) {
  const tfl = useTranslations("field");
  const t = useTranslations("config.eco");
  const { dateTimeFormat } = useProfile();
  const columns: ColumnDef<EcoLabel>[] = [
    {
      accessorKey: "code",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={t("iso")} />
      ),
      cell: ({ row }) => (
        <CellAction onClick={() => onEdit(row.original)}>
          <span className="text-xs">{row.getValue("code")}</span>
        </CellAction>
      ),
      meta: { headerTitle: t("iso"), skeleton: columnSkeletons.text },
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("name")} />
      ),
      cell: ({ row }) => <span>{row.getValue("name") || "..."}</span>,
      meta: { headerTitle: tfl("name"), skeleton: columnSkeletons.text },
    },
    statusColumn<EcoLabel>(),
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
      meta: { headerTitle: tfl("created") },
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
      meta: { headerTitle: tfl("updated") },
    },
  ];

  return useConfigTable<EcoLabel>({
    data,
    columns,
    totalRecords,
    params,
    tableConfig,
    onDelete,
    hideStatus: true,
    initialState: { columnVisibility: { created_at: false, updated_at: false } },
  });
}
