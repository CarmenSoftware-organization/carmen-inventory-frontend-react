import {
  getLocalItem,
  removeLocalItem,
  setLocalItem,
} from "@/lib/safe-storage";

/**
 * จำค่าพารามิเตอร์ที่กดเรียกดูรายงานล่าสุด — เปิดรายงานเดิมซ้ำเพื่อเทียบผล
 * ไม่ต้องกรอกใหม่ทุกครั้ง
 *
 * - แยกตาม BU + รายงาน: รหัสสินค้า/คลัง/งวดของ BU หนึ่งไม่มีความหมายในอีก BU
 * - อายุ 30 นาทีนับจากการกด "เรียกดูรายงาน" ครั้งล่าสุด — พ้นนั้นกลับไปใช้ค่าตั้งต้น
 *   ของรายงาน (เช่น งวดล่าสุด, วันนี้) เพราะค่าที่ค้างข้ามวันมักไม่ใช่สิ่งที่ตั้งใจ
 * - เก็บป้ายชื่อของช่องเลือกด้วย: ตัวเลือกที่ได้จากการค้นฝั่ง server อาจไม่อยู่ใน
 *   รายการตั้งต้น (500 แถวแรก) ถ้าไม่มีป้าย ปุ่มจะโชว์ว่างทั้งที่มีค่าอยู่
 * - localStorage อ่าน/เขียนไม่ได้ (private mode, block storage) = ไม่จำ ไม่ error
 */

export const REPORT_PARAM_TTL_MS = 30 * 60 * 1000;

const KEY_PREFIX = "carmen.report-params";

export interface RememberedReportParams {
  /** ชื่อ control → ค่าที่ส่งไปตอนกดเรียกดู */
  readonly values: Record<string, string>;
  /** ชื่อ control → ป้ายที่แสดงบนช่องเลือก (เฉพาะช่องที่ค้นหาได้) */
  readonly labels: Record<string, string>;
}

interface StoredReportParams extends RememberedReportParams {
  readonly savedAt: number;
}

/**
 * คีย์ของรายงานหนึ่งใน BU หนึ่ง
 *
 * @param buCode - BU ที่กำลังใช้งาน
 * @param reportId - id ของ template รายงาน
 * @returns คีย์ localStorage
 */
export function reportParamKey(buCode: string, reportId: string): string {
  return `${KEY_PREFIX}:${buCode}:${reportId}`;
}

/**
 * ค่าที่จำไว้ ถ้ายังไม่หมดอายุ — หมดอายุแล้วลบทิ้งในตัว
 *
 * @param key - จาก {@link reportParamKey}
 * @param now - เวลาปัจจุบัน (ms)
 * @returns ค่าที่จำไว้ หรือ undefined
 */
export function loadReportParams(
  key: string,
  now: number = Date.now(),
): RememberedReportParams | undefined {
  const stored = getLocalItem<StoredReportParams>(key);
  if (!stored || typeof stored.savedAt !== "number" || !stored.values) {
    return undefined;
  }
  if (now - stored.savedAt > REPORT_PARAM_TTL_MS) {
    removeLocalItem(key);
    return undefined;
  }
  return { values: stored.values, labels: stored.labels ?? {} };
}

/**
 * จำค่าที่เพิ่งกดเรียกดู — นับอายุใหม่ทุกครั้ง
 *
 * @param key - จาก {@link reportParamKey}
 * @param params - ค่าและป้ายของแต่ละ control
 * @param now - เวลาปัจจุบัน (ms)
 */
export function saveReportParams(
  key: string,
  params: RememberedReportParams,
  now: number = Date.now(),
): void {
  setLocalItem<StoredReportParams>(key, { ...params, savedAt: now });
}

/**
 * ลืมค่าที่จำไว้ของรายงานนี้ (ปุ่ม "ค่าเริ่มต้น")
 *
 * @param key - จาก {@link reportParamKey}
 */
export function forgetReportParams(key: string): void {
  removeLocalItem(key);
}
