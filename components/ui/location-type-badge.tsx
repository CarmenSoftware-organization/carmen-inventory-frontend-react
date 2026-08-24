import { useTranslations } from "use-intl";
import { type BadgeProps } from "@/components/ui/badge";
import { StatusIconLabel } from "@/components/ui/status-icon-label";
import { cn } from "@/lib/utils";
import {
  type INVENTORY_TYPE,
  INVENTORY_TYPE_LABEL_KEY,
} from "@/constant/location";

interface LocationTypeBadgeProps {
  /** ประเภทคลัง (`location_type`) */
  type: INVENTORY_TYPE;
  /** เดิมคุมขนาด badge — คงไว้ไม่ให้ call site เดิมพัง แต่ไม่มีผลกับป้ายแบบใหม่แล้ว */
  size?: BadgeProps["size"];
  className?: string;
}

/**
 * ประเภท location มาตรฐานของทั้งแอป — ใช้ร่วมทั้ง table, card และ lookup
 *
 * **ไอคอนไม่มีสี + ป้าย ไม่มีกรอบ chip** ทรงเดียวกับชนิดเอกสารของ PO/GRN/CN/SR
 * (คลัง = โกดัง · ซื้อตรง = รถส่งของ · ฝากขาย = จับมือ) ประเภทคลังเป็นคุณสมบัติ
 * ไม่ใช่ความคืบหน้า จึงไม่ให้สี — สีสงวนไว้ให้สถานะซึ่งเป็นสิ่งที่คนกวาดตาหา
 *
 * ทำให้ list (table) กับ grid (card) แสดงประเภทเหมือนกัน ไม่ drift เมื่อสลับ view
 *
 * @param type - ประเภทคลัง
 * @param size - รับไว้เพื่อความเข้ากันได้กับที่เรียกเดิม (ไม่มีผลแล้ว ป้ายขนาดเดียว)
 * @param className - class เพิ่มเติม (เช่น `shrink-0` ใน flex layout)
 * @example
 * ```tsx
 * <LocationTypeBadge type={item.location_type} />
 * ```
 */
export function LocationTypeBadge({
  type,
  className,
}: Readonly<LocationTypeBadgeProps>) {
  const t = useTranslations("config.location");
  return (
    <StatusIconLabel
      status={type}
      label={t(INVENTORY_TYPE_LABEL_KEY[type])}
      className={cn("text-muted-foreground", className)}
    />
  );
}
