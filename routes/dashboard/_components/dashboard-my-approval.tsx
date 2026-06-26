
import Link from "@/lib/compat/link";
import { AlertCircle } from "lucide-react";
import { useTranslations } from "use-intl";
import {
  useApprovalPendingSummary,
  useApprovalPending,
} from "@/hooks/use-approval";
import type { ApprovalItem } from "@/types/approval";
import { WidgetSkeleton } from "@/components/dashboard-widget/dashboard-widget-grid";
import { Badge } from "@/components/ui/badge";
import EmptyComponent from "@/components/empty-component";
import { formatDate } from "@/lib/date-utils";
import { formatCurrency } from "@/lib/currency-utils";
import { getModuleColor } from "@/constant/module-color-map";

// --- Helpers ---

const DOC_TYPE_HREF = {
  pr: "/procurement/purchase-request",
  po: "/procurement/purchase-order",
  sr: "/store-operation/store-requisition",
};

// --- Sub-components ---

type TflFn = ReturnType<typeof useTranslations<"field">>;

/**
 * ตารางแสดง Store Requisitions ที่รออนุมัติของผู้ใช้
 * @param props - รายการ approval items และฟังก์ชันแปลภาษา
 * @returns JSX ของตาราง SR
 */
function SrTable({
  items,
  tfl,
}: {
  readonly items: ApprovalItem[];
  readonly tfl: TflFn;
}) {
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="bg-muted/60 text-foreground border-b">
          <th scope="col" className="px-3 py-2 text-left font-medium">
            {tfl("document")}
          </th>
          <th scope="col" className="px-3 py-2 text-left font-medium">
            {tfl("requester")}
          </th>
          <th scope="col" className="px-3 py-2 text-left font-medium">
            {tfl("department")}
          </th>
          <th scope="col" className="px-3 py-2 text-left font-medium">
            {tfl("stage")}
          </th>
          <th scope="col" className="px-3 py-2 text-right font-medium">
            {tfl("date")}
          </th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr
            key={item.id}
            className="hover:bg-accent/50 border-b last:border-b-0"
          >
            <td className="px-3 py-2">
              <Link
                href={`${DOC_TYPE_HREF.sr}/${item.id}`}
                className="text-primary font-medium hover:underline"
              >
                {item.doc_no}
              </Link>
            </td>
            <td className="px-3 py-2">{item.requestor_name}</td>
            <td className="text-muted-foreground px-3 py-2">
              {item.department_name}
            </td>
            <td className="text-muted-foreground px-3 py-2">
              {item.workflow_current_stage}
            </td>
            <td className="text-muted-foreground px-3 py-2 text-right">
              {formatDate(item.doc_date, "DD/MM/YYYY")}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * ตารางแสดง Purchase Requests ที่รออนุมัติของผู้ใช้
 * @param props - รายการ approval items และฟังก์ชันแปลภาษา
 * @returns JSX ของตาราง PR
 */
function PrTable({
  items,
  tfl,
}: {
  readonly items: ApprovalItem[];
  readonly tfl: TflFn;
}) {
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="bg-muted/60 text-foreground border-b">
          <th scope="col" className="px-3 py-2 text-left font-medium">
            {tfl("document")}
          </th>
          <th scope="col" className="px-3 py-2 text-left font-medium">
            {tfl("requester")}
          </th>
          <th scope="col" className="px-3 py-2 text-left font-medium">
            {tfl("department")}
          </th>
          <th scope="col" className="px-3 py-2 text-left font-medium">
            {tfl("stage")}
          </th>
          <th scope="col" className="px-3 py-2 text-right font-medium">
            {tfl("date")}
          </th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr
            key={item.id}
            className="hover:bg-accent/50 border-b last:border-b-0"
          >
            <td className="px-3 py-2">
              <Link
                href={`${DOC_TYPE_HREF.pr}/${item.id}`}
                className="text-primary font-medium hover:underline"
              >
                {item.doc_no}
              </Link>
            </td>
            <td className="px-3 py-2">{item.requestor_name}</td>
            <td className="text-muted-foreground px-3 py-2">
              {item.department_name}
            </td>
            <td className="text-muted-foreground px-3 py-2">
              {item.workflow_current_stage}
            </td>
            <td className="text-muted-foreground px-3 py-2 text-right">
              {formatDate(item.doc_date, "DD/MM/YYYY")}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * ตารางแสดง Purchase Orders ที่รออนุมัติของผู้ใช้
 * @param props - รายการ approval items และฟังก์ชันแปลภาษา
 * @returns JSX ของตาราง PO
 */
function PoTable({
  items,
  tfl,
}: {
  readonly items: ApprovalItem[];
  readonly tfl: TflFn;
}) {
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="bg-muted/60 text-foreground border-b">
          <th scope="col" className="px-3 py-2 text-left font-medium">
            {tfl("document")}
          </th>
          <th scope="col" className="px-3 py-2 text-left font-medium">
            {tfl("vendor")}
          </th>
          <th scope="col" className="px-3 py-2 text-right font-medium">
            {tfl("amount")}
          </th>
          <th scope="col" className="px-3 py-2 text-left font-medium">
            {tfl("stage")}
          </th>
          <th scope="col" className="px-3 py-2 text-right font-medium">
            {tfl("date")}
          </th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr
            key={item.id}
            className="hover:bg-accent/50 border-b last:border-b-0"
          >
            <td className="px-3 py-2">
              <Link
                href={`${DOC_TYPE_HREF.po}/${item.id}`}
                className="text-primary font-medium hover:underline"
              >
                {item.doc_no}
              </Link>
            </td>
            <td className="px-3 py-2">{item.vendor_name}</td>
            <td className="px-3 py-2 text-right tabular-nums">
              {formatCurrency(item.total_amount)}
            </td>
            <td className="text-muted-foreground px-3 py-2">
              {item.workflow_current_stage}
            </td>
            <td className="text-muted-foreground px-3 py-2 text-right">
              {formatDate(item.doc_date, "DD/MM/YYYY")}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

interface ApprovalSectionProps {
  readonly title: string;
  readonly count: number;
  readonly items: ApprovalItem[];
  readonly isLoading: boolean;
  readonly table: React.ReactNode;
  readonly color: string;
}

/**
 * Section แสดงรายการเอกสารที่รออนุมัติแต่ละประเภท พร้อม header, count badge และ loading/empty state
 * @param props - title, count, items, สถานะ loading, ตารางที่จะ render และสี
 * @returns JSX ของ approval section
 */
function ApprovalSection({
  title,
  count,
  items,
  isLoading,
  table,
  color,
}: ApprovalSectionProps) {
  return (
    <div
      className="space-y-2 rounded-md border-l-[3px] pl-3"
      style={{ borderLeftColor: color }}
    >
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold" style={{ color }}>
          {title}
        </h3>
        {count > 0 && (
          <Badge
            size="xs"
            style={{
              backgroundColor: `color-mix(in oklch, ${color} 15%, transparent)`,
              color,
              border: "none",
            }}
          >
            {count}
          </Badge>
        )}
      </div>

      {isLoading && <WidgetSkeleton />}

      {!isLoading && items.length === 0 && <EmptyComponent />}

      {!isLoading && items.length > 0 && (
        <div className="bg-card rounded-md border">{table}</div>
      )}
    </div>
  );
}

// --- Main Export ---

/**
 * Section ของ dashboard แสดงเอกสารที่รออนุมัติของผู้ใช้ แยกตามประเภท PR/PO/SR
 *
 * @param - ไม่มี parameter
 * @returns JSX ของ my approval section
 * @example
 * ```tsx
 * import { DashboardMyApproval } from "./_components/dashboard-my-approval";
 *
 * <DashboardMyApproval />
 * ```
 */
export function DashboardMyApproval() {
  const t = useTranslations("dashboard");
  const tfl = useTranslations("field");

  const { data: approvalSummary } = useApprovalPendingSummary();
  const { data: approvalData, isLoading: isApprovalLoading } =
    useApprovalPending({ perpage: 10 });

  const allItems = approvalData?.data ?? [];

  const sr: ApprovalItem[] = [];
  const pr: ApprovalItem[] = [];
  const po: ApprovalItem[] = [];
  for (const item of allItems) {
    if (item.doc_type === "sr") sr.push(item);
    else if (item.doc_type === "pr") pr.push(item);
    else if (item.doc_type === "po") po.push(item);
  }
  const srItems = sr;
  const prItems = pr;
  const poItems = po;

  const prColor = getModuleColor("/procurement/purchase-request");
  const poColor = getModuleColor("/procurement/purchase-order");
  const srColor = getModuleColor("/store-operation/store-requisition");

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 border-b pb-2">
        <h2 className="text-sm font-semibold">{t("pendingMyApproval")}</h2>
        <AlertCircle className="text-muted-foreground size-3" />
        {approvalSummary && approvalSummary.total > 0 && (
          <Badge variant="warning-light" size="xs">
            {approvalSummary.total}
          </Badge>
        )}
      </div>

      <ApprovalSection
        title={t("purchaseRequests")}
        count={approvalSummary?.pr ?? 0}
        items={prItems}
        isLoading={isApprovalLoading}
        table={<PrTable items={prItems} tfl={tfl} />}
        color={prColor}
      />

      <ApprovalSection
        title={t("purchaseOrders")}
        count={approvalSummary?.po ?? 0}
        items={poItems}
        isLoading={isApprovalLoading}
        table={<PoTable items={poItems} tfl={tfl} />}
        color={poColor}
      />

      <ApprovalSection
        title={t("storeRequisitions")}
        count={approvalSummary?.sr ?? 0}
        items={srItems}
        isLoading={isApprovalLoading}
        table={<SrTable items={srItems} tfl={tfl} />}
        color={srColor}
      />

      {allItems.length > 0 && (
        <div className="flex justify-end">
          <Link
            href="/procurement/approval"
            className="text-primary text-xs hover:underline"
          >
            {t("viewAll")} →
          </Link>
        </div>
      )}
    </section>
  );
}
