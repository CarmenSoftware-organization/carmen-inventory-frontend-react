import { useTranslations } from "use-intl";
import { cn } from "@/lib/utils";
import { formatCurrency, round2 } from "@/lib/currency-utils";

interface Props {
  readonly subtotal: number;
  readonly netAmount: number;
  readonly totalPrice: number;
  readonly exchangeRate: number;
  readonly isForeignCurrency: boolean;
  readonly baseCurrencyCode?: string;
  readonly currencyCode?: string;
}

/**
 * Summary section of a PR item — flat key-value list (label left / amount right).
 * The grand total is the hero, emphasized by SIZE (receipt-style) + a divider —
 * not color or a card — so hierarchy comes from scale, keeping the panel quiet
 * per DESIGN.md (chrome recedes, single accent, size/lightness over weight).
 */
export function PrItemSummary({
  subtotal,
  netAmount,
  totalPrice,
  exchangeRate,
  isForeignCurrency,
  baseCurrencyCode,
  currencyCode,
}: Props) {
  const t = useTranslations("procurement.purchaseRequest");
  const tfl = useTranslations("field");

  return (
    <section className="space-y-3">
      {/* Eyebrow แบบเดียวกับกลุ่มอื่น (PRICING/TAX/Inventory) */}
      <p className="text-muted-foreground text-[0.6875rem] font-semibold tracking-wider uppercase">
        {t("summary")}
      </p>
      <dl className="space-y-1.5 text-xs">
        <SummaryRow
          label={tfl("subtotal")}
          value={subtotal}
          unit={currencyCode}
        />
        <SummaryRow label={tfl("net")} value={netAmount} unit={currencyCode} />
        {isForeignCurrency && (
          <SummaryRow
            label={baseCurrencyCode ?? ""}
            value={round2(totalPrice * exchangeRate)}
            unit={baseCurrencyCode}
            muted
          />
        )}
        <SummaryRow
          label={tfl("total")}
          value={totalPrice}
          unit={currencyCode}
          strong
        />
      </dl>
    </section>
  );
}

function SummaryRow({
  label,
  value,
  unit,
  strong,
  muted,
}: {
  readonly label: string;
  readonly value: number;
  readonly unit?: string;
  readonly strong?: boolean;
  readonly muted?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-3",
        strong && "border-border/60 mt-2 border-t pt-2",
      )}
    >
      <dt className={cn(strong ? "text-foreground text-sm font-medium" : "text-muted-foreground")}>
        {label}
      </dt>
      <dd
        className={cn(
          "tabular-nums",
          strong
            ? "text-foreground text-base font-semibold"
            : muted
              ? "text-muted-foreground"
              : "text-foreground",
        )}
      >
        {formatCurrency(value)}
        {unit && (
          <span
            className={cn(
              "text-muted-foreground ml-1 font-normal",
              strong ? "text-xs" : "text-[0.625rem]",
            )}
          >
            {unit}
          </span>
        )}
      </dd>
    </div>
  );
}
