import type { Audit } from "./audit";

/**
 * ชั้นวางสินค้า (config) — **backend ยังไม่มี endpoint นี้** หน้าถูกสร้างรอไว้
 * contract ที่คาดหวัง: `/api/config/{bu_code}/shelves` ทรงเดียวกับ config
 * entity อื่น (business-type) — ถ้า backend ลงต่างจากนี้ให้แก้ type นี้ตาม
 */
export interface Shelf {
  id: string;
  /** Optimistic-concurrency token — backend requires it back on PATCH update. */
  doc_version: number;
  name: string;
  is_active: boolean;
  audit?: Audit;
}

export interface CreateShelfDto {
  name: string;
  is_active: boolean;
  /** Only sent on update for optimistic concurrency; absent on create. */
  doc_version?: number;
}
