
import { useTranslations } from "use-intl";
import {
  ClipboardList,
  FileText,
  ShoppingCart,
  PackageOpen,
  type LucideIcon,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useApprovalPending,
  useApprovalPendingSummary,
} from "@/hooks/use-approval";
import { useDataGridState } from "@/hooks/use-data-grid-state";
import { useProfile } from "@/hooks/use-profile";
import SearchInput from "@/components/search-input";
import { ErrorState } from "@/components/ui/error-state";
import DisplayTemplate from "@/components/display-template";
import type { ApprovalPendingSummary } from "@/types/approval";
import ApprovalQueueList from "./approve-queue-list";
import { cn } from "@/lib/utils";

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
    { key: "po", label: t("purchaseOrder"), icon: ShoppingCart, color: "warning" },
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

  /**
   * จัดการคลิกการ์ดสรุปเพื่อกรองตามประเภทเอกสาร
   * @param key - คีย์ประเภทเอกสารที่ต้องการกรอง
   */
  const handleCardClick = (key: keyof ApprovalPendingSummary) => {
    setFilter(key === "total" ? "" : `doc_type:${key}`);
  };

  const { data, isLoading, error, refetch } = useApprovalPending(params);
  const { data: summary, isLoading: summaryLoading } =
    useApprovalPendingSummary();

  const items = data?.data ?? [];
  const totalRecords = items.length;

  if (error)
    return <ErrorState message={error.message} onRetry={() => refetch()} />;

  return (
    <DisplayTemplate
      title={t("title")}
      description={t("desc")}
      toolbar={
        <SearchInput
          defaultValue={search}
          onSearch={(value) => {
            if (value) setFilter("");
            setSearch(value);
          }}
        />
      }
    >
      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {SUMMARY_CARDS.map((card) => {
          const Icon = card.icon;
          return summaryLoading ? (
            <div
              key={card.key}
              className="rounded-lg border bg-card p-3 flex items-center gap-3"
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
                "rounded-lg border bg-card p-3 flex items-center gap-3 cursor-pointer transition-colors text-left",
                activeType === card.key
                  ? "ring-2 ring-primary border-primary"
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
                <p className="text-xs text-muted-foreground leading-none">
                  {card.label}
                </p>
                <p className="text-lg font-semibold leading-tight tabular-nums">
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
    </DisplayTemplate>
  );
}
