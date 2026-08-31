import type { LastAction } from "@/types/last-action";

/**
 * ค่า `last_action.state` ที่แปลว่า "เอกสารถูกตีกลับให้กลับไปแก้"
 *
 * enum `enum_last_action` ฝั่ง DB เก็บเป็นรูปอดีต (`reviewed`) ซึ่ง**คนละค่ากับ**
 * ชื่อ action ที่ frontend ยิงไปตอนกดปุ่ม Send Back (รูปกริยา `review` — ดู
 * `ActionPr` ใน `types/stage-role.ts`) สองอย่างนี้อยู่คนละชั้น อย่าเอามาเทียบกันตรง ๆ
 * ฝั่งที่เขียนค่านี้ลง DB คือ `buildReviewWorkflow` ของ backend ซึ่งมีผู้เรียก
 * แค่ PR / PO / SR เท่านั้น (GRN ไม่มีเส้นทางตีกลับ จึงไม่มีคอลัมน์นี้ในหน้า GRN)
 */
export const SENDBACK_STATE = "reviewed";

/**
 * filter clause สำหรับ query param `filter` เพื่อเอาเฉพาะใบที่ค้างอยู่ในสถานะถูกตีกลับ
 *
 * backend แปลงด้วย `QueryParams.castFilterValue` แบบ generic — type ที่ไม่ใช่
 * number/bool/date/contains จะกลายเป็น equals ตรง ๆ ซึ่งใช้กับคอลัมน์ enum ได้
 */
export const SENDBACK_FILTER_CLAUSE = `last_action|string:${SENDBACK_STATE}`;

/** แถวเอกสารใด ๆ ที่มี last-action object ติดมาจาก list/detail endpoint */
export interface RowWithLastAction {
  last_action?: LastAction | null;
}

/**
 * เอกสารใบนี้ "ค้างอยู่ในสถานะถูกตีกลับ" อยู่หรือไม่
 *
 * อ่านจาก action ล่าสุดเท่านั้น — พอผู้ขอแก้แล้วส่งใหม่ `state` จะกลายเป็น
 * `submitted` แล้วฟังก์ชันนี้คืน false ทันที **ไม่ใช่** "เคยถูกตีกลับไหม"
 * ซึ่งต้องไปไล่อ่าน `workflow_history` แทน
 *
 * @param lastAction - อ็อบเจกต์ last_action จาก API (null ได้ถ้ายังไม่เคยมี action)
 * @returns true ถ้า action ล่าสุดคือการตีกลับ
 * @example
 * ```ts
 * if (isSentBack(pr.last_action)) showSendBackStatus();
 * ```
 */
export function isSentBack(lastAction?: LastAction | null): boolean {
  return lastAction?.state === SENDBACK_STATE;
}
