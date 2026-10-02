import { isoToDateInput } from "@/lib/date-utils";
import type { InventoryPeriod } from "@/types/inventory-period";

/**
 * ตำแหน่งของรอบบนเส้นเวลา เทียบกับวันนี้
 *
 * `status` จาก backend บอกแค่ lifecycle (open/closed/locked) แต่สิ่งที่ผู้ใช้หน้านี้
 * ต้องเห็นคือรอบที่ **เลยวันสิ้นรอบไปแล้วแต่ยังเปิดอยู่** (ค้างปิด) ซึ่งต้องคิดจากวันที่
 * - `overdue`  — open และ end_at < วันนี้
 * - `active`   — open และวันนี้อยู่ในช่วง start_at..end_at
 * - `upcoming` — open และ start_at > วันนี้
 */
export type InventoryPeriodPhase =
  | "closed"
  | "locked"
  | "overdue"
  | "active"
  | "upcoming";

/**
 * คำนวณ phase ของรอบ เทียบแบบทั้งวันผ่าน `isoToDateInput` (local time) ไม่ใช่
 * `slice(0,10)` — backend ส่ง ISO แบบ UTC ตัดดิบบน UTC+7 จะคลาดไปหนึ่งวัน
 *
 * @param period - รอบที่ต้องการ
 * @param today - วันนี้ในรูป `YYYY-MM-DD` (local)
 */
export function getInventoryPeriodPhase(
  period: Pick<InventoryPeriod, "status" | "start_at" | "end_at">,
  today: string,
): InventoryPeriodPhase {
  if (period.status === "closed") return "closed";
  if (period.status === "locked") return "locked";
  const end = isoToDateInput(period.end_at);
  const start = isoToDateInput(period.start_at);
  if (end && end < today) return "overdue";
  if (start && start > today) return "upcoming";
  return "active";
}

/** วันนี้ในรูป `YYYY-MM-DD` ตามเวลาเครื่อง */
export function todayDateInput(): string {
  return isoToDateInput(new Date().toISOString());
}
