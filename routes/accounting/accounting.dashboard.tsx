import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "use-intl";
import { DashboardWidgetGrid } from "@/components/dashboard-widget/dashboard-widget-grid-lazy";
import type { DashboardWidgetListResponse } from "@/types/dashboard-widget";

function subTileFor(datasetId: string): string {
  if (datasetId.includes("ap-")) return "creditNote";
  if (datasetId.includes("journal")) return "document";
  return "reportList";
}

export default function AccountingDashboard() {
  const t = useTranslations("accounting.dashboard");

  const data: DashboardWidgetListResponse = {
    count: 6,
    items: [
      {
        id: "accounting-revenue",
        dataset_id: "accounting.total-revenue",
        widget_type: "kpi",
        title: t("revenue.title"),
        order_index: 0,
        meta: {
          id: "accounting.total-revenue",
          name: t("revenue.title"),
          description: t("revenue.meta", { value: "+12%" }),
          shape: "scalar_delta",
          category: "spend",
          unit: "฿",
        },
        data: { value: 4_200_000, prev: 3_750_000 },
      },
      {
        id: "accounting-bank-balance",
        dataset_id: "accounting.bank-balance",
        widget_type: "kpi",
        title: t("bankBalance.title"),
        order_index: 1,
        meta: {
          id: "accounting.bank-balance",
          name: t("bankBalance.title"),
          description: t("bankBalance.meta", { value: "4" }),
          shape: "scalar",
          category: "spend",
          unit: "฿",
        },
        data: { value: 12_800_000 },
      },
      {
        id: "accounting-ap-overdue",
        dataset_id: "accounting.ap-overdue",
        widget_type: "kpi",
        title: t("apOverdue.title"),
        order_index: 2,
        meta: {
          id: "accounting.ap-overdue",
          name: t("apOverdue.title"),
          description: t("apOverdue.meta", { value: "15" }),
          shape: "scalar",
          category: "workflow",
          unit: "฿",
        },
        data: { value: 850_000 },
      },
      {
        id: "accounting-unposted-journal",
        dataset_id: "accounting.unposted-journal",
        widget_type: "kpi",
        title: t("unpostedJv.title"),
        order_index: 3,
        meta: {
          id: "accounting.unposted-journal",
          name: t("unpostedJv.title"),
          description: t("unpostedJv.meta", { value: "8" }),
          shape: "scalar",
          category: "workflow",
          unit: t("documentsUnit"),
        },
        data: { value: 24 },
      },
      {
        id: "accounting-expense-breakdown",
        dataset_id: "accounting.expense-breakdown",
        widget_type: "bar",
        title: t("expenseBreakdown"),
        order_index: 4,
        meta: {
          id: "accounting.expense-breakdown",
          name: t("expenseBreakdown"),
          shape: "categorical",
          category: "spend",
          unit: t("thousandBahtUnit"),
        },
        data: [
          { label: "Rooms", value: 1280 },
          { label: "F&B", value: 980 },
          { label: "Utilities", value: 720 },
          { label: "Payroll", value: 1520 },
          { label: "Admin", value: 430 },
        ],
      },
      {
        id: "accounting-actionable-tasks",
        dataset_id: "accounting.actionable-tasks",
        widget_type: "table",
        title: t("actions.title"),
        order_index: 5,
        meta: {
          id: "accounting.actionable-tasks",
          name: t("actions.title"),
          shape: "table",
          category: "workflow",
        },
        data: {
          columns: [
            { key: "task", label: t("actions.task") },
            { key: "detail", label: t("actions.detail") },
            { key: "count", label: t("actions.count"), type: "number" },
          ],
          rows: [
            {
              task: t("actions.autoReverse"),
              detail: t("actions.autoReverseMeta"),
              count: 3,
            },
            {
              task: t("actions.interfaceErrors"),
              detail: t("actions.interfaceErrorsMeta"),
              count: 2,
            },
            {
              task: t("actions.monthEnd"),
              detail: t("actions.monthEndMeta"),
              count: 5,
            },
          ],
        },
      },
    ],
  };

  const query = useQuery({
    queryKey: ["accounting-dashboard-widgets", t("title")],
    queryFn: async () => data,
    initialData: data,
    staleTime: Infinity,
  });

  return (
    <DashboardWidgetGrid
      title={t("title")}
      description={t("description")}
      moduleName="accounting"
      subTileFor={subTileFor}
      query={query}
    />
  );
}
