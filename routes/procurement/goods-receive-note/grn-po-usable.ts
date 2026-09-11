import type { PoForGrn, PoGrnDetail } from "@/types/purchase-order";

/**
 * `can_use` มาสามชั้น — ใบสั่งซื้อ · รายการ · คลัง — และชั้นบนคุมชั้นล่างเสมอ
 *
 * **เทียบกับ `false` ตรง ๆ ไม่ตีเป็น boolean** — หลังบ้านรุ่นที่ยังไม่ส่งฟิลด์นี้มา
 * ต้องถือว่าใช้ได้ ไม่ใช่ล็อกทั้งหน้าจอเงียบ ๆ
 */
const allowed = (canUse?: boolean) => canUse !== false;

/** ใบนี้รับของได้ไหม */
export function isPoUsable(po: PoForGrn): boolean {
  return allowed(po.can_use);
}

/** รายการนี้รับของได้ไหม — ใบต้องใช้ได้ด้วย */
export function isDetailUsable(po: PoForGrn, detail: PoGrnDetail): boolean {
  return allowed(po.can_use) && allowed(detail.can_use);
}

/**
 * คลังที่รับของได้ของรายการนี้
 *
 * ใบหรือรายการใช้ไม่ได้ = ไม่เหลือคลังให้รับเลย ไม่ใช่คืนทั้งหมดแล้วไปกรองทีหลัง
 */
export function usableLocations(po: PoForGrn, detail: PoGrnDetail) {
  if (!isDetailUsable(po, detail)) return [];
  return (detail.locations ?? []).filter((loc) => allowed(loc.can_use));
}

/**
 * id ของรายการทั้งหมดที่ติ๊กได้ในใบชุดนี้ — ใช้ทั้งกับปุ่ม "เลือกทั้งหมด" และกับ
 * การตัดสินว่าหัวใบถูกติ๊กครบหรือยัง
 *
 * รายการที่ทุกคลังใช้ไม่ได้ก็ติ๊กไม่ได้ — ติ๊กไปก็ไม่มีอะไรให้รับ แล้วจะได้ใบรับ
 * สินค้าที่ไม่มีรายการสักแถว
 */
export function selectableDetailIds(poList: readonly PoForGrn[]): string[] {
  return poList.flatMap((po) =>
    po.po_detail
      .filter(
        (d) =>
          isDetailUsable(po, d) &&
          // รายการที่ไม่มีคลังติดมาเลยยังรับได้ (ผู้ใช้เลือกคลังเองในฟอร์ม)
          (d.locations?.length ? usableLocations(po, d).length > 0 : true),
      )
      .map((d) => d.id),
  );
}

/**
 * ใบสั่งซื้อเฉพาะที่มีรายการถูกติ๊ก — แต่ละใบเหลือ `po_detail` แค่รายการที่เลือก
 *
 * ทั้ง wizard และ dialog ต่างก็ต้องแปลงชุด id ที่ติ๊กกลับเป็นใบสั่งซื้อก่อนส่งต่อ
 * ให้ฟอร์ม ปล่อยให้ต่างคนต่างวนเองแล้ววันหนึ่งจะกรองคนละเกณฑ์
 */
export function pickSelectedPos(
  poList: readonly PoForGrn[],
  selected: ReadonlySet<string>,
): PoForGrn[] {
  const result: PoForGrn[] = [];
  for (const po of poList) {
    const details = po.po_detail.filter((d) => selected.has(d.id));
    if (details.length > 0) result.push({ ...po, po_detail: details });
  }
  return result;
}
