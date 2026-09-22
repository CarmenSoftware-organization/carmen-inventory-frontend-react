import { useTranslations } from "use-intl";
import { History } from "lucide-react";
import { useProfile } from "@/hooks/use-profile";
import { formatCurrency } from "@/lib/currency-utils";
import { cn } from "@/lib/utils";
import type { LastPrice } from "@/types/last-price";

/** ราคาซื้อล่าสุดของสินค้า — ไม่เคยซื้อ (`null`) ก็ไม่ต้องมีที่ยืน */
export function LastPriceChip({
  lastPrice,
  className,
}: {
  readonly lastPrice?: LastPrice | null;
  readonly className?: string;
}) {
  const t = useTranslations("procurement.purchaseRequest");
  const { defaultCurrencyCode } = useProfile();

  if (!lastPrice) return null;

  return (
    <span
      className={cn(
        "text-muted-foreground text-micro inline-flex items-center gap-1",
        className,
      )}
    >
      <History className="size-3" />
      {t("lastPrice")}:{" "}
      <span className="text-foreground font-semibold tabular-nums">
        {formatCurrency(lastPrice.cost_per_unit)}
      </span>
      {defaultCurrencyCode}
    </span>
  );
}
