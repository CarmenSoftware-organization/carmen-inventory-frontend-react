/**
 * entity reference ที่ API ส่งมา — คีย์ที่ไม่มีในเอกสารนั้นจะไม่ถูกส่งมาเลย
 *
 * เกิดจาก backend `@CollapseRefs()` ยุบคู่ flat field (`<base>_id` + `<base>_name`
 * ฯลฯ) ให้เป็น object เดียว `<base>: { id, name, ... }` — ถ้า id เป็น null ทั้งก้อน
 * จะถูกส่งเป็น `<base>: null` เสมอ **ไม่ใช่** `{ id: null }` ดังนั้นทุกจุดที่อ่าน
 * ต้อง null-check ตัว object เอง ก่อนจะ optional-chain เข้าไปอ่าน `name`/`code`
 *
 * ห้ามประกาศ shape นี้ซ้ำในไฟล์อื่น — import จากที่นี่เสมอ
 */
export interface EntityRef {
  id: string;
  name?: string | null;
  local_name?: string | null;
  code?: string | null;
  symbol?: string | null;
}
