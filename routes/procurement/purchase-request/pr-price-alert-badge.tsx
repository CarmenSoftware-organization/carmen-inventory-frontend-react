import { useWatch, type Control } from "react-hook-form";
import { useTranslations } from "use-intl";
import { TrendingUp } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useProductLastReceivingByUnit } from "@/hooks/use-product-cost";
import { formatCurrency } from "@/lib/currency-utils";
import { computePriceAlert } from "./pr-price-alert";
import type { PrFormValues } from "./pr-form-schema";

interface Props {
  readonly control: Control<PrFormValues>;
  readonly index: number;
  readonly buCode?: string;
}

/**
 * ป้าย "แพงกว่าครั้งก่อน N%" ข้างยอดเงินของแถว
 *
 * **ยิงเองตั้งแต่แถวถูกแสดง ไม่รอ hover** — ต่างจาก `PrLastReceivingInfo` ที่อยู่ใน
 * แถวขยาย (ต้องกดกางก่อน) แล้วยังต้องเอาเมาส์ไปชี้อีกที ตัวนี้อยู่ในแถวปกติและ
 * โผล่เอง เพราะจุดประสงค์คือให้คนอนุมัติเห็นโดยไม่ต้องสงสัยก่อน
 *
 * คิวรีถูก cache ต่อ (product, unit) — สินค้าซ้ำในใบเดียวยิงครั้งเดียว และคืนค่า
 * `null` เงียบ ๆ ทุกกรณีที่เทียบไม่ได้ (ยังไม่เคยรับเข้า/ยังไม่กรอกราคา) ไม่ใช่โชว์
 * ช่องว่างหรือขีดไว้ให้รก
 */
export function PrPriceAlertBadge({ control, index, buCode }: Props) {
  "use no memo";
  const t = useTranslations("procurement.purchaseRequest");
  const productId =
    useWatch({ control, name: `items.${index}.product_id` }) ?? "";
  const unitId =
    useWatch({ control, name: `items.${index}.inventory_unit_id` }) ?? "";
  const price = useWatch({ control, name: `items.${index}.pricelist_price` });

  const { data } = useProductLastReceivingByUnit(
    buCode,
    productId,
    unitId,
    !!productId && !!unitId,
  );

  const alert = computePriceAlert(price, data?.cost_per_unit);
  if (!alert) return null;

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-warning-ink bg-warning/15 text-micro inline-flex cursor-help items-center gap-0.5 rounded-sm px-1 py-0.5 font-semibold tabular-nums">
            <TrendingUp className="size-3 shrink-0" aria-hidden="true" />+
            {alert.diffPct}%
          </span>
        </TooltipTrigger>
        <TooltipContent>
          {/* บอกให้ครบว่าเทียบกับอะไร ไม่ใช่แค่ตัวเลข % ลอย ๆ — คนอนุมัติต้องตัดสิน
              ได้ว่าจะปล่อยผ่านหรือถาม ไม่ใช่แค่รู้ว่ามีอะไรผิดปกติ */}
          <div className="space-y-0.5 text-xs">
            <div className="font-semibold">
              {t("priceAlertTitle", { pct: alert.diffPct })}
            </div>
            <div className="text-muted-foreground tabular-nums">
              {t("priceAlertLastCost", {
                cost: formatCurrency(alert.lastCost),
              })}
            </div>
            {data?.vendor_name && (
              <div className="text-muted-foreground">{data.vendor_name}</div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
