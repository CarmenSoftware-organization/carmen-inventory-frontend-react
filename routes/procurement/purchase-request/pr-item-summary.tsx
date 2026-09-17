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
      {/* base currency code — คอลัมน์ Currency (col 3) แถวเดียวกับค่า base */}
      <div className="text-muted-foreground text-micro flex items-center justify-end col-start-3">
        {baseCurrencyCode}
      </div>
      {metrics.map((m, i) => (
        <div
          key={m.k}
          className={`text-muted-foreground text-micro flex items-center justify-end tabular-nums ${
            i === 0 ? "col-start-6" : ""
          }`}
        >
          {formatCurrency(m.v * exchangeRate)}
        </div>
      ))}
    </>
  );
}
