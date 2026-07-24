import type { FieldArrayWithId, UseFormReturn } from "react-hook-form";
import { SettingSection } from "@/components/ui/setting-section";
import { TreeProductLookup } from "@/components/ui/tree-product-lookup";
import { EmptyProducts } from "../price-list/pl-empty-states";
import type { PriceListTemplate } from "@/types/price-list-template";
import type { Product } from "@/types/product";
import type { PltFormValues } from "./plt-form-schema";
import type { ProductLabels } from "./plt-form-labels";
import { PltProductTable } from "./plt-product-table";
import { PltProductCards } from "./plt-product-cards";

export function PltFormProductsSection({
  form,
  detailFields,
  priceListTemplate,
  isView,
  isDisabled,
  onAddProduct,
  onRemoveTier,
  labels,
  allProducts,
  productsLoading,
  selectedProductIds,
  onTreeSelectionChange,
  onAddTier,
  onRemoveProduct,
}: {
  readonly form: UseFormReturn<PltFormValues>;
  readonly detailFields: FieldArrayWithId<PltFormValues, "details", "id">[];
  readonly priceListTemplate?: PriceListTemplate;
  readonly isView: boolean;
  readonly isDisabled: boolean;
  readonly onAddProduct: () => void;
  readonly onRemoveTier: (detailIndex: number) => void;
  readonly labels: ProductLabels;
  readonly allProducts: Product[];
  readonly productsLoading: boolean;
  readonly selectedProductIds: Set<string>;
  readonly onTreeSelectionChange: (productIds: string[]) => void;
  readonly onAddTier: (productId: string) => void;
  readonly onRemoveProduct: (productId: string) => void;
}) {
  // ชื่อ product สำหรับ header ของการ์ด — ดูจาก master ก่อน (tree/lookup)
  // fallback ไปที่ product ref ใน template (เผื่อ product ถูกปิด/ลบไม่อยู่ใน list)
  const getProductName = (productId: string) => {
    const p = allProducts.find((x) => x.id === productId);
    if (p) return `${p.code} — ${p.name}`;
    const ref = priceListTemplate?.products?.find(
      (x) => x.product_id === productId,
    );
    return ref ? `${ref.product_code ?? ref.code} — ${ref.product_name}` : "";
  };

  // หน่วยสั่งซื้อ (default_order) ของ product — มีเฉพาะ product ที่ save แล้วใน
  // template · product ที่พึ่งติ๊กจาก tree (ยังไม่ save) จะยังไม่มี → ไม่โชว์ badge
  const getOrderUnitName = (productId: string) =>
    priceListTemplate?.products?.find((x) => x.product_id === productId)
      ?.default_order?.unit_name ?? "";

  return (
    <SettingSection
      wide
      title={labels.sectionTitle}
      description={labels.noItemsDesc}
      count={detailFields.length}
    >
      {isView ? (
        detailFields.length === 0 ? (
          <EmptyProducts
            onAdd={onAddProduct}
            disabled={isDisabled}
            title={labels.noItems}
            description={labels.noItemsDesc}
            addLabel={labels.addLabel}
          />
        ) : (
          <PltProductTable
            form={form}
            detailFields={detailFields}
            priceListTemplate={priceListTemplate}
            isView={isView}
            isDisabled={isDisabled}
            onRemove={onRemoveTier}
            labels={labels}
          />
        )
      ) : (
        // edit/add → ซ้าย: tree เลือก product · ขวา: ตารางกรอก unit/qty/note
        // จอเล็กซ้อนลงล่าง (grid-cols-1) จอ lg ขึ้นไปแยกซ้าย-ขวา
        <div className="grid gap-4 lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start">
          <TreeProductLookup
            products={allProducts}
            selectedProductIds={selectedProductIds}
            onSelectionChange={onTreeSelectionChange}
            disabled={isDisabled}
            loading={productsLoading}
          />
          <div className="min-w-0">
            {detailFields.length === 0 ? (
              <div className="text-muted-foreground flex h-full min-h-40 flex-col items-center justify-center gap-1 rounded-lg border border-dashed p-6 text-center">
                <p className="text-sm font-medium">{labels.noItems}</p>
                <p className="text-xs">{labels.noItemsDesc}</p>
              </div>
            ) : (
              <PltProductCards
                form={form}
                detailFields={detailFields}
                isDisabled={isDisabled}
                onRemoveTier={onRemoveTier}
                onAddTier={onAddTier}
                onRemoveProduct={onRemoveProduct}
                getProductName={getProductName}
                getOrderUnitName={getOrderUnitName}
                labels={labels}
              />
            )}
          </div>
        </div>
      )}
    </SettingSection>
  );
}
