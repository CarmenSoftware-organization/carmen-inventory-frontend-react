
import { useTranslations } from "use-intl";
import { DashboardWidgetGrid } from "@/components/dashboard-widget/dashboard-widget-grid-lazy";
import { useVendorWidgets } from "@/hooks/use-dashboard-widgets";

const DATASET_TO_SUB_TILE: Record<string, string> = {
  "vendor.total-active": "vendor",
  "vendor.added-7d": "vendor",
  "vendor.without-products": "vendor",
  "pricelist.active-count": "priceList",
  "pricelist.expiring-soon": "priceList",
  "pricelist.by-status": "priceList",
  "pricelist.by-vendor-top": "priceList",
  "rfp.active": "requestPriceList",
  "rfp.upcoming-7d": "requestPriceList",
  "rfp.issued-daily": "requestPriceList",
};

function subTileFor(datasetId: string): string {
  return DATASET_TO_SUB_TILE[datasetId] ?? "vendor";
}

export default function VendorDashboard() {
  const t = useTranslations("vendorManagement.dashboard");
  const query = useVendorWidgets();
  return (
    <DashboardWidgetGrid
      title={t("title")}
      description={t("description")}
      moduleName="vendorManagement"
      subTileFor={subTileFor}
      query={query}
    />
  );
}
