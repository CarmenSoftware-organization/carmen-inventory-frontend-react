import { useTranslations } from "use-intl";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency, round2 } from "@/lib/currency-utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

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
 * The grand total is emphasized with a divider + weight, not color or a card,
 * keeping the panel quiet per DESIGN.md (chrome recedes, single accent).
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
    <Collapsible defaultOpen>
      <div className="bg-card rounded-lg border">
        <CollapsibleTrigger className="hover:bg-muted/40 flex w-full items-center justify-between gap-2 px-3 py-2 text-xs font-semibold hover:cursor-pointer [&[data-state=open]>div:first-child>svg]:rotate-180">
          <div className="flex items-center gap-1.5">
            <ChevronDown className="size-3.5 shrink-0 transition-transform" />
            <span>{t("summary")}</span>
          </div>
          <span className="tabular-nums">
            {formatCurrency(totalPrice)}
            {currencyCode && (
              <span className="text-muted-foreground ml-1">{currencyCode}</span>
            )}
          </span>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <dl className="space-y-1.5 px-3 pb-3 text-xs">
            <SummaryRow
              label={tfl("subtotal")}
              value={subtotal}
              unit={currencyCode}
            />
            <SummaryRow
              label={tfl("net")}
              value={netAmount}
              unit={currencyCode}
            />
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
        </CollapsibleContent>
      </div>
    </Collapsible>
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
        strong && "border-border/60 mt-1.5 border-t pt-1.5",
      )}
    >
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "tabular-nums",
          strong
            ? "text-foreground font-semibold"
            : muted
              ? "text-muted-foreground"
              : "text-foreground",
        )}
      >
        {formatCurrency(value)}
        {unit && (
          <span className="text-muted-foreground ml-1 text-[0.625rem]">
            {unit}
          </span>
        )}
      </dd>
    </div>
  );
}
