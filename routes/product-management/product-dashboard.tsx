
import { useTranslations } from "use-intl";
import { DashboardWidgetGrid } from "@/components/dashboard-widget/dashboard-widget-grid-lazy";
import { useProductWidgets } from "@/hooks/use-dashboard-widgets";

const HIDDEN_DATASETS = new Set(["product.total-inactive"]);

const DATASET_TO_SUB_TILE: Record<string, string> = {
  "product.category-count": "productCategory",
  "product.product-count": "product",
  "product.products-by-category": "productCategory",
  "product.products-by-status": "product",
  "product.top-products-by-movement": "product",
  "product.products-without-movement": "product",
  "product.recently-added": "product",
};

function subTileFor(datasetId: string): string {
  return DATASET_TO_SUB_TILE[datasetId] ?? "product";
}

export default function ProductDashboard() {
  const t = useTranslations("productManagement.dashboard");
  const query = useProductWidgets();
  return (
    <DashboardWidgetGrid
      title={t("title")}
      description={t("description")}
      moduleName="productManagement"
      subTileFor={subTileFor}
      query={query}
      hiddenDatasets={HIDDEN_DATASETS}
    />
  );
}
