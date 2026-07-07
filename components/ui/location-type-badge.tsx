import { useTranslations } from "use-intl";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  type INVENTORY_TYPE,
  INVENTORY_TYPE_LABEL_KEY,
  LOCATION_TYPE_DOT_COLOR,
} from "@/constant/location";

interface LocationTypeBadgeProps {
  /** ประเภทคลัง (`location_type`) */
  type: INVENTORY_TYPE;
  /** ขนาด badge — default `"sm"` สำหรับ list/grid; `"xs"` สำหรับ card ที่กระชับ */
  size?: BadgeProps["size"];
  className?: string;
}

/**
 * Badge ประเภท location มาตรฐานของทั้งแอป — ใช้ร่วมทั้ง table, card และ lookup
 *
 * รูปแบบเดียวกับ `StatusBadge`: badge กลาง (`secondary`) + **dot ที่มีสี** นำหน้า
 * (inventory = ฟ้า / direct = เหลือง / consignment = เทา) ส่วน label เป็นสีกลาง —
 * สีอยู่ที่ dot อย่างเดียว ไม่ย้อมทั้ง badge (DESIGN.md "avoid neon") แปลผ่าน i18n
 *
 * ทำให้ list (table) กับ grid (card) แสดงประเภทเหมือนกัน ไม่ drift เมื่อสลับ view
 *
 * @param type - ประเภทคลัง
 * @param size - ขนาด badge (default `"sm"`)
 * @param className - class เพิ่มเติม (เช่น `shrink-0` ใน flex layout)
 * @example
 * ```tsx
 * <LocationTypeBadge type={item.location_type} />
 * ```
 */
export function LocationTypeBadge({
  type,
  size = "sm",
  className,
}: Readonly<LocationTypeBadgeProps>) {
  const t = useTranslations("config.location");
  return (
    <Badge
      variant="secondary"
      size={size}
      className={cn("font-normal", className)}
    >
      <span
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          LOCATION_TYPE_DOT_COLOR[type],
        )}
        aria-hidden="true"
      />
      {t(INVENTORY_TYPE_LABEL_KEY[type])}
    </Badge>
  );
}
