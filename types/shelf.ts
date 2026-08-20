import type { Audit } from "./audit";

/**
 * ชั้นวางสินค้า (config) — `/api/config/{bu_code}/shelves`
 * contract จริง (2026-08-20): shelf เป็นของกลางทั้ง BU **ไม่ผูกกับ location**
 * (ร่างแรกเคยมี location_id ตาม contract เก่า ถูกถอดออกแล้ว)
 */
export interface Shelf {
  id: string;
  /** Optimistic-concurrency token — backend requires it back on PATCH update. */
  doc_version: number;
  code: string;
  name: string;
  description?: string | null;
  /** ลำดับชั้นวาง */
  sequence_no?: number | null;
  is_active: boolean;
  audit?: Audit;
}

export interface CreateShelfDto {
  code: string;
  name: string;
  description?: string;
  sequence_no?: number;
  is_active: boolean;
  /** Only sent on update for optimistic concurrency; absent on create. */
  doc_version?: number;
}
