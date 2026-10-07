/**
 * แถวของ `GET /api/:bu_code/lookup/:resource` — ทุก resource คืน shape เดียวกัน
 * ฟิลด์ที่ตารางไม่มีเป็น `null` (เช่น `unit.code`) · `status` เป็น "active" /
 * "inactive" / "deleted" หรือค่า enum ของตารางนั้น
 */
export interface LookupItem {
  id: string;
  code: string | null;
  name: string | null;
  description: string | null;
  status: string;
}

/**
 * resource ที่ FE ใช้จริง — ชื่อต้องตรงกับ `LOOKUP_CATALOG` ของ backend
 * (`apps/backend-gateway/src/application/lookup/lookup-catalog.ts`)
 * เพิ่มเมื่อย้าย lookup ตัวใหม่ ไม่ดึง catalog ตอน runtime
 */
export type LookupResource =
  | "unit"
  | "recipe_cuisine"
  | "recipe_equipment_category"
  | "extra_cost_type"
  | "location_shelf"
  | "credit_note_reason"
  | "delivery_point"
  | "department"
  | "pricelist_template"
  | "vendor"
  | "product"
  | "product_category";

/** `mine` = ค่าเริ่มต้นของ backend · master ที่ผูก user (department/location) `mine` คืนเฉพาะที่ assign ให้ user */
export type LookupScope = "mine" | "all";

/** ป้ายสำรองของแถว lookup — `name` ก่อน ไม่มีค่อยใช้ `code` */
export const lookupLabel = (item: LookupItem): string =>
  item.name ?? item.code ?? "";
