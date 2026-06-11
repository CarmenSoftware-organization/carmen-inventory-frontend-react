import type { ColumnDef } from "@tanstack/react-table";
import { useTranslations } from "use-intl";
import { DataGridColumnHeader } from "@/components/ui/data-grid/data-grid-column-header";
import { CellAction } from "@/components/ui/cell-action";
import { useConfigTable } from "@/components/ui/data-grid/use-config-table";
import { columnSkeletons } from "@/components/ui/data-grid/columns";
import type { Certification } from "@/types/certification";
import type { ParamsDto } from "@/types/params";
import type { useDataGridState } from "@/hooks/use-data-grid-state";

interface UseCertificationTableOptions {
  data: Certification[];
  totalRecords: number;
  params: ParamsDto;
  tableConfig: ReturnType<typeof useDataGridState>["tableConfig"];
  onEdit: (certification: Certification) => void;
  onDelete: (certification: Certification) => void;
}

export function useCertificationTable({
  data,
  totalRecords,
  params,
  tableConfig,
  onEdit,
  onDelete,
}: UseCertificationTableOptions) {
  const tfl = useTranslations("field");
  const columns: ColumnDef<Certification>[] = [
    {
      accessorKey: "code",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("code")} />
      ),
      cell: ({ row }) => (
        <CellAction onClick={() => onEdit(row.original)}>
          <span className="text-xs">{row.getValue("code")}</span>
        </CellAction>
      ),
      meta: { headerTitle: tfl("code"), skeleton: columnSkeletons.text },
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("name")} />
      ),
      cell: ({ row }) => <span>{row.getValue("name")}</span>,
      meta: { headerTitle: tfl("name"), skeleton: columnSkeletons.text },
    },
  ];

  return useConfigTable<Certification>({
    data,
    columns,
    totalRecords,
    params,
    tableConfig,
    onDelete,
  });
}
