import { useTranslations } from "use-intl";
import { BuWidgetSection } from "@/components/dashboard-widget/bu-widget-section-lazy";
import { DashboardWidgetGrid } from "@/components/dashboard-widget/dashboard-widget-grid-lazy";
import { useProcurementWidgets } from "@/hooks/use-dashboard-widgets";

const DATASET_TO_SUB_TILE: Record<string, string> = {
  "document.pr-pending": "purchaseRequest",
  "document.po-pending": "purchaseOrder",
  "document.grn-pending": "goodsReceiveNote",
  "workflow.cn-pending-approval": "creditNote",
  "procurement.pr-by-status": "purchaseRequest",
  "document.po-by-status": "purchaseOrder",
  "procurement.po-by-vendor-top": "vendor",
  "procurement.pr-by-department": "department",
};

function subTileFor(datasetId: string): string {
  return DATASET_TO_SUB_TILE[datasetId] ?? "document";
}

export default function ProcurementDashboard() {
  const t = useTranslations("procurement.dashboard");
  const tBu = useTranslations("dashboard.buWidget");
  const query = useProcurementWidgets();
  return (
    <>
      <DashboardWidgetGrid
        title={t("title")}
        description={t("description")}
        moduleName="procurement"
        subTileFor={subTileFor}
        query={query}
      />
      <BuWidgetSection
        className="px-3 pb-3"
        module="procurement"
        title={tBu("sectionModule")}
      />
    </>
  );
}
