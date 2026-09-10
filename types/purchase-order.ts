import type { ItemMoneyFields } from "./shared-item";
import type { WorkflowHistoryEntry } from "./purchase-request";
import type { Audit } from "./audit";
import type { LastAction } from "./last-action";

export enum PO_STATUS {
  DRAFT = "draft",
  IN_PROGRESS = "in_progress",
  SENT = "sent",
  PARTIAL = "partial",
  CLOSED = "closed",
  COMPLETED = "completed",
}

export enum PO_TYPE {
  MANUAL = "manual",
  PL = "pricelist",
  PR = "purchase_request",
}

interface PurchaseOrderDetail extends ItemMoneyFields {
  id: string;
  doc_version?: number;
  stage_status: string | null;
  current_stage_status: string;
  description: string;
  product_id: string;
  product_code: string;
  product_name: string;
  product_local_name: string;
  product_sku: string;
  order_unit_id: string;
  order_unit_name: string;
  order_unit_conversion_factor: number;
  order_qty: number;
  base_unit_id: string;
  base_unit_name: string;
  base_qty: number;
  price: number;
  tax_profile_id: string | null;
  tax_profile_name: string;
  tax_rate: number;
  tax_amount: number;
  is_foc: boolean;
  discount_rate: number;
  discount_amount: number;
  is_tax_adjustment?: boolean;
  is_discount_adjustment?: boolean;
  /** ลำดับแถวที่ backend กำหนด (เดิม FE เรียกฟิลด์นี้ว่า `sequence` ใน payload) */
  sequence_no?: number;
  /**
   * แถวหนึ่ง = คลังเดียว ตั้งแต่ backend เลิก group location (2026-09-09)
   * ของเดิมเป็น `locations: PoDetailLocation[]` ซ้อนอยู่ในแถว แล้ว `order_qty`
   * ระดับแถวคือผลรวมของทุก location — ตอนนี้ค่าพวกนี้อยู่บนแถวตรง ๆ
   */
  location_id: string | null;
  location_code: string | null;
  location_name: string | null;
  delivery_point_id: string | null;
  delivery_point_name: string | null;
  foc_qty: number;
  /** ยอดสกุลฐาน — คู่กับ sub_total_price / net_amount / total_price ของสกุลใบ */
  base_sub_total_price?: number;
  base_net_amount?: number;
  base_total_price?: number;
  /** สถานะราย stage (map) — ต่างจาก `current_stage_status` ที่เป็นสถานะปัจจุบัน */
  stages_status?: Record<string, unknown>;
  info?: Record<string, unknown>;
  pr_details: PrDetailRef[];
  history?: PoItemHistoryEntry[];
}

/** ประวัติการทำงาน workflow ระดับรายการ (per-item) ของใบสั่งซื้อ */
export interface PoItemHistoryEntry {
  at: string;
  seq: number;
  name: string;
  /** บาง entry หลังบ้านส่งมาแค่ id ไม่มีชื่อ */
  user: { id: string; name?: string };
  status: string;
  message?: string | null;
}

export interface PrDetailRef {
  /** null ได้ — แถวที่ไม่ได้มาจาก PR (สร้างเองหรือมาจาก price list) */
  pr_detail_id: string | null;
  order_qty: number;
  order_base_qty: number;
  received_qty: number;
  foc_qty: number;
}

export interface PoDetailPayload {
  doc_version?: number;
  sequence: number;
  product_id: string;
  product_code: string;
  product_name: string;
  product_local_name: string;
  product_sku: string;
  order_unit_id: string;
  order_unit_name: string;
  order_unit_conversion_factor: number;
  order_qty: number;
  base_unit_id: string;
  base_unit_name: string;
  base_qty: number;
  price: number;
  sub_total_price: number;
  net_amount: number;
  total_price: number;
  tax_profile_id: string | null;
  tax_profile_name: string;
  tax_rate: number;
  tax_amount: number;
  is_tax_adjustment: boolean;
  discount_rate: number;
  discount_amount: number;
  is_discount_adjustment: boolean;
  is_foc: boolean;
  foc_qty: number;
  pr_details: PrDetailRef[];
  description: string;
  // แถวหนึ่ง = คลังเดียว — ของเดิมส่ง `locations[]` ซ้อนในแถว
  location_id: string | null;
  location_code: string;
  location_name: string;
  delivery_point_id: string | null;
  delivery_point_name: string;
}

export interface CreatePoDto {
  stage_role: string;
  details: {
    doc_version?: number;
    po_type?: PO_TYPE;
    workflow_id: string;
    vendor_id: string;
    vendor_name: string;
    delivery_date: string;
    currency_id: string;
    currency_code: string;
    exchange_rate: number;
    description: string;
    order_date: string;
    credit_term_id?: string;
    credit_term_name?: string;
    credit_term_value?: number;
    buyer_id: string;
    buyer_name: string;
    email: string;
    remarks: string;
    note: string;
    purchase_order_detail: {
      add?: PoDetailPayload[];
      update?: (PoDetailPayload & { id: string })[];
      remove?: { id: string }[];
    };
  };
}

export interface PurchaseOrder {
  id: string;
  role: string;
  po_no: string;
  po_status: PO_STATUS;
  po_type: string;
  workflow_id: string | null;
  workflow_name: string;
  workflow_current_stage: string | null;
  workflow_previous_stage: string | null;
  workflow_next_stage: string | null;
  workflow_history?: WorkflowHistoryEntry[];
  /**
   * action ล่าสุดของ workflow — ใช้แสดงคอลัมน์ "ส่งกลับ" ในหน้า list
   * (`state === "reviewed"` = ค้างอยู่ที่การตีกลับ ดู `constant/last-action.ts`)
   */
  last_action?: LastAction | null;
  vendor_id: string;
  vendor_name: string;
  delivery_date: string;
  currency_id: string;
  currency_code: string;
  exchange_rate: number;
  description: string;
  order_date: string;
  credit_term_id: string | null;
  credit_term_name: string | null;
  credit_term_value: number;
  buyer_id: string;
  buyer_name: string;
  email: string;
  remarks: string;
  approval_date: string | null;
  /** ออบเจกต์ย่อของผู้ขาย/สกุลเงิน — ซ้ำกับ *_id/*_name/*_code ที่แบนอยู่ข้างบน */
  vendor?: { id: string; name: string };
  currency?: { id: string; code: string };
  user_action?: Record<string, unknown>;
  info?: Record<string, unknown>;
  doc_version: number;
  total_amount: number;
  // flat fields ยังใช้อยู่ในหน้า edit (po-form → PoWorkflowHistory);
  // list endpoint จะไม่ส่งมา (serializer omit) แต่ enrich เป็น audit object แทน
  audit?: Audit;
  purchase_order_detail: PurchaseOrderDetail[];
}

// --- PO for GRN (from /purchase-order/grn endpoint) ---

interface PoGrnDetailLocation {
  location_id: string;
  location_code?: string;
  location_name: string;
  location_type: string;
  order_qty: number;
  requested_qty?: number;
  remain_qty?: number;
  request_unit_id?: string;
  request_unit_name?: string;
  foc_qty?: number;
  request_base_factor?: number;
  request_base_qty?: number;
  request_base_unit_id?: string | null;
  request_base_unit_name?: string | null;
  received_qty?: number;
  /**
   * คลังนี้เอาไปตั้งเป็นรายการรับของได้ไหม — หลังบ้านตัดสินให้ `false` = ใช้ไม่ได้
   * · **ไม่ส่งมา = ถือว่าใช้ได้** (หลังบ้านรุ่นเก่ายังไม่มีฟิลด์นี้)
   */
  can_use?: boolean;
}

export interface PoGrnDetail {
  id: string;
  sequence_no: number;
  product_id: string;
  product_code: string | null;
  product_name: string | null;
  product_local_name: string | null;
  order_qty: number;
  order_unit_id: string;
  order_unit_name: string;
  order_unit_conversion_factor: number;
  base_qty: number;
  base_unit_id: string;
  base_unit_name: string | null;
  received_qty: number;
  cancelled_qty: number;
  price: number;
  net_amount: number;
  is_foc: boolean;
  locations: PoGrnDetailLocation[];
  /** รายการนี้รับของได้ไหม — `false` = ทุกคลังใต้รายการนี้ใช้ไม่ได้ */
  can_use?: boolean;
}

export interface PoForGrn {
  id: string;
  po_no: string;
  po_status: string;
  grn_status?: string;
  vendor_id: string;
  vendor_name: string;
  order_date: string;
  delivery_date: string;
  currency_id: string;
  currency_code: string;
  exchange_rate: number;
  po_detail: PoGrnDetail[];
  /** ทั้งใบรับของได้ไหม — `false` = ทุกรายการในใบนี้ใช้ไม่ได้ */
  can_use?: boolean;
}

// --- Vendor for GRN (from /purchase-order/grn/vendor) ---

export interface VendorForGrn {
  vendor_id: string;
  vendor_code: string;
  vendor_name: string;
  po_count: number;
}

// --- Group PR → PO ---

export interface GroupPrProduct {
  product_id: string;
  product_name: string;
  qty: number;
  price_per_unit: number;
  total: number;
  base_total_price: number;
}

export interface GroupPrPo {
  po_no: string;
  delivery_date: string;
  vendor_name: string;
  currency_code: string;
  exchange_rate: number;
  total_price: number;
  base_price: number;
  products: GroupPrProduct[];
  pr: string[];
}
