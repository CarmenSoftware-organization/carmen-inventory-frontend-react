import type { Audit } from "./audit";

/**
 * ชั้นวางสินค้า (config) — **backend ยังไม่มี endpoint นี้** หน้าถูกสร้างรอไว้
 * contract ตามตัวอย่าง response ที่ทีม backend ให้มา:
 * `/api/config/{bu_code}/shelves` — shelf ผูกกับ location หนึ่งตัว
 */
export interface Shelf {
  id: string;
  /** Optimistic-concurrency token — backend requires it back on PATCH update. */
  doc_version: number;
  location_id: string;
  location_code?: string;
  location_name?: string;
  code: string;
  name: string;
  description?: string | null;
  /** ลำดับชั้นวางภายใน location */
  sequence_no?: number | null;
  is_active: boolean;
  audit?: Audit;
}

export interface CreateShelfDto {
  location_id: string;
  code: string;
  name: string;
  description?: string;
  sequence_no?: number;
  is_active: boolean;
  /** Only sent on update for optimistic concurrency; absent on create. */
  doc_version?: number;
}
