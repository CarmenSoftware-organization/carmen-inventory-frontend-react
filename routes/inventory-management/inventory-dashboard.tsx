
import { useTranslations } from "use-intl";
import { DashboardWidgetGrid } from "@/components/dashboard-widget/dashboard-widget-grid-lazy";
import { useInventoryWidgets } from "@/hooks/use-dashboard-widgets";

const DATASET_TO_SUB_TILE: Record<string, string> = {
  "inventory.physical-count-pending": "physicalCount",
  "inventory.low-stock-count": "stockReplenishment",
  "inventory.stock-in-pending": "transaction",
  "inventory.stock-out-pending": "transaction",
  "inventory.store-requisition-pending": "storeRequisition",
  "inventory.spot-check-pending": "spotCheck",
  "inventory.issue-open": "document",
  "inventory.stock-in-by-status": "transaction",
  "inventory.stock-out-by-status": "transaction",
  "inventory.spot-check-by-status": "spotCheck",
  "inventory.issue-by-priority": "document",
};

function subTileFor(datasetId: string): string {
  return DATASET_TO_SUB_TILE[datasetId] ?? "document";
}

export default function InventoryDashboard() {
  const t = useTranslations("inventoryManagement.dashboard");
  const query = useInventoryWidgets();
  return (
    <DashboardWidgetGrid
      title={t("title")}
      description={t("description")}
      moduleName="inventoryManagement"
      subTileFor={subTileFor}
      query={query}
    />
  );
}
