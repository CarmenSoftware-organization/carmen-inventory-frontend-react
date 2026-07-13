import { useState } from "react";
import { useWatch, type Control } from "react-hook-form";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useProductLastReceivingByUnit } from "@/hooks/use-product-cost";
import type { PrFormValues } from "./pr-form-schema";

interface Props {
  readonly control: Control<PrFormValues>;
  readonly index: number;
  readonly buCode?: string;
}

/**
 * ไอคอน info ข้าง label U.Price — hover แล้วยิง API last-receiving (per inventory
 * unit) แบบ lazy และแสดง tooltip. ตอนนี้ tooltip แสดง "Coming soon" ก่อน
 * (ต่อ response ทีหลัง; ตอนนี้แค่ให้ call API สำเร็จ)
 */
export function PrLastReceivingInfo({ control, index, buCode }: Props) {
  "use no memo";
  const [hovered, setHovered] = useState(false);
  const productId =
    useWatch({ control, name: `items.${index}.product_id` }) ?? "";
  const unitId =
    useWatch({ control, name: `items.${index}.inventory_unit_id` }) ?? "";

  // ยิงเฉพาะเมื่อ hover (enabled) — key inventory_unit_id
  useProductLastReceivingByUnit(buCode, productId, unitId, hovered);

  if (!productId || !unitId) return null;

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
        <TooltipContent>Coming soon</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
