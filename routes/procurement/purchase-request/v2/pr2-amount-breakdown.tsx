import { memo } from "react";
import { useWatch, type Control } from "react-hook-form";
import { Sigma } from "lucide-react";
import { useTranslations } from "use-intl";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatCurrency, round2 } from "@/lib/currency-utils";
import { resolveApprovedQty, type PrFormValues } from "../pr-form-schema";

/**
 * ที่มาของยอดรายแถว — hover ที่ Σ ข้างยอดรวม
 *
 * หน้าเดิมโชว์ ยอดรวมย่อย/ส่วนลด/สุทธิ/ภาษี/รวม เป็นตารางเล็กในแถวที่กางออก
 * (`pr-item-summary.tsx`) พร้อมบรรทัดสกุลหลักใต้แต่ละตัวเมื่อซื้อสกุลต่างประเทศ
 *
 * v2 ไม่มีแถวกาง และไม่เอา "ยอดรวมย่อย" กับ "สุทธิ" ขึ้นเป็นคอลัมน์ด้วย — มันเป็น
 * เลขระหว่างทางที่คำนวณจากช่องอื่นในแถวเดียวกันอยู่แล้ว (ราคา×จำนวน, ลบส่วนลด)
 * ตั้งเป็นคอลัมน์ = กินที่ถาวรทั้ง 100 แถวเพื่อเลขที่นานๆ ดูที · เอามาไว้ใน tooltip
 * แทน ได้ข้อมูลครบเท่าเดิมโดยตารางไม่กว้างขึ้น
 */
export const Pr2AmountBreakdown = memo(function Pr2AmountBreakdown({
  control,
  index,
  baseCurrencyCode,
}: {
  readonly control: Control<PrFormValues>;
  readonly index: number;
  readonly baseCurrencyCode?: string;
}) {
  "use no memo";
  const tfl = useTranslations("field");
  const [
    price,
    requestedQty,
    approvedQty,
    discountAmount,
    netAmount,
    taxAmount,
    totalPrice,
    exchangeRate,
    currencyCode,
  ] = useWatch({
    control,
    name: [
      `items.${index}.pricelist_price`,
      `items.${index}.requested_qty`,
      `items.${index}.approved_qty`,
      `items.${index}.discount_amount`,
      `items.${index}.net_amount`,
      `items.${index}.tax_amount`,
      `items.${index}.total_price`,
      `items.${index}.exchange_rate`,
      `items.${index}.currency_code`,
    ] as const,
  });

  // ยังไม่มีราคา = ไม่มีที่มาให้ดู ซ่อนไอคอนไปเลย ไม่ให้รกทุกแถวของใบที่ยังไม่ตีราคา
  if (!Number(price ?? 0) && !Number(totalPrice ?? 0)) return null;

  const rate = Number(exchangeRate ?? 1);
  const isForeign =
    !!currencyCode && !!baseCurrencyCode && currencyCode !== baseCurrencyCode;
  const subtotal =
    Number(price ?? 0) *
    resolveApprovedQty({
      approved_qty: Number(approvedQty ?? 0),
      requested_qty: Number(requestedQty ?? 0),
    });

  const lines = [
    { key: "subtotal", label: tfl("subtotal"), value: subtotal },
    { key: "discount", label: tfl("discount"), value: Number(discountAmount ?? 0) },
    { key: "net", label: tfl("net"), value: Number(netAmount ?? 0) },
    { key: "tax", label: tfl("tax"), value: Number(taxAmount ?? 0) },
    { key: "total", label: tfl("total"), value: Number(totalPrice ?? 0) },
  ];

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className="text-muted-foreground hover:text-foreground inline-flex shrink-0 cursor-help items-center"
            aria-label="amount breakdown"
          >
            <Sigma className="size-3" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="left">
          <table className="text-xs">
            <tbody>
              {lines.map((l) => (
                <tr
                  key={l.key}
                  // บรรทัดรวมคือคำตอบ ตัวหนา + เส้นคั่นเหนือ ให้แยกจากที่มาของมัน
                  className={l.key === "total" ? "border-t font-semibold" : ""}
                >
                  <td className="text-muted-foreground pr-3">{l.label}</td>
                  <td className="pr-2 text-right tabular-nums">
                    {formatCurrency(l.value)}
                  </td>
                  {isForeign && (
                    <td className="text-muted-foreground text-right tabular-nums">
                      {formatCurrency(round2(l.value * rate))}
                    </td>
                  )}
                </tr>
              ))}
              {isForeign && (
                <tr>
                  <td />
                  <td className="text-muted-foreground pr-2 text-right text-[0.6875rem]">
                    {currencyCode}
                  </td>
                  <td className="text-muted-foreground text-right text-[0.6875rem]">
                    {baseCurrencyCode}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});
