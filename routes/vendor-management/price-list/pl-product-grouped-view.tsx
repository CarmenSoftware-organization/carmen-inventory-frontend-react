import { useMemo } from "react";
import { NameWithSubtext } from "@/components/share/name-with-sub-text";
import { round2 } from "@/lib/currency-utils";
import { cn } from "@/lib/utils";
import type { PriceList } from "@/types/price-list";
import { buildProductGroups } from "./pl-product-grouping";

interface PLProductGroupedViewProps {
  readonly detailRefs: PriceList["pricelist_detail"];
  readonly tfl: (key: string) => string;
}

/**
 * View-mode grouped table ของ price-list products — product ที่ซ้ำกัน (หลาย MOQ
 * tier) ถูก group เป็น "แถวเดียว": ชื่อ product + ลำดับ span ทั้งกลุ่มด้วย rowspan
 * จัดกึ่งกลางแนวตั้ง, ไม่มีเส้นคั่นระหว่าง tier ในกลุ่ม (เส้นคั่นเฉพาะระหว่างกลุ่ม)
 * tier เรียงตาม MOQ น้อย→มาก (read-only, ขับด้วย detailRefs ล้วน)
 */
export function PLProductGroupedView({
  detailRefs,
  tfl,
}: PLProductGroupedViewProps) {
  const groups = useMemo(() => buildProductGroups(detailRefs), [detailRefs]);

  return (
    <div className="border-border/60 bg-card w-full overflow-x-auto rounded-lg border">
      <table className="text-foreground w-full border-collapse text-xs">
        <thead>
          <tr className="bg-muted/60 text-muted-foreground border-border/60 border-b">
            <Th className="w-14 text-center">#</Th>
            <Th className="text-left">{tfl("product")}</Th>
            <Th className="text-left">{tfl("moqPricing")}</Th>
            <Th className="w-20 text-right">{tfl("rate")}</Th>
            <Th className="text-right">{tfl("amount")}</Th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) =>
            group.tiers.map((tier, ti) => {
              const isFirst = ti === 0;
              const isLast = ti === group.tiers.length - 1;
              const tierClass = cn(
                "py-1",
                isLast && "border-border/50 border-b",
              );
              // Rate = ยอดภาษี (คำนวณจาก tax_rate), Amount = ราคา + Rate (รวมภาษี)
              const priceNoTax = Number(tier.price_without_tax) || 0;
              const rate = Number(tier.tax_rate) || 0;
              const taxAmt = round2((priceNoTax * rate) / 100);
              const amount = round2(priceNoTax + taxAmt);
              return (
                <tr key={tier.id ?? `${group.productId}-${ti}`}>
                  {isFirst && (
                    <>
                      <Td
                        rowSpan={group.tiers.length}
                        className="border-border/50 text-muted-foreground border-b text-center align-middle tabular-nums"
                      >
                        {group.groupNumber}
                      </Td>
                      <Td
                        rowSpan={group.tiers.length}
                        className="border-border/50 border-b align-middle"
                      >
                        <NameWithSubtext
                          primary={tier.product_name ?? ""}
                          secondary={tier.product_local_name}
                        />
                      </Td>
                    </>
                  )}
                  {/* moq + unit → price (lead time) */}
                  <Td className={cn("align-middle", tierClass)}>
                    <span className="flex items-center gap-1.5 text-xs tabular-nums">
                      <span className="text-foreground font-medium">
                        {Number(tier.moq_qty) || 0}+ {tier.unit_name ?? "—"}
                      </span>
                      <span className="text-muted-foreground">→</span>
                      <span className="text-foreground font-semibold">
                        {priceNoTax.toFixed(2)}
                      </span>
                      <span className="text-muted-foreground text-[0.6875rem]">
                        ({Number(tier.lead_time_days) || 0}d)
                      </span>
                    </span>
                  </Td>
                  {/* Rate = ยอดภาษีที่คำนวณจาก tax_rate (ค่าเงิน ไม่ใช่ %) */}
                  <Td
                    className={cn(
                      "text-muted-foreground text-right align-middle tabular-nums",
                      tierClass,
                    )}
                  >
                    {taxAmt.toFixed(2)}
                  </Td>
                  {/* Amount = ราคารวมภาษีแล้ว */}
                  <Td
                    className={cn(
                      "text-foreground text-right align-middle font-semibold tabular-nums",
                      tierClass,
                    )}
                  >
                    {amount.toFixed(2)}
                  </Td>
                </tr>
              );
            }),
          )}
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
