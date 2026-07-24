import { round2 } from "@/lib/currency-utils";
import { cn } from "@/lib/utils";
import type { PricelistExternalDetailDto } from "@/types/price-list-external";

/** จัดรูปเงิน 2 ตำแหน่ง + คั่นหลักพัน (mirror ตาราง edit) */
const fmtMoney = (n: number) =>
  n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

interface PriceListExternalViewTableProps {
  readonly details: readonly PricelistExternalDetailDto[];
}

/**
 * View-mode ตาราง read-only ของ price list external — คอลัมน์ตรงกับ edit mode
 * เป๊ะ (Product · Unit · MOQ · Price · Tax Profile · Price without Tax ·
 * Tax Amount · Lead Time) · 1 แถว/product เหมือน edit (MOQ tiers ซ้อนอยู่ใน
 * moq_tiers ไม่โชว์ที่นี่ เหมือน edit ที่พับไว้) · PWT/Tax amount คำนวณสดจาก
 * price + rate ด้วยสูตรเดียวกับ edit ให้ตัวเลขตรงกัน
 */
export default function PriceListExternalViewTable({
  details,
}: PriceListExternalViewTableProps) {
  return (
    <div className="border-border/60 bg-card w-full overflow-x-auto rounded-lg border">
      <table className="text-foreground w-full border-collapse text-sm">
        <thead>
          <tr className="bg-muted/60 text-muted-foreground border-border/60 border-b">
            <Th className="w-12 text-center">#</Th>
            <Th className="text-left">Product</Th>
            <Th className="text-left">Unit</Th>
            <Th className="text-right">MOQ</Th>
            <Th className="text-right">Price</Th>
            <Th className="text-left">Tax Profile</Th>
            <Th className="text-right">Price without Tax</Th>
            <Th className="text-right">Tax Amount</Th>
            <Th className="text-right">Lead Time</Th>
          </tr>
        </thead>
        <tbody>
          {details.map((d) => {
            const p = Number(d.price) || 0;
            const r = Number(d.tax_rate) || 0;
            const pwt = round2(p / (1 + r / 100));
            const taxAmt = round2(p - pwt);
            return (
              <tr key={d.id} className="border-border/50 border-b">
                <Td className="text-muted-foreground text-center tabular-nums">
                  {d.sequence_no}
                </Td>
                <Td>
                  <div className="flex flex-col">
                    <span className="font-medium">{d.product_name}</span>
                    {d.product_code && (
                      <span className="text-muted-foreground text-[0.6875rem]">
                        {d.product_code}
                      </span>
                    )}
                  </div>
                </Td>
                <Td className="text-muted-foreground">{d.unit_name || "—"}</Td>
                <Td className="text-right tabular-nums">
                  {Number(d.moq_qty) || 0}
                </Td>
                <Td className="text-right tabular-nums">{fmtMoney(p)}</Td>
                <Td>{d.tax_profile_name || "—"}</Td>
                <Td className="text-muted-foreground text-right tabular-nums">
                  {fmtMoney(pwt)}
                </Td>
                <Td className="text-right tabular-nums">{fmtMoney(taxAmt)}</Td>
                <Td className="text-right tabular-nums">
                  {Number(d.lead_time_days) || 0}
                </Td>
              </tr>
            );
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
  children,
}: {
  readonly className?: string;
  readonly children: React.ReactNode;
}) {
  return (
    <td className={cn("px-3 py-2 align-middle", className)}>{children}</td>
  );
}
