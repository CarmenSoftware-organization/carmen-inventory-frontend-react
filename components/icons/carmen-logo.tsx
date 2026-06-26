import { cn } from "@/lib/utils";
import carmenLogoUrl from "./carmen-logo.svg";

type CarmenLogoProps = {
  readonly variant?: "mark" | "lockup";
  readonly size?: number;
  readonly className?: string;
  readonly title?: string;
};

/**
 * โลโก้ Carmen — render จากไฟล์ SVG ของแบรนด์ (`./carmen-logo.svg`)
 *
 * - `mark` (default): ไอคอนสี่เหลี่ยมจัตุรัสล้วน — ใช้ใน sidebar / login / favicon-สัดส่วน
 * - `lockup`: ไอคอน + ตัวอักษร "Carmen"
 *
 * @param variant - รูปแบบโลโก้
 * @param size - ขนาด (px) ทั้งกว้างและสูง (โลโก้เป็นจัตุรัส)
 * @param className - class เพิ่มเติม (ใส่ที่ img สำหรับ mark, ที่ wrapper สำหรับ lockup)
 * @param title - ข้อความ alt / aria-label
 */
export function CarmenLogo({
  variant = "mark",
  size = 32,
  className,
  title = "Carmen",
}: CarmenLogoProps) {
  const mark = (
    <img
      src={carmenLogoUrl}
      width={size}
      height={size}
      alt={title}
      className={variant === "lockup" ? undefined : className}
    />
  );

  if (variant === "lockup") {
    return (
      <div
        className={cn("inline-flex items-center gap-2", className)}
        aria-label={title}
      >
        {mark}
        <span
          className="text-foreground font-bold tracking-tight"
          style={{
            fontSize: `${size * 0.625}px`,
            letterSpacing: "-0.02em",
            lineHeight: 1,
          }}
        >
          Carmen
        </span>
      </div>
    );
  }

  return mark;
}
