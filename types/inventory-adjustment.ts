import type { Audit } from "./audit";
import type { EntityRef } from "./entity-ref";

export type InventoryAdjustmentType = "stock-in" | "stock-out";
export type InventoryAdjustmentStatus =
  | "in_progress"
  | "completed"
  | "draft"
  | "voided";

export const INVENTORY_ADJUSTMENT_BASE_PATH =
  "/inventory-management/inventory-adjustment";

export const getAdjustmentType = (
  item: Pick<InventoryAdjustment, "si_no">,
): InventoryAdjustmentType => (item.si_no ? "stock-in" : "stock-out");

interface InventoryAdjustmentDetail {
  id: string;
  sequence_no: number;
  product: EntityRef | null;
  product_sku: string;
  description: string | null;
  qty: number;
  /**
   * หน่วยนับ — endpoint รายละเอียดคืนเป็น object ส่วน endpoint list คืนเป็น
   * flat string (แบบเดียวกับ product ดู types/product.ts) จึงประกาศไว้ทั้งสองทาง
   * และตอนอ่านต้อง fallback ให้ครบ ไม่งั้นคอลัมน์ Unit ว่างเปล่า
   */
  inventory_unit?: { id: string; name: string };
  inventory_unit_name?: string;
  cost_per_unit: number;
  total_cost: number;
  doc_version?: number;
  info: unknown;
  dimension: unknown;
}

export interface InventoryAdjustment {
  id: string;
  si_no?: string;
  so_no?: string;
  si_date?: string;
  so_date?: string;
  description: string;
  adjustment_type: EntityRef | null;
  doc_status: InventoryAdjustmentStatus;
  doc_version: number;
  location?: EntityRef | null;
  stock_in_detail?: InventoryAdjustmentDetail[];
  stock_out_detail?: InventoryAdjustmentDetail[];
  item_count?: number;
  base_total_cost: number;
  // list/detail response omit raw created/updated fields — gateway enrich เป็น audit object
  audit?: Audit;
}

export interface AdjustmentDetailItemPayload {
  doc_version?: number;
  product_id: string;
  qty: number;
  cost_per_unit: number;
  total_cost: number;
  description: string;
}

interface AdjustmentDetailPayload {
  add?: AdjustmentDetailItemPayload[];
  update?: (AdjustmentDetailItemPayload & { id: string })[];
  remove?: { id: string }[];
}

export interface CreateInventoryAdjustmentDto {
  description: string;
  doc_status: string;
  adjustment_type_id: string;
  si_date?: string;
  so_date?: string;
  location_id: string;
  stock_in_detail?: AdjustmentDetailPayload;
  stock_out_detail?: AdjustmentDetailPayload;
}
