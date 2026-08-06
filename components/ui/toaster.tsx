import { useTheme } from "next-themes";
import { Toaster as SonnerToaster, type ToasterProps } from "sonner";
import {
  CircleAlert,
  CircleCheck,
  Info,
  LoaderCircle,
  TriangleAlert,
} from "lucide-react";

/**
 * Toast ของทั้งแอป — เปลือกกลาง สีความหมายอยู่ที่ไอคอนตัวเดียว
 *
 * เดิมเปิด `richColors` ของ sonner ซึ่งย้อมทั้งใบเป็นเขียว/แดง/เหลืองอิ่มตัว
 * ผิดกติกา "avoid neon" ของ docs/DESIGN.md (สีความหมายโผล่ครั้งเดียวต่อชิ้น
 * ไม่ใช่พื้น+ขอบ+ตัวหนังสือพร้อมกัน) และยังกลืนกับ badge สถานะเอกสารซึ่งเป็น
 * คนละชั้นสีกันด้วย — ท่าเดียวกับ `StatusDotBadge` ที่ให้สีอยู่ที่จุดเดียว
 *
 * ไอคอนใช้ชุด lucide เหมือนทั้งแอป (ของ sonner เป็น SVG ของตัวเองคนละทรง)
 * และย้อมด้วย `-ink` ซึ่งเป็นเวอร์ชันสำหรับตัวหนังสือ/เส้น — token สีเปล่า
 * เป็นสีพื้น เอามาวางบนพื้นอ่อนแล้วคอนทราสต์ไม่ผ่าน AA
 *
 * เปลือก/ระยะ/ตัวหนังสืออยู่ใน `styles/toast.css` เพราะ selector ของ sonner
 * แรงกว่า utility ของ Tailwind ตัวเดียว
 */
export function Toaster(props: ToasterProps) {
  const { resolvedTheme } = useTheme();

  return (
    <SonnerToaster
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      closeButton
      position="bottom-left"
      // bottom ต้องพ้นแถบสถานะด้านล่าง (StatusBar สูงราว 24px) ไม่งั้น toast
      // สองบรรทัดจะโผล่ทับหรือถูกขอบจอตัด — เดิมไม่ได้ตั้ง เลยใช้ 24px ของ sonner
      mobileOffset={{
        top: "1rem",
        left: "1rem",
        right: "1rem",
        bottom: "3rem",
      }}
      offset={{ top: "1rem", right: "1rem", left: "1rem", bottom: "2.5rem" }}
      icons={{
        // positive ไม่ใช่ success — success อยู่ที่ hue 188 ซึ่งออกเขียวอมฟ้า
        // ทีมเลือกเขียวแท้ (hue 145) เพราะสำเร็จควรอ่านว่าเขียวตั้งแต่แวบแรก
        success: <CircleCheck className="text-positive-ink size-4" />,
        error: <CircleAlert className="text-negative-ink size-4" />,
        warning: <TriangleAlert className="text-warning-ink size-4" />,
        info: <Info className="text-info-ink size-4" />,
        loading: (
          <LoaderCircle className="text-muted-foreground size-4 animate-spin" />
        ),
      }}
      {...props}
    />
  );
}
