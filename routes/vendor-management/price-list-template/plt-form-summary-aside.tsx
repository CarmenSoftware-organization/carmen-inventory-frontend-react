import { Controller, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import { Sparkles } from "lucide-react";

import { Field, FieldLabel, FieldSelect } from "@/components/ui/field";
import { SelectContent, SelectItem } from "@/components/ui/select";
import { cn } from "@/lib/utils";

import {
  CardLabel,
  GlassCard,
  InfoRow,
  StatusPill,
} from "@/components/share/glass-card";
import { PRICE_LIST_TEMPLATE_STATUS_OPTIONS } from "@/constant/price-list-template";
import type { PriceListTemplate } from "@/types/price-list-template";
import type { PltFormValues } from "./plt-form-schema";
import type { SummaryLabels } from "./plt-form-labels";

const LABEL_CLASS = cn(
  "text-muted-foreground text-[0.625rem] font-semibold tracking-[0.1em] uppercase",
);

export function PltFormSummaryAside({
  form,
  isView,
  isDisabled,
  priceListTemplate,
  statusConfig,
  stats,
  watchedValidity,
  statValidityLabel,
  summaryLabels,
}: {
  readonly form: UseFormReturn<PltFormValues>;
  readonly isView: boolean;
  readonly isDisabled: boolean;
  readonly priceListTemplate?: PriceListTemplate;
  readonly statusConfig: { label: string; className: string };
  readonly stats: {
    productCount: number;
    tierCount: number;
    unitCount: number;
  };
  readonly watchedValidity: number | null | undefined;
  readonly statValidityLabel: string;
  readonly summaryLabels: SummaryLabels;
}) {
  const t = useTranslations("vendorManagement.priceListTemplate");
  const tfl = useTranslations("field");
  const ts = useTranslations("status");

  return (
    <aside className="hidden flex-col gap-3 self-start lg:sticky lg:top-20 lg:flex">
      <GlassCard>
        <CardLabel>{summaryLabels.title}</CardLabel>
        <div className="grid gap-1.5">
          <InfoRow
            k={tfl("status")}
            v={<StatusPill statusConfig={statusConfig} inline />}
          />
          <InfoRow
            k={summaryLabels.products}
            v={stats.productCount || "—"}
            muted={!stats.productCount}
          />
          <InfoRow
            k={summaryLabels.tiers}
            v={stats.tierCount || "—"}
            muted={!stats.tierCount}
          />
          <InfoRow
            k={summaryLabels.unitsUsed}
            v={stats.unitCount || "—"}
            muted={!stats.unitCount}
          />
          <InfoRow
            k={tfl("currency")}
            v={priceListTemplate?.currency?.code || "—"}
            muted={!priceListTemplate?.currency}
          />
          <InfoRow
            k={tfl("validityPeriod")}
            v={statValidityLabel}
            muted={!watchedValidity}
          />
        </div>

        <div className="border-primary/30 bg-primary/5 mt-4 rounded-lg border p-3">
          <div className="text-primary flex items-center gap-1 text-[0.5625rem] font-bold tracking-widest uppercase">
            <Sparkles className="size-2.5" />
            {t("tipTitle")}
          </div>
          <p className="text-foreground/80 mt-1 text-[0.6875rem] leading-relaxed">
            {t("tipBody")}
          </p>
        </div>

        {!isView && (
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
                    placeholder={tfl("selectStatus")}
                    className="w-full text-xs"
                    error={form.formState.errors.status?.message}
                  >
                    <SelectContent>
                      {PRICE_LIST_TEMPLATE_STATUS_OPTIONS.map((opt) => (
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
        )}
      </GlassCard>
    </aside>
  );
}
