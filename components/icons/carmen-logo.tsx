// ไฟล์อยู่ที่ public/carmen-logo.svg (ใช้ร่วมกับ favicon) — อ้างด้วย path ตรง
const carmenLogoUrl = "/carmen-logo.svg";

type CarmenLogoProps = {
  readonly variant?: "mark" | "lockup";
  readonly size?: number;
  readonly title?: string;
};

/**
 * โลโก้ Carmen — render จากไฟล์ SVG ของแบรนด์ (`./carmen-logo.svg`)
 *
 * - `mark` (default): ไอคอนล้วน
 * - `lockup`: ไอคอน + ตัวอักษร "Carmen"
 *
 * ไม่มี CSS/className ใดๆ นอกจาก `size` (กว้าง/สูงของไอคอน)
 */
export function CarmenLogo({
  variant = "mark",
  size = 32,
  title = "Carmen",
}: CarmenLogoProps) {
  const mark = (
    <img src={carmenLogoUrl} width={size} height={size} alt={title} />
  );

  if (variant === "lockup") {
    return (
      <span>
        {mark} Carmen
      </span>
    );
  }

  return mark;
}
