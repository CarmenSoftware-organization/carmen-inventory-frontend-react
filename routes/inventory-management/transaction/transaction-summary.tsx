import {
  ArrowDownRight,
  ArrowRightLeft,
  ArrowUpRight,
  TrendingUp,
} from "lucide-react";
import { useTranslations } from "use-intl";
import { useProfile } from "@/hooks/use-profile";
import { formatAmount } from "@/lib/currency-utils";
import { cn } from "@/lib/utils";
import { useCountUp } from "@/components/share/reveal";
import type { TransactionSummary as TransactionSummaryType } from "@/types/transaction";

interface TransactionSummaryProps {
  readonly data: TransactionSummaryType;
}

type StatTone = "primary" | "success" | "warning" | "destructive";

const TONE_MAP: Record<
  StatTone,
  { iconBg: string; iconFg: string; valueText: string }
> = {
  primary: {
    iconBg: "bg-primary/15",
    iconFg: "text-primary",
    valueText: "text-foreground",
  },
  success: {
    iconBg: "bg-success/15",
    iconFg: "text-success",
    valueText: "text-success",
  },
  warning: {
    iconBg: "bg-warning/15",
    iconFg: "text-warning-foreground",
    valueText: "text-warning-foreground",
  },
  destructive: {
    iconBg: "bg-destructive/15",
    iconFg: "text-destructive",
    valueText: "text-destructive",
  },
};

interface SummaryCardProps {
  readonly title: string;
  readonly target: number;
  readonly format: (n: number) => string;
  readonly subtitle: string;
  readonly icon: React.ComponentType<{ className?: string }>;
  readonly tone: StatTone;
}

function SummaryCard({
  title,
  target,
  format,
  subtitle,
  icon: Icon,
  tone,
}: SummaryCardProps) {
  const tones = TONE_MAP[tone];
  const display = useCountUp(target, 800);
  return (
    <div className="border-border/60 bg-card hover:border-primary/40 group relative space-y-1.5 rounded-xl border p-3 transition-colors">
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-full",
            tones.iconBg,
            tones.iconFg,
          )}
        >
          <Icon className="size-3.5" />
        </div>
        <span className="text-muted-foreground text-[0.5625rem] font-semibold tracking-widest uppercase">
          {title}
        </span>
      </div>
      <div
        className={cn(
          "text-xl leading-none font-semibold tracking-tight tabular-nums",
          tones.valueText,
        )}
      >
        {format(display)}
      </div>
      <p className="text-muted-foreground text-[0.6875rem] leading-snug">
        {subtitle}
      </p>
    </div>
  );
}

export function TransactionSummary({ data: s }: TransactionSummaryProps) {
  const { amountFormat } = useProfile();
  const t = useTranslations("inventoryManagement.transaction");

  const formatCount = (n: number) => n.toLocaleString();
  const formatCurrency = (n: number) => formatAmount(n, amountFormat);
  const formatSigned = (n: number) =>
    `${n >= 0 ? "+" : ""}${formatAmount(n, amountFormat)}`;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <SummaryCard
        tone="primary"
        icon={ArrowRightLeft}
        title={t("totalTransactions")}
        target={s.total_transactions}
        format={formatCount}
        subtitle={t("adjustments", { count: s.adjustments_count })}
      />
      <SummaryCard
        tone="success"
        icon={ArrowDownRight}
        title={t("totalInbound")}
        target={s.inbound.total_cost}
        format={formatCurrency}
        subtitle={t("unitsReceived", {
          count: s.inbound.units.toLocaleString(),
        })}
      />
      <SummaryCard
        tone="destructive"
        icon={ArrowUpRight}
        title={t("totalOutbound")}
        target={s.outbound.total_cost}
        format={formatCurrency}
        subtitle={t("unitsIssued", {
          count: s.outbound.units.toLocaleString(),
        })}
      />
      <SummaryCard
        tone={s.net_change.total_cost >= 0 ? "success" : "destructive"}
        icon={TrendingUp}
        title={t("netChange")}
        target={s.net_change.total_cost}
        format={formatSigned}
        subtitle={t("unitsNet", {
          count: s.net_change.units.toLocaleString(),
        })}
      />
    </div>
  );
}
