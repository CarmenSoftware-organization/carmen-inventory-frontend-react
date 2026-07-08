import { useTranslations } from "use-intl";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  /** สถานะ active/inactive ของ entity (อ่านจาก `is_active`) */
  active: boolean;
  /** ขนาด badge — default `"sm"` สำหรับ list/grid; `"xs"` สำหรับหัวฟอร์มที่กระชับ */
  size?: "xs" | "sm";
  className?: string;
}

/**
 * Badge สถานะ active/inactive มาตรฐานของทั้งแอป — ใช้ร่วมทั้ง card และ table
 *
 * รูปแบบเดียวกันทุกที่: badge กลาง (`secondary`) + **dot ที่มีสี** นำหน้า
 * (เขียว `bg-success` = active / เทา = inactive) ส่วน label เป็นสีกลาง —
 * สีอยู่ที่ dot อย่างเดียว ไม่ย้อมทั้ง badge label แปลผ่าน i18n
 *
 * ทำให้ list (table) กับ grid (card) แสดงสถานะเหมือนกัน ไม่ drift เมื่อสลับ view
 *
 * @param active - true = ใช้งาน, false = ไม่ใช้งาน
 * @param size - ขนาด badge (default `"sm"`)
 * @param className - class เพิ่มเติม (เช่น `shrink-0` ใน flex layout)
 * @example
 * ```tsx
 * <StatusBadge active={item.is_active} />
 * ```
 */
export function StatusBadge({
  active,
  size = "sm",
  className,
}: Readonly<StatusBadgeProps>) {
  const ts = useTranslations("status");
  return (
    <Badge
      variant="secondary"
      size={size}
      className={cn("font-normal", className)}
    >
      <span
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          active ? "bg-success" : "bg-muted-foreground/50",
        )}
        aria-hidden="true"
      />
      {active ? ts("active") : ts("inactive")}
    </Badge>
  );
}
