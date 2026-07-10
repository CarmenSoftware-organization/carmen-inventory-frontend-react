import { useTranslations } from "use-intl";
import { formatCurrency, round2 } from "@/lib/currency-utils";
import { SummaryBar } from "@/components/ui/summary-bar";

interface Props {
  readonly subtotal: number;
  readonly discountAmount: number;
  readonly netAmount: number;
  readonly taxAmount: number;
  readonly totalPrice: number;
  readonly exchangeRate: number;
  readonly isForeignCurrency: boolean;
  readonly baseCurrencyCode?: string;
  readonly currencyCode?: string;
}

/**
 * Summary ของ PR item แบบ inline (label · value อยู่ line เดียวกัน มี | คั่น)
 * ใช้ SummaryBar ตัวเดียวกับ grand total — เรียง subtotal · discount · net · tax ·
 * total (total เป็นพระเอกด้วย SIZE) เพิ่ม base-currency conversion เมื่อเป็นสกุลต่างประเทศ
 */
export function PrItemSummary({
  subtotal,
  discountAmount,
  netAmount,
  taxAmount,
  totalPrice,
  exchangeRate,
  isForeignCurrency,
  baseCurrencyCode,
  currencyCode,
}: Props) {
  const tfl = useTranslations("field");

  return (
    <SummaryBar
      className="justify-end"
      items={[
        {
          key: "subtotal",
          label: tfl("subtotal"),
          value: formatCurrency(subtotal),
        },
        {
          key: "discount",
          label: tfl("discount"),
          value:
            discountAmount > 0
              ? `-${formatCurrency(discountAmount)}`
              : formatCurrency(0),
          valueClassName:
            discountAmount > 0
              ? "text-destructive font-semibold"
              : "font-semibold",
        },
        { key: "net", label: tfl("net"), value: formatCurrency(netAmount) },
        { key: "tax", label: tfl("tax"), value: formatCurrency(taxAmount) },
        ...(isForeignCurrency
          ? [
              {
                key: "base",
                label: baseCurrencyCode ?? "",
                value: formatCurrency(round2(totalPrice * exchangeRate)),
                valueClassName: "text-muted-foreground",
              },
            ]
          : []),
        {
          key: "total",
          label: tfl("total"),
          value: formatCurrency(totalPrice),
          emphasis: true,
          suffix: currencyCode,
        },
      ]}
    />
  );
}
