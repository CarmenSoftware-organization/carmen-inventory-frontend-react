// shape ตาม GET /api/{bu}/wastage-reporting ของจริง (2026-08-20) — รายการ lot
// สินค้าจาก GRN ที่หมดอายุ/ใกล้หมดอายุ พร้อมจำนวนและมูลค่าที่เสี่ยงเสีย
// (แนวคิด "ใบรายงานของเสีย" แบบเอกสาร CRUD ของเดิมถูกถอดออก — backend ไม่มี)

export type WastageStatus = "expired" | "expiring";

export interface WastageItem {
  grn_detail_item_id: string;
  grn_detail_id: string;
  grn_id: string;
  grn_no: string;
  grn_date: string;
  product_id: string;
  product_code: string;
  product_name: string;
  product_local_name?: string | null;
  product_sku?: string | null;
  inventory_unit: { id: string; name: string };
  location_id: string;
  location_code: string;
  location_name: string;
  lot_no: string;
  expired_at: string;
  days_to_expiry: number;
  status: WastageStatus;
  received_qty: number;
  remaining_qty: number;
  cost_per_unit: number;
  remaining_value: number;
}

export interface WastageSummary {
  total_items: number;
  expired_count: number;
  expiring_count: number;
  total_qty_at_risk: number;
  total_value_at_risk: number;
}
