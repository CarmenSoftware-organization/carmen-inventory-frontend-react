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
import { usePriceCompare } from "@/hooks/use-price-list";
import { formatDate } from "@/lib/date-utils";
import { formatCurrency } from "@/lib/currency-utils";
import { computePriceAlert, pickCheaperOption } from "./pr-price-alert";
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

  // ---- ชั้นที่สอง: มีเจ้าอื่นถูกกว่าไหม ----
  // **ยิงเฉพาะแถวที่ติดธงแล้ว** — ธงชั้นแรกมาจากข้อมูลที่ยิงอยู่แล้ว จึงฟรี ส่วนชั้นนี้
  // มีค่าใช้จ่าย ถ้ายิงทุกแถวคือหนึ่ง request ต่อแถวทั้งใบ พอกรองด้วยธงก่อน ต้นทุน
  // เลยผูกกับ "จำนวนแถวที่น่าสงสัย" (ปกติ 1-2) ไม่ใช่ "จำนวนแถวทั้งหมด"
  const compareUnitId =
    useWatch({ control, name: `items.${index}.requested_unit_id` }) ?? "";
  const currencyId =
    useWatch({ control, name: `items.${index}.currency_id` }) ?? "";
  const deliveryDate =
    useWatch({ control, name: `items.${index}.delivery_date` }) ?? "";
  const currentDetailId = useWatch({
    control,
    name: `items.${index}.pricelist_detail_id`,
  });

  const { data: options } = usePriceCompare(
    {
      productId,
      unitId: compareUnitId,
      atDate: deliveryDate ? formatDate(deliveryDate, "yyyy-MM-dd") : "",
      currencyId,
    },
    !!alert,
  );

  const cheaper = pickCheaperOption(options, price, currentDetailId);

  if (!alert) return null;

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-warning-ink bg-warning/15 text-micro inline-flex cursor-help items-center gap-0.5 rounded-sm px-1 py-0.5 font-semibold tabular-nums">
            <TrendingUp className="size-3 shrink-0" aria-hidden="true" />+
            {alert.diffPct}%
            {/* มีทางเลือกที่ถูกกว่า = ข่าวที่ทำอะไรต่อได้ ไม่ใช่แค่รู้ว่าผิดปกติ
                โชว์ราคาไว้ในป้ายเลย คนกวาดตาเห็นโดยไม่ต้อง hover */}
            {cheaper && (
              <span className="border-warning-ink/30 ms-1 border-s ps-1 font-normal">
                {t("priceAlertCheaper", {
                  price: formatCurrency(cheaper.price),
                })}
              </span>
            )}
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
            {cheaper && (
              <div className="border-border/60 mt-1 border-t pt-1">
                {t("priceAlertCheaperDetail", {
                  vendor: cheaper.vendorName,
                  price: formatCurrency(cheaper.price),
                  pct: cheaper.savingPct,
                })}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
