
import { useTranslations } from "use-intl";
import { useWatch, type Control } from "react-hook-form";
import { formatCurrency } from "@/lib/currency-utils";
import type { CnFormValues } from "./cn-form-schema";

interface CnFooterActionProps {
  readonly control: Control<CnFormValues>;
}

export function CnFooterAction({ control }: CnFooterActionProps) {
  const tfl = useTranslations("field");
  const items = useWatch({ control, name: "items" });

  let totalNet = 0;
  let totalTax = 0;
  let grandTotal = 0;
  for (const item of items) {
    totalNet += Number(item?.net_amount ?? 0);
    totalTax += Number(item?.tax_amount ?? 0);
    grandTotal += Number(item?.total_amount ?? 0);
  }
  const summary = { totalNet, totalTax, grandTotal };

  return (
    <div className="bg-background sticky bottom-0 z-20 mt-auto flex flex-wrap items-center justify-between gap-3 border-t p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:flex-nowrap sm:gap-4">
      <div className="flex items-center gap-4 text-xs tabular-nums">
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">{tfl("netAmount")}</span>
          <span className="font-semibold">
            {formatCurrency(summary.totalNet)}
          </span>
        </div>
        <span className="text-border">|</span>
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">{tfl("tax")}</span>
          <span className="font-semibold">
            {formatCurrency(summary.totalTax)}
          </span>
        </div>
        <span className="text-border">|</span>
        <div className="flex items-center gap-1.5 text-sm">
          <span className="font-semibold">{tfl("total")}</span>
          <span className="font-semibold">
            {formatCurrency(summary.grandTotal)}
          </span>
        </div>
      </div>
    </div>
  );
}
