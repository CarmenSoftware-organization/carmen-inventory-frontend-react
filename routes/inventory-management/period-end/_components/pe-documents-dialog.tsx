
import { useMemo } from "react";
import Link from "@/lib/compat/link";
import { useLocale, useTranslations } from "use-intl";
import { FileText, type LucideIcon } from "lucide-react";
import {
  type ColumnDef,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import EmptyComponent from "@/components/empty-component";
import {
  DataGrid,
  DataGridContainer,
} from "@/components/ui/data-grid/data-grid";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import { formatLocalizedDate } from "@/lib/date-utils";
import { CN_STATUS_CONFIG } from "@/constant/credit-note";
import { GRN_STATUS_CONFIG } from "@/constant/goods-receive-note";
import { PO_STATUS_CONFIG } from "@/constant/purchase-order";
import { PR_STATUS_CONFIG } from "@/constant/purchase-request";
import { SR_STATUS_CONFIG } from "@/constant/store-requisition";
import type { StatusConfig } from "@/constant/status-config";
import type {
  ReviewDocument,
  ReviewTransactionKey,
  ReviewTransactionStat,
} from "@/types/period-end";

const STATUS_CONFIGS: Record<ReviewTransactionKey, StatusConfig> = {
  pr: PR_STATUS_CONFIG,
  po: PO_STATUS_CONFIG,
  grn: GRN_STATUS_CONFIG,
  cn: CN_STATUS_CONFIG,
  sr: SR_STATUS_CONFIG,
};

const MODULE_PATHS: Record<ReviewTransactionKey, string> = {
  pr: "/procurement/purchase-request",
  po: "/procurement/purchase-order",
  grn: "/procurement/goods-receive-note",
  cn: "/procurement/credit-note",
  sr: "/store-operation/store-requisition",
};

interface Props {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly moduleKey: ReviewTransactionKey | null;
  readonly stat: ReviewTransactionStat | null;
  readonly icon: LucideIcon;
  readonly color: string;
}

export function PeDocumentsDialog({
  open,
  onOpenChange,
  moduleKey,
  stat,
  icon: Icon,
  color,
}: Props) {
  const locale = useLocale();
  const t = useTranslations("inventoryManagement.periodEnd");
  const tfl = useTranslations("field");

  const documents: ReviewDocument[] = stat?.documents ?? [];
  const statusConfig = moduleKey ? STATUS_CONFIGS[moduleKey] : null;
  const basePath = moduleKey ? MODULE_PATHS[moduleKey] : null;
  const moduleLabel = moduleKey ? t(`modules.${moduleKey}`) : "";

  const columns = useMemo<ColumnDef<ReviewDocument>[]>(
    () => [
      {
        id: "index",
        header: () => "#",
        cell: ({ row }) => row.index + 1,
        size: 56,
        meta: {
          headerClassName: "text-center",
          cellClassName: "text-center",
        },
      },
      {
        accessorKey: "no",
        header: () => tfl("documentNo"),
        cell: ({ row }) => {
          const label = (
            <span className="text-[0.6875rem]">{row.original.no}</span>
          );
          if (!basePath) return label;
          return (
            <Link
              href={`${basePath}/${row.original.id}`}
              onClick={() => onOpenChange(false)}
              className="text-primary hover:underline focus-visible:underline"
            >
              {label}
            </Link>
          );
        },
        size: 200,
      },
      {
        accessorKey: "status",
        header: () => tfl("status"),
        cell: ({ row }) => {
          const cfg = statusConfig?.[row.original.status];
          return (
            <Badge className={cfg?.className} size="xs">
              {cfg?.label ??
                row.original.status.toUpperCase().replace(/_/g, " ")}
            </Badge>
          );
        },
        meta: {
          headerClassName: "text-center",
          cellClassName: "text-center",
        },
        size: 140,
      },
      {
        accessorKey: "date",
        header: () => tfl("date"),
        cell: ({ row }) => (
          <span className="text-muted-foreground tabular-nums">
            {formatLocalizedDate(row.original.date, locale)}
          </span>
        ),
        meta: {
          headerClassName: "text-center",
          cellClassName: "text-center",
        },
        size: 140,
      },
    ],
    [statusConfig, basePath, onOpenChange, tfl, locale],
  );

  const table = useReactTable({
    data: documents,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-3xl">
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 z-20 h-0.5"
          style={{ background: color }}
        />
        <div className="relative space-y-4 px-6 pt-10 pb-6">
          <DialogHeader>
            <div className="flex items-start gap-3">
              <div
                aria-hidden="true"
                className="flex size-10 shrink-0 items-center justify-center rounded-xl"
                style={{
                  background: `color-mix(in oklch, ${color}, transparent 82%)`,
                  color,
                }}
              >
                <Icon className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div
                  className="mb-1 inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[0.625rem] font-semibold"
                  style={{
                    background: `color-mix(in oklch, ${color}, transparent 88%)`,
                    color,
                  }}
                >
                  {t("documents")}
                </div>
                <DialogTitle className="text-base">{moduleLabel}</DialogTitle>
                <DialogDescription className="mt-1">
                  {t("documentsSummary", {
                    complete: stat?.complete_count ?? 0,
                    incomplete: stat?.incomplete_count ?? 0,
                    total: stat?.count ?? 0,
                  })}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <DataGrid
            table={table}
            recordCount={documents.length}
            tableLayout={{ headerSticky: true, rowBorder: true }}
            emptyMessage={
              <EmptyComponent icon={FileText} title={t("noDocuments")} />
            }
          >
            <DataGridContainer className="flex max-h-[60vh] flex-col rounded-lg border">
              <div className="flex-1 overflow-auto">
                <DataGridTable />
              </div>
            </DataGridContainer>
          </DataGrid>
        </div>
      </DialogContent>
    </Dialog>
  );
}
