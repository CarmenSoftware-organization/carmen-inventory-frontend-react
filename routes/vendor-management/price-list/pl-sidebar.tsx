
import { Controller, type UseFormReturn } from "react-hook-form";
import { Field, FieldLabel, FieldSelect } from "@/components/ui/field";
import { SelectContent, SelectItem } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { PRICE_LIST_STATUS_OPTIONS } from "@/constant/price-list";
import { CardLabel, GlassCard, InfoRow } from "@/components/share/glass-card";
import { daysBetween } from "@/lib/date-utils";
import type { PriceListFormValues } from "./pl-form-schema";

const LABEL_CLASS = cn(
  "text-muted-foreground text-[0.625rem] font-semibold tracking-[0.1em] uppercase",
);

interface SidebarStats {
  readonly count: number;
  readonly avg: number;
  readonly min: number;
  readonly max: number;
  readonly avgLead: number;
}

interface PLSidebarProps {
  readonly form: UseFormReturn<PriceListFormValues>;
  readonly stats: SidebarStats;
  readonly watchedFrom: string;
  readonly watchedTo: string;
  readonly isView: boolean;
  readonly isDisabled: boolean;
  readonly tfl: (key: string) => string;
  readonly ts: (key: "draft" | "active" | "inactive") => string;
  readonly labels: {
    readonly summary: string;
    readonly duration: string;
    readonly priceRange: string;
    readonly daysSuffix: (count: number) => string;
    readonly detailTitle: string;
    readonly avgUnitPrice: string;
    readonly selectStatus: string;
  };
}

/**
 * Right-side sidebar — summary card (single home ของ stats: avg/lines/range/lead)
 * + status switcher (edit). Vendor/currency/status/plNo อยู่ที่ General card +
 * Toolbar แล้ว จึงไม่แสดงซ้ำที่นี่
 */
export function PLSidebar({
  form,
  stats,
  watchedFrom,
  watchedTo,
  isView,
  isDisabled,
  tfl,
  ts,
  labels,
}: PLSidebarProps) {
  return (
    <aside className="hidden flex-col gap-3 self-start lg:sticky lg:top-20 lg:flex">
      <GlassCard>
        <CardLabel>{labels.summary}</CardLabel>
        <div className="grid gap-1.5">
          <InfoRow
            k={labels.avgUnitPrice}
            v={stats.count ? stats.avg.toFixed(2) : "—"}
            muted={!stats.count}
          />
          <InfoRow k={labels.detailTitle} v={stats.count} />
          <InfoRow
            k={labels.priceRange}
            v={getPriceRangeValue(stats)}
            muted={!stats.count}
          />
          <InfoRow
            k={tfl("leadTime")}
            v={stats.count ? labels.daysSuffix(stats.avgLead) : "—"}
            muted={!stats.count}
          />
          <InfoRow
            k={labels.duration}
            v={getDurationValue(watchedFrom, watchedTo, labels.daysSuffix)}
            muted={!watchedFrom || !watchedTo}
          />
        </div>

        {!isView && (
          <StatusSwitcher
            form={form}
            isDisabled={isDisabled}
            tfl={tfl}
            ts={ts}
            selectStatus={labels.selectStatus}
          />
        )}
      </GlassCard>
    </aside>
  );
}

function StatusSwitcher({
  form,
  isDisabled,
  tfl,
  ts,
  selectStatus,
}: {
  readonly form: UseFormReturn<PriceListFormValues>;
  readonly isDisabled: boolean;
  readonly tfl: (key: string) => string;
  readonly ts: (key: "draft" | "active" | "inactive") => string;
  readonly selectStatus: string;
}) {
  return (
    <div className="border-border/60 mt-3 border-t pt-3">
      <Field>
        <FieldLabel className={LABEL_CLASS}>{tfl("status")}</FieldLabel>
        <Controller
          control={form.control}
          name="status"
          render={({ field }) => (
            <FieldSelect
              value={field.value}
              onValueChange={field.onChange}
              disabled={isDisabled}
              placeholder={selectStatus}
              className="w-full text-xs"
              error={form.formState.errors.status?.message}
            >
              <SelectContent>
                {PRICE_LIST_STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {ts(opt.value as "draft" | "active" | "inactive")}
                  </SelectItem>
                ))}
              </SelectContent>
            </FieldSelect>
          )}
        />
      </Field>
    </div>
  );
}

function getDurationValue(
  from: string,
  to: string,
  daysSuffix: (count: number) => string,
): string {
  if (!from || !to) return "—";
  return daysSuffix(daysBetween(from, to));
}

function getPriceRangeValue(stats: SidebarStats) {
  if (!stats.count) return "—";
  return `${stats.min.toFixed(2)} – ${stats.max.toFixed(2)}`;
}
