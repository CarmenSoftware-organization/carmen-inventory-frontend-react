import { formatCurrency } from "@/lib/currency-utils";

interface Props {
  readonly subtotal: number;
  readonly discountAmount: number;
  readonly netAmount: number;
  readonly taxAmount: number;
  readonly totalPrice: number;
  readonly exchangeRate: number;
  readonly isForeignCurrency: boolean;
  readonly baseCurrencyCode?: string;
}

/**
 * แถว base-currency ของ PR item summary — render เป็น grid cells (fragment) วาง
 * เรียงใต้คอลัมน์ Subtotal · Discount · Net · Tax · Total ของ grid แถว Vendor
 * (ค่า × exchange rate) ไม่มี label · โชว์เฉพาะสกุลต่างประเทศ
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
}: Props) {
  if (!isForeignCurrency) return null;

  const metrics = [
    { k: "subtotal", v: subtotal },
    { k: "discount", v: discountAmount },
    { k: "net", v: netAmount },
    { k: "tax", v: taxAmount },
    { k: "total", v: totalPrice },
  ];

  return (
    <>
      {metrics.map((m, i) => {
        const isTotal = i === metrics.length - 1;
        return (
          <div
            key={m.k}
            className={`text-muted-foreground flex items-center justify-end text-[0.6875rem] tabular-nums ${
              i === 0 ? "lg:col-start-5" : ""
            }`}
          >
            {formatCurrency(m.v * exchangeRate)}
            {/* currency code โชว์ที่ Total ที่เดียว */}
            {isTotal && baseCurrencyCode && (
              <span className="ml-1 text-[0.625rem]">{baseCurrencyCode}</span>
            )}
          </div>
        );
      })}
    </>
  );
}
