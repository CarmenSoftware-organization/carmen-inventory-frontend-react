import type { LastAction } from "./last-action";
import type { DiscountFields, ItemMoneyFields, TaxFields } from "./shared-item";

// --- Workflow ---

export interface WorkflowHistoryEntry {
  status: string;
  timestamp: string;
  user: string;
}

// --- GRN-scoped product/location lookup item ---

export interface GrnProductItem {
  product_id: string;
  product_code: string;
  product_name: string;
  product_sku: string | null;
}

export interface GrnLocationItem {
  location_id: string;
  location_code: string;
  location_name: string;
  location_type: string | null;
}

// --- Detail Item (line item inside a detail group) ---

export interface GrnDetailItem
  extends TaxFields,
    DiscountFields,
    ItemMoneyFields {
  id: string;
  good_received_note_detail_id: string;
  inventory_transaction_id: string | null;
  purchase_order_detail_purchase_request_detail_id: string | null;
  order_qty: number;
  order_unit_id: string | null;
  order_unit_name: string | null;
  order_unit_conversion_factor: number;
  order_base_qty: number;
  received_qty: number;
  received_unit_id: string | null;
  received_unit_name: string | null;
  received_unit_conversion_factor: number;
  received_base_qty: number;
  foc_qty: number;
  foc_unit_id: string | null;
  foc_unit_name: string | null;
  foc_unit_conversion_factor: number;
  foc_base_qty: number;
  base_tax_amount: number;
  base_discount_amount: number;
  base_price: number;
  base_sub_total_price: number;
  base_net_amount: number;
  base_total_price: number;
  note: string | null;
  doc_version?: number;
}

// --- Detail Group (product + location) ---

export interface GoodsReceiveNoteDetail {
  id: string;
  good_received_note_id: string;
  sequence_no: number;
  purchase_order_id: string | null;
  po_no?: string | null;
  purchase_order_detail_id: string | null;
  location_id: string | null;
  location_code: string | null;
  location_name: string;
  location_type: string | null;
  product_id: string;
  product_code: string | null;
  product_name: string;
  product_local_name: string | null;
  product_sku: string | null;
  items: GrnDetailItem[];
}

// --- Extra Cost ---

export interface ExtraCostDetailItem {
  id?: string;
  extra_cost_type_id: string;
  note: string;
  info: Record<string, unknown> | null;
  dimension: Record<string, unknown> | null;
  amount: number;
  tax_profile_id: string | null;
  tax_profile_name: string;
  tax_rate: number;
  tax_amount: number;
  is_tax_adjustment: boolean;
  base_tax_amount: number;
  total_amount: number;
  tax_type: string;
}

export interface GrnExtraCost {
  id: string;
  good_received_note_id: string;
  name: string | null;
  allocate_extra_cost_type: string;
  description: string | null;
  note: string | null;
  info: Record<string, unknown> | null;
}

// --- Main GRN ---

/** GRN posting type — mirrors backend `enum_good_received_note_post_type`. */
export type GrnPostType = "ap" | "consignment" | "cash";

export interface GoodsReceiveNote {
  id: string;
  grn_no: string;
  grn_date: string | null;
  expired_date?: string | null;
  invoice_no: string | null;
  invoice_date: string | null;
  description: string | null;
  note: string | null;
  doc_status: string;
  doc_type: string;
  post_type: GrnPostType | null;
  signature_image_url: string | null;
  received_by_id: string | null;
  received_by_name: string | null;
  received_at: string | null;
  credit_term_id: string | null;
  credit_term_name: string | null;
  credit_term_days: number | null;
  payment_due_date: string | null;
  is_active: boolean;
  vendor_id: string;
  vendor_name: string;
  currency_id: string | null;
  currency_code?: string;
  currency_name?: string | null;
  exchange_rate: number | null;
  exchange_rate_date: string | null;
  total_amount?: number;
  info: Record<string, unknown> | null;
  dimension: unknown[] | Record<string, unknown> | null;
  // Workflow
  workflow_id: string | null;
  workflow_name: string | null;
  workflow_history: Record<string, unknown> | WorkflowHistoryEntry[];
  workflow_current_stage: string | null;
  workflow_previous_stage: string | null;
  workflow_next_stage: string | null;
  // Action
  user_action: Record<string, unknown> | null;
  last_action: LastAction | null;
  // Audit
  doc_version?: number;
  created_at: string;
  created_by_id: string | null;
  updated_at: string;
  updated_by_id: string | null;
  deleted_at: string | null;
  deleted_by_id: string | null;
  // Detail items (nested: detail → items[])
  good_received_note_detail: GoodsReceiveNoteDetail[];
  // Extra cost
  extra_cost: GrnExtraCost[];
  extra_cost_detail: ExtraCostDetailItem[];
}

// --- Payloads ---

export interface GrnDetailPayload {
  doc_version?: number;
  purchase_order_detail_id?: string | null;
  product_id: string;
  location_id?: string | null;
  foc_qty: number;
  foc_unit_id?: string | null;
  foc_unit_conversion_factor: number;
  approved_qty: number;
  approved_unit_id?: string | null;
  received_qty: number;
  received_unit_id?: string | null;
  received_base_qty: number;
  received_base_unit_id?: string | null;
  received_unit_conversion_factor: number;
  tax_profile_id?: string | null;
  tax_rate: number;
  tax_amount: number;
  is_tax_adjustment: boolean;
  discount_rate: number;
  discount_amount: number;
  is_discount_adjustment: boolean;
  net_amount: number;
  total_price: number;
  description?: string;
  note?: string;
}

export interface ExtraCostDetailPayload {
  extra_cost_type_id: string;
  note: string;
  amount: number;
}

export interface CreateGrnDto {
  doc_version?: number;
  note?: string | null;
  grn_date: string | null;
  invoice_no?: string | null;
  invoice_date?: string | null;
  description?: string | null;
  doc_status: string;
  doc_type: string;
  post_type?: GrnPostType;
  received_by_id?: string | null;
  received_by_name?: string | null;
  received_at?: string | null;
  credit_term_days?: number | null;
  credit_term_id?: string | null;
  payment_due_date?: string | null;
  is_active: boolean;
  vendor_id: string;
  currency_id?: string | null;
  exchange_rate?: number | null;
  exchange_rate_date?: string | null;
  good_received_note_detail: {
    add?: GrnDetailPayload[];
    update?: (GrnDetailPayload & { id: string })[];
    remove?: { id: string }[];
  };
  extra_cost?: {
    allocate_extra_cost_type?: string;
    extra_cost_detail?: {
      add?: ExtraCostDetailPayload[];
      update?: (ExtraCostDetailPayload & { id: string })[];
      remove?: { id: string }[];
    };
  };
}
