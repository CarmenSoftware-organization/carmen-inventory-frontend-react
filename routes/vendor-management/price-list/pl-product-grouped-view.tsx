import { useMemo } from "react";
import { NameWithSubtext } from "@/components/share/name-with-sub-text";
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
            <Th className="text-center">{tfl("unit")}</Th>
            <Th className="w-24 text-right">{tfl("moq")}</Th>
            <Th className="w-32 text-right">{tfl("unitPrice")}</Th>
            <Th className="text-left">{tfl("taxProfile")}</Th>
            <Th className="w-24 text-right">{tfl("leadTime")}</Th>
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
                  <Td className={cn("text-center align-middle", tierClass)}>
                    <PlainCell value={tier.unit_name} />
                  </Td>
                  <Td
                    className={cn(
                      "text-foreground text-right align-middle font-semibold tabular-nums",
                      tierClass,
                    )}
                  >
                    {Number(tier.moq_qty) || 0}+
                  </Td>
                  <Td
                    className={cn(
                      "text-foreground text-right align-middle font-semibold tabular-nums",
                      tierClass,
                    )}
                  >
                    {(Number(tier.price_without_tax) || 0).toFixed(2)}
                  </Td>
                  <Td className={cn("align-middle", tierClass)}>
                    <PlainCell value={tier.tax_profile_name} />
                  </Td>
                  <Td
                    className={cn(
                      "text-muted-foreground text-right align-middle tabular-nums",
                      tierClass,
                    )}
                  >
                    {Number(tier.lead_time_days) || 0}d
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

/** plain text ของ tier cell — เหมือน FieldPlainText แต่ไม่มี min-h-8 (กัน gap สูง) */
function PlainCell({ value }: { readonly value?: string | null }) {
  if (!value)
    return <span className="text-muted-foreground text-xs">—</span>;
  return <span className="text-foreground text-xs font-medium">{value}</span>;
}
