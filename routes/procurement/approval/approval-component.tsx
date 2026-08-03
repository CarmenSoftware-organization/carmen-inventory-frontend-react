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
import { ActiveFilterBar } from "@/components/ui/active-filter-bar";
import { useListFilters } from "@/hooks/use-list-filters";
import { ViewSelector } from "@/components/list-filter/view-selector";
import { ListFilterSheet } from "@/components/list-filter/list-filter-sheet";
import { SaveViewDialog } from "@/components/list-filter/save-view-dialog";
import { LIST_PAGE_KEYS } from "@/constant/list-page-keys";
import type { FilterFieldDef } from "@/types/list-filter";

// หน้านี้ไม่มี filter field จริงให้ลง sheet — ตัวกรอง doc_type ขับเคลื่อนด้วยการ์ด
// สรุปด้านบน ผ่าน useDataGridState's setFilter ที่เขียน URL param "filter" ตรง ๆ
// (ไม่ใช่ clause แบบ key|type:value เหมือนหน้าอื่น จึงไม่พอร์ตเข้า lf.filterParam)
// ประกาศเป็น hidden field คีย์ "filter" (ชื่อ param เดียวกับที่ useDataGridState ใช้)
// เพื่อให้ saved view จับ/คืนค่า/ล้าง param นี้ได้ด้วย โดยไม่โผล่เป็น control ใน sheet
const APPROVAL_FILTER_FIELDS: FilterFieldDef[] = [
  // ตัวกรอง doc_type ของหน้านี้ขับด้วยการคลิก summary card (ไม่มี control ใน sheet)
  // ประกาศเป็น hidden field เพื่อให้ saved view จับ/คืนค่า/ล้าง param นี้ได้
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

  /**
   * จัดการคลิกการ์ดสรุปเพื่อกรองตามประเภทเอกสาร
   * @param key - คีย์ประเภทเอกสารที่ต้องการกรอง
   */
  const handleCardClick = (key: keyof ApprovalPendingSummary) => {
    setFilter(key === "total" ? "" : `doc_type:${key}`);
  };

  const [saveViewDialogOpen, setSaveViewDialogOpen] = useState(false);

  // fields ว่าง (ดู APPROVAL_FILTER_FIELDS) — ให้แค่ ViewSelector/ListFilterSheet/
  // saved-views ครบตาม sweep เดียวกับหน้าอื่น doc_type ยังกรองผ่านการ์ดสรุปด้านบน
  // เหมือนเดิมทั้งหมด ไม่ผ่าน lf.filterParam
  const lf = useListFilters({
    pageKey: LIST_PAGE_KEYS.APPROVAL,
    fields: APPROVAL_FILTER_FIELDS,
  });

  const { data, isLoading, error, refetch } = useApprovalPending(params);
  const { data: summary, isLoading: summaryLoading } =
    useApprovalPendingSummary();

  const items = data?.data ?? [];
  // ใช้ total ที่แท้จริงจาก summary endpoint (มี total/pr/po/sr) ตาม activeType แทน
  // items.length (ความยาวของหน้าปัจจุบัน) — ไม่งั้น pageCount = 1 เสมอ approver เลื่อน
  // หน้าไม่ได้ ส่วนกรณี search เป็น client-side filter จึงไม่รู้ total จริง ใช้ length
  const totalRecords = search
    ? items.length
    : (summary?.[activeType as keyof ApprovalPendingSummary] ?? items.length);

  if (error)
    return <ErrorState message={error.message} onRetry={() => refetch()} />;

  return (
    <DisplayTemplate
      title={t("title")}
      description={t("desc")}
      toolbar={
        <>
          <SearchInput
            defaultValue={search}
            onSearch={(value) => {
              if (value) setFilter("");
              setSearch(value);
            }}
          />
          <ViewSelector
            view={lf.view}
            snapshot={{ filters: lf.values, sort: lf.sortParam || undefined }}
          />
          <ListFilterSheet
            fields={APPROVAL_FILTER_FIELDS}
            values={lf.values}
            setValue={lf.setValue}
            onClearAll={lf.clearAll}
            onSaveClick={() => setSaveViewDialogOpen(true)}
            activeCount={lf.activeFilters.length}
          />
        </>
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
