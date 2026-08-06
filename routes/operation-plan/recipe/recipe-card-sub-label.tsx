import { cn } from "@/lib/utils";

/**
 * Label ย่อยในการ์ดสูตรอาหาร — ตัวพิมพ์ใหญ่ tracking กว้าง หนากว่า `EyeBrow` กลาง
 * เล็กน้อย (font-bold + text-foreground/80) ใช้กำกับกลุ่มย่อยในหัวข้อ compliance
 *
 * @param children - ข้อความ label
 * @param className - class เสริม (เช่น flex/gap เวลามีไอคอนนำ)
 * @returns JSX element ของ label
 */
export function CardSubLabel({
  children,
  className,
}: {
  readonly children: React.ReactNode;
  readonly className?: string;
}) {
  return (
    <div
      className={cn(
        "text-micro-legal text-foreground/80 font-bold tracking-[0.12em] uppercase",
        className,
      )}
    >
      {children}
    </div>
  );
}
