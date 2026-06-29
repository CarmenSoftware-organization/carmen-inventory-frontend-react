import type { ColumnDef } from "@tanstack/react-table";
import { useTranslations, useLocale } from "use-intl";
import { Lock } from "lucide-react";
import { DataGridColumnHeader } from "@/components/ui/data-grid/data-grid-column-header";
import { CellAction } from "@/components/ui/cell-action";
import { useConfigTable } from "@/components/ui/data-grid/use-config-table";
import { customActionColumn } from "@/components/ui/data-grid/columns";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { WorkflowDto } from "@/types/workflows";
import { WF_TYPE_VARIANT, getWorkflowTypeLabels } from "@/constant/workflow";
import type { ParamsDto } from "@/types/params";
import type { useDataGridState } from "@/hooks/use-data-grid-state";
import { formatRelativeTime } from "@/lib/relative-time";
import { cn } from "@/lib/utils";
import WfFlowStrip from "./wf-flow-strip";
import WfRowActions from "./wf-row-actions";

interface UseWfTableOptions {
  workflows: WorkflowDto[];
  totalRecords: number;
  params: ParamsDto;
  tableConfig: ReturnType<typeof useDataGridState>["tableConfig"];
  onEdit: (workflow: WorkflowDto) => void;
  onDelete: (workflow: WorkflowDto) => void;
  onToggleActive: (workflow: WorkflowDto) => void;
  onDuplicate: (workflow: WorkflowDto) => void;
  pendingId?: string | null;
}

export function useWfTable({
  workflows,
  totalRecords,
  params,
  tableConfig,
  onEdit,
  onDelete,
  onToggleActive,
  onDuplicate,
  pendingId,
}: UseWfTableOptions) {
  const t = useTranslations("systemAdmin.workflow");
  const tfl = useTranslations("field");
  const locale = useLocale();

  const typeLabels = getWorkflowTypeLabels(t);

  const columns: ColumnDef<WorkflowDto>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("name")} />
      ),
      cell: ({ row }) => {
        const inactive = !row.original.is_active;
        return (
          <CellAction onClick={() => onEdit(row.original)}>
            <span
              className={cn(
                "inline-flex items-center gap-1.5",
                inactive && "text-muted-foreground",
              )}
            >
              {inactive && (
                <Tooltip delayDuration={150}>
                  <TooltipTrigger asChild>
                    <Lock
                      className="size-3 shrink-0"
                      aria-label={tfl("inactive")}
                    />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    {tfl("inactive")}
                  </TooltipContent>
                </Tooltip>
              )}
              <span
                className={cn(
                  inactive && "decoration-muted-foreground/40 line-through",
                )}
              >
                {row.getValue("name") || "..."}
              </span>
            </span>
          </CellAction>
        );
      },
    },
    {
      accessorKey: "workflow_type",
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title={t("workflowType")}
          className="justify-center"
        />
      ),
      cell: ({ row }) => {
        const wfType = row.getValue("workflow_type") as string;
        const inactive = !row.original.is_active;
        return (
          <Badge
            size="sm"
            variant={WF_TYPE_VARIANT[wfType]}
            className={cn(inactive && "opacity-60")}
          >
            {typeLabels[wfType] ?? wfType}
          </Badge>
        );
      },
      size: 180,
      meta: { cellClassName: "text-center" },
    },
    {
      id: "flow",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={t("flow")} />
      ),
      cell: ({ row }) => (
        <div className={cn(!row.original.is_active && "opacity-60")}>
          <WfFlowStrip workflow={row.original} />
        </div>
      ),
      size: 200,
      enableSorting: false,
    },
    {
      id: "updated",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("updated")} />
      ),
      cell: ({ row }) => {
        const updated = row.original.audit?.updated;
        if (!updated?.at) {
          return <span className="text-muted-foreground text-xs">—</span>;
        }
        const relative = formatRelativeTime(updated.at, locale);
        const absolute = new Date(updated.at).toLocaleString(locale);
        return (
          <Tooltip delayDuration={150}>
            <TooltipTrigger asChild>
              <div className="flex flex-col gap-0">
                <span className="text-foreground text-xs">{relative}</span>
                {updated.name && (
                  <span className="text-muted-foreground truncate text-[0.6875rem]">
                    {updated.name}
                  </span>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {absolute}
              {updated.name && ` · ${updated.name}`}
            </TooltipContent>
          </Tooltip>
        );
      },
      size: 160,
    },
    customActionColumn<WorkflowDto>(({ row }) => (
      <WfRowActions
        workflow={row.original}
        onToggleActive={onToggleActive}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
        isPending={pendingId === row.original.id}
      />
    )),
  ];

  return useConfigTable<WorkflowDto>({
    data: workflows,
    columns,
    totalRecords,
    params,
    tableConfig,
  });
}
