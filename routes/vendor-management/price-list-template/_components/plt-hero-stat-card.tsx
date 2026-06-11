
import { Copy } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PltHeroStats {
  readonly productCount: number;
  readonly tierCount: number;
  readonly unitCount: number;
}

export interface PltHeroLabels {
  readonly validityPeriod: string;
  readonly daySingular: string;
  readonly dayPlural: string;
  readonly products: string;
  readonly tiers: string;
  readonly currency: string;
  readonly footer: string;
}

/** Hero stat card สำหรับ template — เน้น validity ใหญ่ + cells (Products/Tiers/Currency) */
export function PltHeroStatCard({
  validity,
  currencyCode,
  stats,
  labels,
}: {
  readonly validity: number | null;
  readonly currencyCode?: string;
  readonly stats: PltHeroStats;
  readonly labels: PltHeroLabels;
}) {
  const isEmpty = !validity;
  const dayLabel = validity === 1 ? labels.daySingular : labels.dayPlural;

  return (
    <div className="from-primary via-primary to-primary/70 text-primary-foreground relative hidden overflow-hidden rounded-2xl bg-gradient-to-br p-4 shadow-[0_1rem_2rem_-0.5rem_color-mix(in_oklch,var(--primary),transparent_60%)] lg:block">
      <div className="pointer-events-none absolute -top-10 -right-10 size-36 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.22)_0%,transparent_70%)]" />

      <div className="text-primary-foreground/70 text-[0.5625rem] font-medium tracking-widest uppercase">
        {labels.validityPeriod}
      </div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span
          className={cn(
            "text-3xl leading-none font-semibold tracking-tight tabular-nums",
            isEmpty && "text-primary-foreground/45",
          )}
        >
          {validity ?? 0}
        </span>
        <span className="text-primary-foreground/70 text-xs">{dayLabel}</span>
      </div>

      <div className="bg-primary-foreground/15 mt-3 grid grid-cols-3 gap-px overflow-hidden rounded-lg">
        <Cell k={labels.products} v={stats.productCount} empty={!stats.productCount} />
        <Cell k={labels.tiers} v={stats.tierCount} empty={!stats.tierCount} />
        <Cell
          k={labels.currency}
          v={currencyCode || "—"}
          empty={!currencyCode}
        />
      </div>

      <div className="text-primary-foreground/80 mt-2.5 flex items-center gap-1 text-[0.6875rem]">
        <Copy className="size-2.5" />
        {labels.footer}
      </div>
    </div>
  );
}

function Cell({
  k,
  v,
  empty,
}: {
  readonly k: string;
  readonly v: string | number;
  readonly empty?: boolean;
}) {
  return (
    <div className="bg-primary/40 px-2 py-1.5">
      <div className="text-primary-foreground/65 text-[0.5rem] font-semibold tracking-widest uppercase">
        {k}
      </div>
      <div
        className={cn(
          "mt-0.5 text-[0.6875rem] font-semibold",
          empty ? "text-primary-foreground/45" : "text-primary-foreground",
        )}
      >
        {v}
      </div>
    </div>
  );
}
