import { NameWithSubtext } from "@/components/share/name-with-sub-text";
import { cn } from "@/lib/utils";
import type { PriceListTemplate } from "@/types/price-list-template";
import type { ProductLabels } from "./plt-form-labels";

type ProductRef = NonNullable<PriceListTemplate["products"]>[number];

interface PltProductGroupedViewProps {
  readonly products: readonly ProductRef[];
  readonly labels: ProductLabels;
}

/**
 * View-mode grouped table ของ PLT — product ที่มีหลาย MOQ tier โชว์ชื่อครั้งเดียว
 * แล้ว span ทั้งกลุ่มด้วย rowspan (แบบ price-list) tier เรียง MOQ น้อย→มาก
 * ขับด้วย `priceListTemplate.products` ที่ group มาให้แล้ว (product → moq[])
 * product ที่ไม่มี moq โชว์ 1 แถวด้วยหน่วยสั่งซื้อ (default_order)
 */
export function PltProductGroupedView({
  products,
  labels,
}: PltProductGroupedViewProps) {
  return (
    <div className="border-border/60 bg-card w-full overflow-x-auto rounded-lg border">
      <table className="text-foreground w-full border-collapse text-xs">
        <thead>
          <tr className="bg-muted/60 text-muted-foreground border-border/60 border-b">
            <Th className="w-14 text-center">#</Th>
            <Th className="text-left">{labels.product}</Th>
            <Th className="w-24 text-right">{labels.qty}</Th>
            <Th className="w-28 text-left">{labels.unit}</Th>
            <Th className="text-left">{labels.note}</Th>
          </tr>
        </thead>
        <tbody>
          {products.map((product, gi) => {
            const tiers =
              product.moq && product.moq.length > 0
                ? [...product.moq].sort(
                    (a, b) => (Number(a.qty) || 0) - (Number(b.qty) || 0),
                  )
                : [
                    {
                      qty: 0,
                      unit_id: product.default_order?.unit_id ?? "",
                      unit_name: product.default_order?.unit_name ?? "",
                      note: "",
                    },
                  ];
            const orderUnitId = product.default_order?.unit_id;

            return tiers.map((tier, ti) => {
              const isFirst = ti === 0;
              const isLast = ti === tiers.length - 1;
              const tierClass = cn(
                "py-1 align-middle",
                isLast && "border-border/50 border-b",
              );
              const qty = Number(tier.qty) || 0;
              return (
                <tr key={`${product.product_id}-${ti}`}>
                  {isFirst && (
                    <>
                      <Td
                        rowSpan={tiers.length}
                        className="border-border/50 text-muted-foreground border-b text-center align-middle tabular-nums"
                      >
                        {gi + 1}
                      </Td>
                      <Td
                        rowSpan={tiers.length}
                        className="border-border/50 border-b align-middle"
                      >
                        <NameWithSubtext
                          primary={product.product_name ?? ""}
                          secondary={
                            product.product_local_name ??
                            product.product_code ??
                            undefined
                          }
                        />
                      </Td>
                    </>
                  )}
                  <Td
                    className={cn(
                      "text-right tabular-nums",
                      qty === 0 && "text-muted-foreground italic",
                      tierClass,
                    )}
                  >
                    {qty || "—"}
                  </Td>
                  <Td className={tierClass}>
                    <span className="flex items-center gap-1.5">
                      {tier.unit_name || "—"}
                      {orderUnitId && tier.unit_id === orderUnitId && (
                        <span className="text-muted-foreground text-[0.625rem]">
                          · {labels.orderUnit}
                        </span>
                      )}
                    </span>
                  </Td>
                  <Td className={cn("text-muted-foreground", tierClass)}>
                    {tier.note || "—"}
                  </Td>
                </tr>
              );
            });
          })}
        </tbody>
      </table>
    </div>
  );
}

function Th({
  className,
  children,
}: {
  readonly className?: string;
  readonly children: React.ReactNode;
}) {
  return (
    <th className={cn("px-3 py-2 font-medium whitespace-nowrap", className)}>
      {children}
    </th>
  );
}

function Td({
  className,
  rowSpan,
  children,
}: {
  readonly className?: string;
  readonly rowSpan?: number;
  readonly children: React.ReactNode;
}) {
  return (
    <td rowSpan={rowSpan} className={cn("px-3 py-2", className)}>
      {children}
    </td>
  );
}
