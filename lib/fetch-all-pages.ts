import type { PaginatedResponse } from "@/types/params";

/** เพดาน perpage ที่ backend ยอมรับ (ช่วง 4c ปิด `-1` และบังคับเพดานนี้) — ห้ามส่งเกิน */
export const MAX_PERPAGE = 100;

/**
 * ดึงทุกแถวของ list endpoint แบบวนหน้า แทนการขอทั้งทะเบียนในครั้งเดียว
 *
 * ยิงหน้า 1 ก่อนเพื่อรู้จำนวนหน้า แล้วยิงหน้าที่เหลือพร้อมกัน ต่อผลตามลำดับหน้า
 * หน้าไหนพัง = ทั้งก้อน reject (ไม่คืนข้อมูลครึ่งเดียวเงียบ ๆ)
 * ใช้กับทะเบียนที่ต้องได้ครบจริงเท่านั้น (จัดกลุ่ม / ติ๊กทั้งกลุ่ม / พิมพ์) —
 * dropdown ทั่วไปใช้ `useLookupPagination`
 */
export async function fetchAllPages<T>(
  fetchPage: (page: number, perpage: number) => Promise<PaginatedResponse<T>>,
): Promise<T[]> {
  const first = await fetchPage(1, MAX_PERPAGE);
  const pages = Math.max(1, Number(first?.paginate?.pages) || 1);
  const rest = await Promise.all(
    Array.from({ length: pages - 1 }, (_, i) => fetchPage(i + 2, MAX_PERPAGE)),
  );
  return [first, ...rest].flatMap((r) =>
    Array.isArray(r?.data) ? r.data : [],
  );
}
