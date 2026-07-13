import type { ItemMoneyFields } from "./shared-item";
import type { WorkflowHistoryEntry } from "./purchase-request";

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

export interface PoDetailLocation {
  location_id: string | null;
  location_code: string | null;
  location_name: string | null;
  delivery_point_id: string | null;
  delivery_point_name: string | null;
  order_qty: number;
  order_base_qty: number;
  received_qty: number;
  foc_qty: number;
  // per-location pricing (optional — POs เก่าอาจไม่มี, load แล้ว fallback ค่า item)
  discount_rate?: number;
  discount_amount?: number;
  is_discount_adjustment?: boolean;
  tax_profile_id?: string | null;
  tax_profile_name?: string;
  tax_rate?: number;
  tax_amount?: number;
  is_tax_adjustment?: boolean;
  sub_total_price?: number;
  net_amount?: number;
  total_price?: number;
}

export interface PurchaseOrderDetail extends ItemMoneyFields {
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
  pr_detail: PrDetailRef[];
  locations: PoDetailLocation[];
}

export interface PrDetailRef {
  pr_detail_id: string;
  order_qty: number;
  order_unit_id: string;
  order_unit_name: string;
  order_base_qty: number;
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
  discount_rate: number;
  discount_amount: number;
  is_foc: boolean;
  pr_detail: PrDetailRef[];
  description: string;
  locations: PoDetailPayloadLocation[];
}

export interface PoDetailPayloadLocation {
  location_id: string;
  order_qty: number;
  order_base_qty: number;
  discount_rate: number;
  discount_amount: number;
  is_discount_adjustment: boolean;
  tax_profile_id: string | null;
  tax_profile_name: string;
  tax_rate: number;
  tax_amount: number;
  is_tax_adjustment: boolean;
  sub_total_price: number;
  net_amount: number;
  total_price: number;
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
  workflow_current_stage: string;
  workflow_previous_stage: string;
  workflow_next_stage: string;
  workflow_history?: WorkflowHistoryEntry[];
  vendor_id: string;
  vendor_name: string;
  delivery_date: string;
  currency_id: string;
  currency_code: string;
  exchange_rate: number;
  description: string;
  order_date: string;
  credit_term_id: string;
  credit_term_name: string;
  credit_term_value: number;
  buyer_id: string;
  buyer_name: string;
  email: string;
  remarks: string;
  note: string;
  doc_version: number;
  total_amount: number;
  created_at: string;
  updated_at: string;
  purchase_order_detail: PurchaseOrderDetail[];
}

// --- PO for GRN (from /purchase-order/grn endpoint) ---

export interface PoGrnDetailLocation {
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
