import { useTranslations } from "use-intl";
import { useWatch, type UseFormReturn } from "react-hook-form";
import { formatCurrency, round2 } from "@/lib/currency-utils";
import { cn } from "@/lib/utils";
import type { PoFormValues } from "./po-form-schema";

interface LineBreakdownProps {
  readonly form: UseFormReturn<PoFormValues>;
  readonly index: number;
}

export function LineBreakdown({ form, index }: LineBreakdownProps) {
  "use no memo";
  const tfl = useTranslations("field");

  // Watch wholewide items array — pattern เดียวกับ pr-grand-total.tsx
  // (works reliably ใน PR module)
  const items = useWatch({ control: form.control, name: "items" });
  const item = items?.[index];

  const price = Number(item?.price ?? 0);
  // qty = sum ของ locations.order_qty
  const qty = (item?.locations ?? []).reduce(
    (acc, l) => acc + (Number(l?.order_qty) || 0),
    0,
  );
  const discRate = Number(item?.discount_rate ?? 0);
  const taxRate = Number(item?.tax_rate ?? 0);

  const sub = round2(price * qty);
  const disc = round2((sub * discRate) / 100);
  const net = round2(sub - disc);
  const tax = round2((net * taxRate) / 100);
  const total = round2(net + tax);

  const rows: Array<readonly [string, number, boolean?]> = [
    [tfl("subtotal"), sub],
    [`${tfl("discount")} (${discRate}%)`, disc, true],
    [tfl("net"), net],
    [`${tfl("tax")} (${taxRate}%)`, tax],
  ];

  return (
    <div className="border-border/60 bg-card rounded-lg border p-3 text-xs">
      <dl className="space-y-1">
        {rows.map(([k, v, neg]) => (
          <div key={k} className="flex items-baseline justify-between py-0.5">
            <dt className="text-muted-foreground">{k}</dt>
            <dd
              className={cn(
                "font-semibold tabular-nums",
                neg && v > 0 ? "text-destructive" : "text-foreground/80",
              )}
            >
              {v === 0 ? "—" : `${neg ? "−" : ""}${formatCurrency(v)}`}
            </dd>
          </div>
        ))}
      </dl>
      <div className="border-border/60 mt-2 flex items-baseline justify-between border-t pt-2 font-bold">
        <span>{tfl("lineTotal")}</span>
        <span className="text-primary tabular-nums">
          {formatCurrency(total)}
        </span>
      </div>
    </div>
  );
}
