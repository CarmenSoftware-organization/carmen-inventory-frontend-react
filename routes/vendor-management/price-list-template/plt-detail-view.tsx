
import { BoxIcon } from "lucide-react";
import { useTranslations } from "use-intl";
import EmptyComponent from "@/components/empty-component";
import type { PriceListTemplateProduct } from "@/types/price-list-template";

interface ProductGroup {
  productId: string;
  productName: string;
  rows: { unitName: string; qty: number; note: string }[];
}

interface PltDetailViewProps {
  readonly products: PriceListTemplateProduct[];
}

/**
 * มุมมองแบบอ่านอย่างเดียวของรายการสินค้าใน price list template
 * @param props - array ของ products ที่จะแสดง
 * @returns React element ของตาราง detail แบบ view
 * @example
 * <PltDetailView products={template.products} />
 */
export function PltDetailView({ products }: PltDetailViewProps) {
  const t = useTranslations("vendorManagement.priceListTemplate");
  const tfl = useTranslations("field");

  const groups = (() => {
    const result: ProductGroup[] = [];
    for (const product of products) {
      const rows =
        product.moq && product.moq.length > 0
          ? product.moq.map((m) => ({
              unitName: m.unit_name || "—",
              qty: m.qty,
              note: m.note ?? "",
            }))
          : [
              {
                unitName: product.default_order?.unit_name || "—",
                qty: 0,
                note: "",
              },
            ];
      result.push({
        productId: product.product_id,
        productName: product.product_name || product.code || product.product_id,
        rows,
      });
    }
    return result;
  })();

  if (products.length === 0) {
    return (
      <EmptyComponent
        icon={BoxIcon}
        title={t("detail.noItems")}
        description={t("detail.noItemsDesc")}
      />
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-lg border border-border">
      <table className="w-full min-w-full table-fixed border-separate border-spacing-0 text-xs">
        <thead>
          <tr className="bg-muted/60 text-foreground border-b">
            <th
              scope="col"
              className="h-9 w-9 px-2 text-center align-middle font-semibold"
            >
              #
            </th>
            <th
              scope="col"
              className="h-9 px-2 text-left align-middle font-semibold"
            >
              {tfl("product")}
            </th>
            <th
              scope="col"
              className="h-9 px-2 text-left align-middle font-semibold"
            >
              {tfl("unit")}
            </th>
            <th
              scope="col"
              className="h-9 px-2 text-right align-middle font-semibold"
            >
              {tfl("moqQty")}
            </th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group, groupIndex) =>
            group.rows.map((row, i) => (
              <tr
                key={`${group.productId}-${i}`}
                className="border-b last:border-b-0"
              >
                {i === 0 && (
                  <td
                    className="border-border w-9 px-2 py-1.5 text-center align-middle text-muted-foreground"
                    rowSpan={group.rows.length}
                  >
                    {groupIndex + 1}
                  </td>
                )}
                {i === 0 && (
                  <td
                    className="border-border px-2 py-1.5 align-middle font-semibold"
                    rowSpan={group.rows.length}
                  >
                    {group.productName}
                  </td>
                )}
                <td className="border-border px-2 py-1.5">{row.unitName}</td>
                <td className="border-border px-2 py-1.5 text-right tabular-nums">
                  {row.qty}
                </td>
              </tr>
            )),
          )}
        </tbody>
      </table>
    </div>
  );
}
