import { cn } from "@/lib/utils";

/**
 * Overline / eyebrow label มาตรฐานเดียวของแอป
 *
 * ข้อความ micro-label สี muted ตัวพิมพ์ใหญ่ tracking กว้าง — ใช้เป็นหัวข้อ
 * section เล็ก (เช่นใน item-expanded / dialog / hero) ให้ทั้งแอปหน้าตาเดียวกัน
 * เป็น typography token ล้วน ไม่ผูก margin (spacing จัดที่ container เช่น space-y
 * หรือส่ง className="mb-2" เอง) เปลี่ยน element/attribute ผ่าน props ได้
 *
 * @param children - ข้อความ label
 * @param className - class เสริม (เช่น margin/สี override)
 * @returns JSX element ของ overline label
 * @example
 * ```tsx
 * <EyeBrow>Tax & Discount</EyeBrow>
 * <EyeBrow className="mb-2">{t("kicker")}</EyeBrow>
 * ```
 */
export function EyeBrow({
  children,
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="eyebrow"
      className={cn(
        "text-muted-foreground text-[0.625rem] font-semibold tracking-wider uppercase",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
