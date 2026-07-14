import { useState } from "react";
import { useWatch, type Control } from "react-hook-form";
import { Info } from "lucide-react";
import { useTranslations } from "use-intl";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useProductLastReceivingByUnit } from "@/hooks/use-product-cost";
import { formatCurrency } from "@/lib/currency-utils";
import type { PrFormValues } from "./pr-form-schema";

interface Props {
  readonly control: Control<PrFormValues>;
  readonly index: number;
  readonly buCode?: string;
}

/**
 * ไอคอน info ข้าง label U.Price — hover แล้วยิง API last-receiving (per inventory
 * unit) แบบ lazy และแสดง tooltip ต้นทุนต่อหน่วยครั้งล่าสุดที่รับเข้า + เอกสารต้นทาง
 */
export function PrLastReceivingInfo({ control, index, buCode }: Props) {
  "use no memo";
  const t = useTranslations("procurement.purchaseRequest");
  const [hovered, setHovered] = useState(false);
  const productId =
    useWatch({ control, name: `items.${index}.product_id` }) ?? "";
  const unitId =
    useWatch({ control, name: `items.${index}.inventory_unit_id` }) ?? "";

  // ยิงเฉพาะเมื่อ hover (enabled) — key inventory_unit_id
  const { data, isFetching } = useProductLastReceivingByUnit(
    buCode,
    productId,
    unitId,
    hovered,
  );

  if (!productId || !unitId) return null;

  const loading = isFetching && data === undefined;
  // data อาจกลับมาเป็น object แต่ไม่มี cost_per_unit → กัน formatCurrency(undefined) crash
  const cost = data?.cost_per_unit;
  const hasCost = typeof cost === "number" && Number.isFinite(cost);

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip onOpenChange={(open) => open && setHovered(true)}>
        <TooltipTrigger asChild>
          <span
            onMouseEnter={() => setHovered(true)}
            className="text-muted-foreground hover:text-foreground inline-flex cursor-help items-center"
            aria-label="last receiving cost"
          >
            <Info className="size-3" />
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-0.5 text-xs">
            <div className="font-semibold">{t("lastReceiving")}</div>
            {loading ? (
              <div className="text-muted-foreground">…</div>
            ) : hasCost ? (
              <>
                <div className="tabular-nums">
                  {formatCurrency(cost)}
                  {data?.currency_code ? ` ${data.currency_code}` : ""}
                </div>
                {data?.no && (
                  <div className="text-muted-foreground">{data.no}</div>
                )}
              </>
            ) : (
              <div className="text-muted-foreground">
                {t("lastReceivingNone")}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
