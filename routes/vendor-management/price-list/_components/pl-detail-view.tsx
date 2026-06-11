
import { useTranslations } from "use-intl";
import type { PriceListDetailItem } from "@/types/price-list";
import EmptyComponent from "@/components/empty-component";
import { BoxIcon } from "lucide-react";

interface ProductGroup {
  productId: string;
  productName: string;
  items: PriceListDetailItem[];
}

interface PriceListDetailViewProps {
  readonly details: PriceListDetailItem[];
}

/**
 * มุมมองแบบอ่านอย่างเดียวของรายการสินค้าใน price list จัดกลุ่มตาม product
 * @param props - รายการ price list detail ที่จะแสดง
 * @returns React element ของตาราง detail แบบ view
 * @example
 * <PriceListDetailView details={priceList.price_list_detail} />
 */
export function PriceListDetailView({ details }: PriceListDetailViewProps) {
  const t = useTranslations("vendorManagement.priceList");
  const tfl = useTranslations("field");

  const groups = (() => {
    const groupMap = new Map<string, ProductGroup>();
    for (const item of details) {
      const existing = groupMap.get(item.product_id);
      if (existing) {
        existing.items.push(item);
      } else {
        groupMap.set(item.product_id, {
          productId: item.product_id,
          productName: item.product_name,
          items: [item],
        });
      }
    }
    return Array.from(groupMap.values());
  })();

  const commonTaxRate = (() => {
    if (details.length === 0) return null;
    const rate = details[0].tax_rate;
    if (rate == null) return null;
    return details.every((d) => d.tax_rate === rate) ? rate : null;
  })();

  if (details.length === 0) {
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
              className="h-9 w-9 px-2 text-center align-middle font-medium"
            >
              #
            </th>
            <th
              scope="col"
              className="h-9 px-2 text-left align-middle font-medium"
            >
              {tfl("productName")}
            </th>
            <th
              scope="col"
              className="h-9 px-2 text-left align-middle font-medium"
            >
              {tfl("moq")}
            </th>
            <th
              scope="col"
              className="h-9 px-2 text-right align-middle font-medium"
            >
              {tfl("taxAmt")}{commonTaxRate == null ? "" : ` (${commonTaxRate}%)`}
            </th>
            <th
              scope="col"
              className="h-9 px-2 text-right align-middle font-medium"
            >
              {tfl("totalAmount")}
            </th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group, groupIndex) =>
            group.items.map((item, i) => (
              <tr
                key={`${group.productId}-${i}`}
                className="border-b last:border-b-0"
              >
                {i === 0 && (
                  <td
                    className="border-border px-2 w-9 py-1.5 text-center align-middle text-muted-foreground"
                    rowSpan={group.items.length}
                  >
                    {groupIndex + 1}
                  </td>
                )}
                {i === 0 && (
                  <td
                    className="border-border px-2 py-1.5 align-middle font-medium"
                    rowSpan={group.items.length}
                  >
                    {group.productName}
                  </td>
                )}
                <td className="border-border px-2 py-1.5">
                  <span className="text-muted-foreground">{item.moq_qty}+</span>{" "}
                  {item.unit_name ?? "-"} {" → "}
                  <span className="font-semibold">
                    {(Number(item.price_without_tax) || 0).toFixed(2)}
                  </span>
                  <span className="ml-1 text-muted-foreground">
                    ({item.lead_time_days}d)
                  </span>
                </td>
                <td className="border-border px-2 py-1.5 text-right tabular-nums">
                  {(Number(item.tax_amt) || 0).toFixed(2)}
                </td>
                <td className="border-border px-2 py-1.5 text-right tabular-nums font-semibold text-emerald-600">
                  {(Number(item.price) || 0).toFixed(2)}
                </td>
              </tr>
            )),
          )}
        </tbody>
      </table>
    </div>
  );
}
