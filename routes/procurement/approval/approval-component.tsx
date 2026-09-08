import { useState } from "react";
import { useTranslations } from "use-intl";
import {
  ClipboardList,
  FileText,
  ShoppingCart,
  PackageOpen,
  type LucideIcon,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useApprovalPending, useApprovalPendingSummary } from "./use-approval";
import { useDataGridState } from "@/hooks/use-data-grid-state";
import { useProfile } from "@/hooks/use-profile";
import { ErrorState } from "@/components/ui/error-state";
import DisplayTemplate from "@/components/display-template";
import type { ApprovalPendingSummary } from "@/types/approval";
import ApprovalQueueList from "./approve-queue-list";
import { cn } from "@/lib/utils";
import { ActiveFilterBar } from "@/components/ui/active-filter-bar";
import { useListFilters } from "@/hooks/use-list-filters";
import { ListToolbar } from "@/components/list-filter/list-toolbar";
import { SaveViewDialog } from "@/components/list-filter/save-view-dialog";
import { LIST_PAGE_KEYS } from "@/constant/list-page-keys";
import type { FilterFieldDef } from "@/types/list-filter";

const APPROVAL_FILTER_FIELDS: FilterFieldDef[] = [
  {
    key: "filter",
    labelKey: "",
    control: "custom",
    hidden: true,
    toClause: () => "",
    render: () => null,
  },
];

/**
 * คอมโพเนนต์หลักหน้าอนุมัติ แสดงสรุปจำนวนรายการรออนุมัติและคิวเอกสาร
 * @returns React element ของหน้า Approval
 */
export default function ApprovalComponent() {
  const t = useTranslations("procurement.approval");
  const { dateFormat } = useProfile();

  const SUMMARY_CARDS: {
    key: keyof ApprovalPendingSummary;
    label: string;
    icon: LucideIcon;
    color: string;
  }[] = [
    {
      key: "total",
      label: t("totalPending"),
      icon: ClipboardList,
      color: "primary",
    },
    { key: "pr", label: t("purchaseRequest"), icon: FileText, color: "info" },
    {
      key: "po",
      label: t("purchaseOrder"),
      icon: ShoppingCart,
      color: "warning",
    },
    {
      key: "sr",
      label: t("storeRequisition"),
      icon: PackageOpen,
      color: "secondary",
    },
  ];

  const { params, search, setSearch, filter, setFilter, tableConfig } =
    useDataGridState({
      defaultPerpage: 10,
    });

  const activeType = filter?.match(/doc_type:(\w+)/)?.[1] ?? "total";

  const handleCardClick = (key: keyof ApprovalPendingSummary) => {
    setFilter(key === "total" ? "" : `doc_type:${key}`);
  };

  const [saveViewDialogOpen, setSaveViewDialogOpen] = useState(false);

  const lf = useListFilters({
    pageKey: LIST_PAGE_KEYS.APPROVAL,
    fields: APPROVAL_FILTER_FIELDS,
  });

  const { data, isLoading, error, refetch } = useApprovalPending(params);
  const { data: summary, isLoading: summaryLoading } =
    useApprovalPendingSummary();

  const items = data?.data ?? [];

  const totalRecords = search
    ? items.length
    : (summary?.[activeType as keyof ApprovalPendingSummary] ?? items.length);

  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;

  return (
    <DisplayTemplate
      title={t("title")}
      description={t("desc")}
      toolbar={
        <ListToolbar
          variant="bare"
          search={search}
          onSearch={(value) => {
            // เลือกคำค้น = ล้าง filter สถานะที่ค้างไว้ ไม่งั้นค้นแล้วไม่เจออะไรเลย
            if (value) setFilter("");
            setSearch(value);
          }}
          lf={lf}
          fields={APPROVAL_FILTER_FIELDS}
          onSaveViewClick={() => setSaveViewDialogOpen(true)}
        />
      }
      filterBar={
        <ActiveFilterBar filters={lf.activeFilters} onClearAll={lf.clearAll} />
      }
    >
      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {SUMMARY_CARDS.map((card) => {
          const Icon = card.icon;
          return summaryLoading ? (
            <div
              key={card.key}
              className="bg-card flex items-center gap-3 rounded-lg border p-3"
            >
              <Skeleton className="size-9 rounded-lg" />
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-5 w-8" />
              </div>
            </div>
          ) : (
            <button
              type="button"
              key={card.key}
              className={cn(
                "bg-card flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                activeType === card.key
                  ? "ring-primary border-primary ring-2"
                  : "hover:bg-accent",
              )}
              onClick={() => handleCardClick(card.key)}
              aria-pressed={activeType === card.key}
            >
              <div
                className={`flex size-9 items-center justify-center rounded-lg bg-${card.color}/10`}
              >
                <Icon className={`size-4 text-${card.color}`} />
              </div>
              <div>
                <p className="text-muted-foreground text-xs leading-none">
                  {card.label}
                </p>
                <p className="text-lg leading-tight font-semibold tabular-nums">
                  {summary?.[card.key] ?? 0}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <ApprovalQueueList
        items={items}
        totalRecords={totalRecords}
        isLoading={isLoading}
        dateFormat={dateFormat}
        params={params}
        tableConfig={tableConfig}
      />

      <SaveViewDialog
        open={saveViewDialogOpen}
        onOpenChange={setSaveViewDialogOpen}
        canManageBu={lf.view.canManageBu}
        existingNames={lf.view.existingNames}
        onSave={lf.view.saveOrUpdate}
      />
    </DisplayTemplate>
  );
}
