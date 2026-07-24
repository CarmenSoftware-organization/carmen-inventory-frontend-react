import { z } from "zod";

import type { Audit } from "./audit";
import { lastActionSchema } from "./last-action";
import type { DiscountFields, ItemMoneyFields, TaxFields } from "./shared-item";

export type PurchaseRequestStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected"
  | "in_progress"
  | "completed"
  | "voided";

export enum PR_STATUS {
  DRAFT = "draft",
  IN_PROGRESS = "in_progress",
  APPROVED = "approved",
  COMPLETED = "completed",
  VOIDED = "voided",
}

export enum PR_ITEM_STAGE_STATUS {
  PENDING = "pending",
  SUBMIT = "submit",
  APPROVE = "approve",
  APPROVED = "approved",
  REJECT = "reject",
  REJECTED = "rejected",
  REVIEW = "review",
}

export interface PurchaseRequestDetail
  extends TaxFields,
    DiscountFields,
    ItemMoneyFields {
  id: string;
  purchase_request_id: string;
  sequence_no: number;
  location_id: string;
  location_code: string;
  location_name: string;
  location_type?: string;
  delivery_point_id: string;
  delivery_point_name: string;
  delivery_date: string | null;
  product_id: string;
  product_code?: string;
  product_name: string;
  product_local_name: string | null;
  inventory_unit_id: string;
  inventory_unit_name: string;
  description: string | null;
  comment: string | null;
  vendor_id: string | null;
  vendor_name: string | null;
  pricelist_detail_id: string | null;
  pricelist_no: string | null;
  pricelist_unit: string | null;
  pricelist_price: number;
  pricelist_type: string;
  currency_id: string;
  currency_code: string | null;
  currency_decimal_places?: number;
  exchange_rate: number;
  exchange_rate_date: string | null;
  requested_qty: number;
  requested_unit_id: string;
  requested_unit_name: string;
  approved_qty: number;
  approved_unit_id: string;
  approved_unit_name: string;
  foc_qty: number;
  foc_unit_id: string;
  foc_unit_name: string;
  unit_price: number;
  state_status: string;
  current_stage_status: string;
  state_message: string | null;
  info: Record<string, unknown>;
  dimension: unknown[];
  history?: PrItemHistoryEntry[];
  doc_version: number;
  created_at: string;
  updated_at: string;
}

/** ประวัติการทำงาน workflow ระดับรายการ (per-item) ของใบขอซื้อ */
export interface PrItemHistoryEntry {
  at: string;
  seq: number;
  name: string;
  user: { id: string; name: string };
  status: string;
  message?: string | null;
}

export interface PurchaseRequestTemplateDetail
  extends TaxFields,
    DiscountFields {
  id: string;
  purchase_request_template_id: string;
  location_id: string;
  location_code: string;
  location_name: string;
  location_type?: string;
  delivery_point_id: string;
  delivery_point_name: string;
  product_id: string;
  product_code: string;
  product_name: string;
  product_local_name: string;
  inventory_unit_id: string;
  inventory_unit_name: string;
  description: string | null;
  comment: string | null;
  currency_id: string;
  currency_code: string | null;
  exchange_rate: number;
  exchange_rate_date: string | null;
  requested_qty: number;
  requested_unit_id: string;
  requested_unit_name: string;
  requested_unit_conversion_factor: number;
  requested_base_qty: number;
  foc_qty: number;
  foc_unit_id: string;
  foc_unit_name: string;
  foc_unit_conversion_factor: number;
  foc_base_qty: number;
  base_tax_amount: number;
  base_discount_amount: number;
  is_active: boolean;
  info: Record<string, unknown>;
  dimension: unknown[];
  doc_version: number;
  created_at: string;
  updated_at: string;
}

export interface PurchaseRequestTemplate {
  id: string;
  name: string;
  description: string;
  department_id: string;
  department_name: string;
  workflow_id: string;
  workflow_name: string;
  info: Record<string, unknown>;
  is_active: boolean;
  doc_version?: number;
  created_at: string;
  purchase_request_template_detail: PurchaseRequestTemplateDetail[];
}

export interface WorkflowHistoryEntry {
  user: { id: string; name: string };
  action: string;
  datetime: string;
  next_stage: string;
  current_stage?: string;
}

export interface PurchaseRequest {
  id: string;
  pr_no: string;
  pr_status: string;
  pr_date: string;
  expected_date: string;
  description: string;
  doc_status: PurchaseRequestStatus;
  role: string;
  workflow_id: string;
  workflow_name: string;
  workflow_current_stage: string;
  workflow_next_stage: string;
  workflow_previous_stage: string;
  workflow_history: WorkflowHistoryEntry[];
  requestor_id: string;
  requestor_name: string;
  department_id: string;
  department_code: string;
  department_name: string;
  vendor_id: string;
  vendor_code: string;
  vendor_name: string;
  purchase_request_detail: PurchaseRequestDetail[];
  base_total_amount: number;
  info: Record<string, unknown>;
  dimension: string;
  doc_version: number;
  created_at: string;
  updated_at: string;
  audit?: Audit;
}

// --- Zod runtime validation schema (for list API response) ---
const purchaseRequestDetailSummarySchema = z.looseObject({
  price: z.number(),
  total_price: z.number(),
});

export const purchaseRequestSchema = z.looseObject({
  id: z.string(),
  pr_no: z.string(),
  pr_date: z.string(),
  description: z.string(),
  requestor_name: z.string(),
  pr_status: z.string(),
  workflow_name: z.string(),
  workflow_current_stage: z.string(),
  workflow_next_stage: z.string().nullable(),
  workflow_previous_stage: z.string().nullable(),
  last_action: lastActionSchema.nullable(),
  department_name: z.string(),
  created_at: z.string(),
  purchase_request_detail: z.array(purchaseRequestDetailSummarySchema),
});

export enum PR_ITEM_PRICELIST_COMPARE_TYPE {
  AUTOMATIC = "automatic",
  MANUAL_SELECT = "manual_select",
  MANUAL_INPUT = "manual_input",
}

export interface PrtDetailPayload {
  location_id: string | null;
  delivery_point_id: string | null;
  product_id: string | null;
  product_name: string;
  inventory_unit_id: string | null;
  inventory_unit_name: string;
  requested_qty: number;
  requested_unit_id: string | null;
  requested_unit_name: string;
  requested_unit_conversion_factor: number;
  requested_base_qty: number;
  currency_id: string | null;
}

export interface CreatePrtDto {
  name: string;
  description: string;
  workflow_id: string;
  is_active: boolean;
  purchase_request_template_detail: {
    add?: PrtDetailPayload[];
    update?: (PrtDetailPayload & { id: string })[];
    remove?: { id: string }[];
  };
}

export interface PurchaseRequestDetailPayload {
  doc_version?: number;
  product_id: string | null;
  description: string;
  current_stage_status: string;
  requested_qty: number;
  requested_unit_id: string | null;
  pricelist_price: number;
  vendor_id: string | null;
  pricelist_detail_id: string | null;
  location_id: string | null;
  delivery_point_id: string | null;
  delivery_date: string;
  currency_id: string | null;
  foc_qty: number;
  foc_unit_id: string | null;
  approved_qty: number;
  approved_unit_id: string | null;
  tax_profile_id?: string | null;
  tax_rate: number;
  tax_amount: number;
  is_tax_adjustment: boolean;
  discount_rate: number;
  discount_amount: number;
  is_discount_adjustment: boolean;
  net_amount: number;
  total_price: number;
  comment?: string;
}

export interface CreatePurchaseRequestDto {
  stage_role: string;
  details: {
    doc_version?: number;
    pr_date: string;
    description: string;
    requestor_id: string;
    workflow_id: string;
    department_id: string;
    purchase_request_detail: {
      add?: PurchaseRequestDetailPayload[];
      update?: (PurchaseRequestDetailPayload & { id: string })[];
      remove?: { id: string }[];
    };
  };
}

export interface WorkflowStageDetail {
  id: string;
  stage_status: string;
  stage_message: string;
}

export interface ApproveDetail {
  id: string;
  purchase_request_id?: string;
  stage_status: string;
  stage_message: string;
  approved_qty: number;
  approved_unit_id: string | null;
  vendor_id?: string | null;
  pricelist_detail_id?: string | null;
  pricelist_price?: number;
  pricelist_no?: string | null;
  pricelist_type?: string | null;
  currency_id?: string;
  delivery_point_id?: string | null;
  delivery_date?: string;
  location_id?: string | null;
  tax_profile_id?: string | null;
  tax_rate?: number;
  tax_amount?: number;
  is_tax_adjustment?: boolean;
  discount_rate?: number;
  discount_amount?: number;
  is_discount_adjustment?: boolean;
  net_amount?: number;
  total_price?: number;
  foc_qty?: number;
  foc_unit_id?: string | null;
}

export interface PurchaseApproveDetail {
  id: string;
  stage_status: string;
  stage_message: string | null;
  is_tax_adjustment: boolean;
  description?: string | null;
  approved_qty: number;
  approved_unit_id: string | null;
  approved_base_qty?: number;
  approved_unit_conversion_factor?: number;
  vendor_id?: string | null;
  currency_id?: string | null;
  exchange_rate?: number;
  exchange_rate_date?: string | null;
  tax_profile_id?: string | null;
  tax_profile_name?: string | null;
  tax_rate: number;
  tax_amount: number;
  base_tax_amount?: number;
  total_amount?: number;
  discount_rate: number;
  discount_amount: number;
  is_discount_adjustment: boolean;
  base_discount_amount?: number;
  total_price: number;
  sub_total_price: number;
  net_amount: number;
  base_sub_total_price?: number;
  base_total_price?: number;
  base_net_amount?: number;
  base_price?: number;
  foc_qty: number;
  foc_unit_id?: string | null;
  foc_unit_conversion_rate?: number;
  foc_base_qty?: number;
  pricelist_detail_id?: string | null;
  pricelist_no?: string | null;
  pricelist_price?: number;
  pricelist_type?: string | null;
  current_stage_status?: string;
}

export interface PrActionPayload {
  id: string;
  stage_role: string;
  doc_version?: number;
  details: (WorkflowStageDetail | ApproveDetail | PurchaseApproveDetail)[];
  des_stage?: string;
}

export interface SplitActionDto {
  id: string;
  detail_ids: string[];
}
