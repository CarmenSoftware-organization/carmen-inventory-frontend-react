
import { useFormatter, useTranslations } from "use-intl";
import { useWatch, type useForm } from "react-hook-form";
import { Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUserLocation } from "@/hooks/use-user-location";
import { IA_STATUS_CONFIG } from "@/constant/inventory-adjustment";
import { formatDate } from "@/lib/date-utils";
import type {
  InventoryAdjustment,
  InventoryAdjustmentType,
} from "@/types/inventory-adjustment";
import type { AdjFormValues } from "./ia-form-schema";

interface AdjSummarySidebarProps {
  readonly form: ReturnType<typeof useForm<AdjFormValues>>;
  readonly adjustmentType: InventoryAdjustmentType;
  readonly inventoryAdjustment?: InventoryAdjustment;
  readonly adjTypeName?: string;
  readonly formatter: ReturnType<typeof useFormatter>;
  readonly dateFormat: string;
  readonly t: ReturnType<typeof useTranslations>;
  readonly tfl: ReturnType<typeof useTranslations>;
}

export function AdjSummarySidebar({
  form,
  adjustmentType,
  inventoryAdjustment,
  adjTypeName,
  formatter,
  dateFormat,
  t,
  tfl,
}: AdjSummarySidebarProps) {
  const items = useWatch({ control: form.control, name: "items" }) ?? [];
  const date = useWatch({ control: form.control, name: "date" });
  const locationId = useWatch({ control: form.control, name: "location_id" });
  const status = useWatch({ control: form.control, name: "doc_status" });

  const { data: locationData } = useUserLocation({ perpage: -1 });
  const selectedLocation = locationData?.data?.find((l) => l.id === locationId);

  const totalQty = items.reduce((sum, it) => sum + (Number(it.qty) || 0), 0);
  const grandTotal = items.reduce(
    (sum, it) => sum + (Number(it.total_cost) || 0),
    0,
  );
  const locationName =
    selectedLocation?.name ?? inventoryAdjustment?.location_name ?? "—";
  const statusKey = status ?? "draft";
  const statusConfig = IA_STATUS_CONFIG[statusKey];
  const isStockIn = adjustmentType === "stock-in";

  return (
    <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
      <Card className="gap-0 py-0">
        <CardHeader className="border-b px-5 py-3">
          <CardTitle className="text-sm font-semibold">
            {t("summary")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 px-5 py-4 text-xs">
          <SummaryRow label={tfl("status")}>
            <Badge className={statusConfig?.className} size="sm">
              {statusConfig?.label ?? statusKey}
            </Badge>
          </SummaryRow>
          <SummaryRow label={tfl("date")}>
            <span className="font-semibold">
              {date ? formatDate(date, dateFormat) : "—"}
            </span>
          </SummaryRow>
          <SummaryRow label={tfl("reason")}>
            <span className="font-semibold">{adjTypeName ?? "—"}</span>
          </SummaryRow>
          <SummaryRow label={tfl("location")}>
            <span className="max-w-[60%] truncate text-right font-semibold">
              {locationName}
            </span>
          </SummaryRow>
          <SummaryRow label={t("lines")}>
            <span className="tabular-nums">{items.length}</span>
          </SummaryRow>
          <SummaryRow label={tfl("totalQty")}>
            <span className="tabular-nums">{formatter.number(totalQty)}</span>
          </SummaryRow>
          <div className="flex items-baseline justify-between border-t pt-3">
            <span className="text-muted-foreground text-sm">
              {t("grandTotal")}
            </span>
            <span className="text-primary text-xl font-bold tabular-nums">
              {formatter.number(grandTotal, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="border-primary/20 bg-primary/5 flex gap-3 rounded-xl border p-4">
        <Info className="text-primary mt-0.5 size-4 shrink-0" aria-hidden />
        <div className="space-y-1">
          <div className="text-primary text-xs font-semibold">
            {isStockIn ? t("postingWillIncrease") : t("postingWillDecrease")}
          </div>
          <div className="text-primary/80 text-xs leading-relaxed">
            {isStockIn
              ? t("postingInfoStockIn", {
                  location: locationName,
                  qty: formatter.number(totalQty),
                })
              : t("postingInfoStockOut", {
                  location: locationName,
                  qty: formatter.number(totalQty),
                })}
          </div>
        </div>
      </div>
    </aside>
  );
}

function SummaryRow({
  label,
  children,
}: {
  readonly label: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}
