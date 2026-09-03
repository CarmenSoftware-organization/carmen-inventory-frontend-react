import { ArrowLeft } from "lucide-react";
import { useTranslations } from "use-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BackButtonProps {
  readonly onClick: () => void;
  /**
   * aria-label — ไม่ส่ง = ใช้ `common.goBack` ส่งเองเฉพาะตอนที่ปลายทางเจาะจงกว่า
   * ("กลับไปหน้ารายการใบขอซื้อ") ห้ามส่งข้อความ hardcode ที่ไม่ผ่าน i18n
   */
  readonly label?: string;
  readonly className?: string;
}

/**
 * ปุ่มย้อนกลับของทั้งแอป — icon-only ghost ขนาด icon-sm ไม่มี hover background
 *
 * เป็นจุดเดียวที่นิยามหน้าตาปุ่ม back อย่าประกอบ `<Button><ArrowLeft /></Button>`
 * เองในหน้าใหม่ ตำแหน่ง/ระยะห่างส่งผ่าน `className` ได้ (เช่น `mt-0.5` ให้ตรงกับ
 * title สองบรรทัด, absolute ของ DocFormHeader) แต่ variant/size/icon ไม่ควรทับ
 */
export function BackButton({ onClick, label, className }: BackButtonProps) {
  const tc = useTranslations("common");
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={onClick}
      aria-label={label ?? tc("goBack")}
      className={cn(
        "hover:bg-transparent dark:hover:bg-transparent",
        className,
      )}
    >
      <ArrowLeft />
    </Button>
  );
}
