import { UseFormReturn, useWatch } from "react-hook-form";
import { useTranslations } from "use-intl";
import { PrFormValues } from "./pr-form-schema";
import { formatCurrency } from "@/lib/currency-utils";

interface Props {
  readonly control: UseFormReturn<PrFormValues>["control"];
  readonly itemCount: number;
  readonly currencyCode: string;
}

/**
 * แสดงยอดรวมของใบขอซื้อแบบสรุป ประกอบด้วย subtotal, discount, net, tax และ
 * grand total โดยคำนวณจากทุก items ที่ watch จาก react-hook-form ผ่าน
 * `useWatch` ใช้ `formatCurrency` แสดงผล และไฮไลต์ discount เป็นสีแดงเมื่อ
 * มีส่วนลด เหมาะสำหรับแสดงใต้ตารางรายการสินค้า
 * @param props - คุณสมบัติของคอมโพเนนต์
 * @param props.control - control ของ react-hook-form สำหรับ PR form
 * @param props.itemCount - จำนวนรายการสินค้าใน PR (ใช้แสดงข้อความ "n items")
 * @param props.currencyCode - รหัสสกุลเงินที่แสดงข้าง grand total
 * @returns React element ของสรุปยอดรวม PR
 * @example
 * <GrandTotal control={form.control} itemCount={items.length} currencyCode="THB" />
 */
export default function GrandTotal({
  control,
  itemCount,
  currencyCode,
}: Props) {
  const t = useTranslations("procurement.purchaseRequest");
  const tfl = useTranslations("field");
  const items = useWatch({ control, name: "items" });

  let subtotal = 0;
  let totalDiscount = 0;
  let totalNet = 0;
  let totalTax = 0;
  let grandTotal = 0;

  for (const item of items) {
    const price = Number(item?.pricelist_price ?? 0);
    const qty = Number(item?.requested_qty ?? 0);
    subtotal += price * qty;
    totalDiscount += Number(item?.discount_amount ?? 0);
    totalNet += Number(item?.net_amount ?? 0);
    totalTax += Number(item?.tax_amount ?? 0);
    grandTotal += Number(item?.total_price ?? 0);
  }

  const summary = { subtotal, totalDiscount, totalNet, totalTax, grandTotal };

  const rows: { label: string; value: string; className?: string }[] = [
    { label: tfl("subtotal"), value: formatCurrency(summary.subtotal) },
    {
      label: tfl("discount"),
      value:
        summary.totalDiscount > 0 ? `-${formatCurrency(summary.totalDiscount)}` : formatCurrency(0),
      className: summary.totalDiscount > 0 ? "text-destructive" : undefined,
    },
    { label: tfl("net"), value: formatCurrency(summary.totalNet) },
    { label: tfl("tax"), value: formatCurrency(summary.totalTax) },
  ];

  return (
    <div className="flex items-start justify-between border-t pt-3 text-sm">
      <span className="text-muted-foreground text-xs pt-0.5">
        {t("nItems", { count: itemCount })}
      </span>
      <div className="w-56">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between py-0.5 text-xs tabular-nums"
          >
            <span className="text-muted-foreground">{row.label}</span>
            <span className={row.className}>{row.value}</span>
          </div>
        ))}
        <div className="border-t my-1" />
        <div className="flex items-center justify-between">
          <span className="font-semibold text-sm">{tfl("total")}</span>
          <span className="font-semibold text-sm tabular-nums">
            {formatCurrency(summary.grandTotal)}{" "}
            {currencyCode && (
              <span className="text-muted-foreground font-normal text-xs">
                {currencyCode}
              </span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
