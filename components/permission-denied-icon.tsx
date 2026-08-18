import { CalendarX, Lock } from "lucide-react";
import type { DeniedReason } from "@/components/permission-denied-dialog";

interface DeniedReasonIconProps {
  readonly reason: Exclude<DeniedReason, "permission">;
}

/**
 * ไอคอนของเหตุผล `"license"` / `"expired"` ใน `PermissionDeniedDialog`
 *
 * แยกออกมาเป็นไฟล์ต่างหาก (แทนที่จะเป็น ternary เดียวในไฟล์เดิม) เพื่อให้
 * path `reason === "permission"` ใน `permission-denied-dialog.tsx` เหลือ
 * `<ShieldOff className="text-destructive" aria-hidden />` ตัวเดิมไม่ถูกแตะเลย —
 * `permission-denied-dialog.test.tsx` (describe "chrome stays flat and
 * single-signal") ล็อกทั้งสตริงนี้และจำนวนครั้งที่คำว่า "destructive" ปรากฏใน
 * ไฟล์นั้นไว้ตรง ๆ เพื่อกันสัญญาณสีแดงซ้อนหลายจุดกลับมา (ประวัติเก่าเคยมี 9 จุด)
 *
 * สีแดงยังอยู่ที่ไอคอนจุดเดียวเหมือนเดิมตาม docs/DESIGN.md แค่ย้ายมาไว้คนละไฟล์
 */
export function DeniedReasonIcon({ reason }: DeniedReasonIconProps) {
  const Icon = reason === "license" ? Lock : CalendarX;
  return <Icon className="text-destructive" aria-hidden />;
}
