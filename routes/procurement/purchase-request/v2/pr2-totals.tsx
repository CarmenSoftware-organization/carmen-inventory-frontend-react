import type { ReactNode } from "react";
import { useWatch, type Control } from "react-hook-form";
import { useTranslations } from "use-intl";
import { formatCurrency } from "@/lib/currency-utils";
import type { PrFormValues } from "../pr-form-schema";

/**
 * แถบยอดรวม + ปุ่ม action ติดล่างจอ
 *
 * ต่างจากหน้าเดิมสองอย่าง: ยอดรวมทั้งสิ้นตัวใหญ่กว่าตัวอื่นชัดเจน (ของเดิมทุกตัวเท่ากัน
 * เลขที่สำคัญที่สุดเลยไม่ชนะ) และปุ่ม action ไม่มีทางโดนตัดขาดเพราะอยู่คนละบรรทัด
 * กับยอด ไม่ใช่ต่อท้ายกันจนล้นจอแบบเดิม
 */
export function Pr2Totals({
  control,
  currencyCode,
  actions,
}: {
  readonly control: Control<PrFormValues>;
  readonly currencyCode?: string;
  readonly actions?: ReactNode;
}) {
  "use no memo";
  const tfl = useTranslations("field");
  const items = useWatch({ control, name: "items" }) ?? [];

  let subtotal = 0;
  let discount = 0;
  let net = 0;
  let tax = 0;
  let grand = 0;

  for (const item of items) {
    if (!item) continue;
    const rate = Number(item.exchange_rate ?? 1);
    const qty = Number(item.approved_qty) || Number(item.requested_qty) || 0;
    subtotal += Number(item.pricelist_price ?? 0) * qty * rate;
    discount += Number(item.discount_amount ?? 0) * rate;
    net += Number(item.net_amount ?? 0) * rate;
    tax += Number(item.tax_amount ?? 0) * rate;
    grand += Number(item.total_price ?? 0) * rate;
  }

  const minor = [
    { key: "subtotal", label: tfl("subtotal"), value: subtotal },
    { key: "discount", label: tfl("discount"), value: discount },
    { key: "net", label: tfl("net"), value: net },
    { key: "tax", label: tfl("tax"), value: tax },
  ];

  return (
    <div className="bg-background border-border sticky bottom-0 z-30 border-t">
      {/* ยอดย่อยกับยอดรวมอยู่บรรทัดเดียวกัน — ไล่ลำดับด้วยขนาด ไม่ใช่ด้วยการ
          แยกบรรทัด: ยอดย่อยเป็น text-sm ยอดรวมเป็น text-2xl semibold */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5">
        {minor.map((m) => (
          <div key={m.key} className="flex items-center gap-1.5 text-sm">
            <span className="text-muted-foreground">{m.label}</span>
            <span className="tabular-nums">{formatCurrency(m.value)}</span>
          </div>
        ))}

        {/* ยอดรวมอยู่ต่อท้ายยอดย่อย เป็นตัวเลขพวกเดียวกัน อ่านต่อกันเป็นบรรทัดเดียว
            ขนาดเท่ากันหมด แยกความสำคัญด้วยน้ำหนักตัวอักษร (semibold) อย่างเดียว —
            เคยทำเป็น text-2xl แล้วมันดันความสูงของแถบทั้งแถบเพื่อเลขตัวเดียว */}
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">
            {tfl("grandTotal")}
          </span>
          <span className="text-sm font-semibold tabular-nums">
            {formatCurrency(grand)}
          </span>
          {currencyCode && (
            <span className="text-muted-foreground text-sm">
              {currencyCode}
            </span>
          )}
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">{actions}</div>
      </div>
    </div>
  );
}
