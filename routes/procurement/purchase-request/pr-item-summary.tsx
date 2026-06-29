import { useTranslations } from "use-intl";
import {
  ArrowLeftRight,
  ChevronDown,
  Percent,
  Receipt,
  Wallet,
  type LucideIcon,
} from "lucide-react";
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
 * Summary card section of a PR item — displays subtotal, net amount, total,
 * and an optional base-currency conversion. Mirrors PrInventoryRow visual
 * language: accent stripe, soft glow, semantic color tokens.
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
      <div className="border-primary/20 bg-card group relative overflow-hidden rounded-lg border transition-colors hover:border-primary/40">
        <span
          aria-hidden="true"
          className="bg-primary absolute inset-x-0 top-0 h-0.5"
        />

        <CollapsibleTrigger className="hover:bg-muted/40 relative flex w-full items-center justify-between gap-2 px-3 py-2 text-xs font-semibold [&[data-state=open]>div:first-child>svg]:rotate-180">
          <div className="flex items-center gap-1.5">
            <ChevronDown className="size-3.5 shrink-0 transition-transform" />
            <span>{t("summary")}</span>
          </div>
          <span className="text-muted-foreground text-[0.6875rem] tabular-nums">
            {formatCurrency(totalPrice)}{" "}
            {currencyCode && (
              <span className="text-[0.625rem]">{currencyCode}</span>
            )}
          </span>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="relative space-y-2 px-3 pb-3">
            <div
              className={cn(
                "grid gap-3",
                isForeignCurrency ? "grid-cols-4" : "grid-cols-3",
              )}
            >
              <SummaryCard
                icon={Receipt}
                label={tfl("subtotal")}
                value={subtotal}
                unit={currencyCode}
                tone="muted"
              />
              <SummaryCard
                icon={Percent}
                label={tfl("net")}
                value={netAmount}
                unit={currencyCode}
                tone="muted"
              />
              <SummaryCard
                icon={Wallet}
                label={tfl("total")}
                value={totalPrice}
                unit={currencyCode}
                tone="primary"
              />
              {isForeignCurrency && (
                <SummaryCard
                  icon={ArrowLeftRight}
                  label={baseCurrencyCode ?? ""}
                  value={round2(totalPrice * exchangeRate)}
                  unit={baseCurrencyCode}
                  tone="warning"
                />
              )}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

type CardTone = "muted" | "primary" | "warning";

const CARD_TONE: Record<
  CardTone,
  { iconBg: string; iconText: string; valueText: string }
> = {
  muted: {
    iconBg: "bg-muted",
    iconText: "text-muted-foreground",
    valueText: "text-foreground",
  },
  primary: {
    iconBg: "bg-primary/10",
    iconText: "text-primary",
    valueText: "text-foreground",
  },
  warning: {
    iconBg: "bg-warning/15",
    iconText: "text-warning-foreground",
    valueText: "text-warning-foreground",
  },
};

interface SummaryCardProps {
  readonly icon: LucideIcon;
  readonly label: string;
  readonly value: number;
  readonly unit?: string;
  readonly tone: CardTone;
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  unit,
  tone,
}: SummaryCardProps) {
  const palette = CARD_TONE[tone];
  return (
    <div className="border-border/60 bg-background/40 space-y-1 rounded-md border px-2 py-2">
      <div className="flex items-center justify-between gap-2">
        <span
          aria-hidden="true"
          className={cn(
            "inline-flex size-6 items-center justify-center rounded-md",
            palette.iconBg,
            palette.iconText,
          )}
        >
          <Icon className="size-3.5" />
        </span>
        <span className="text-muted-foreground text-[0.625rem] font-semibold tracking-wide uppercase">
          {label}
        </span>
      </div>
      <div
        className={cn(
          "text-base leading-5 font-semibold tabular-nums",
          tone === "primary" && "text-base font-bold",
          palette.valueText,
        )}
      >
        {formatCurrency(value)}
      </div>
      <span className="text-muted-foreground text-[0.625rem]">{unit}</span>
    </div>
  );
}
