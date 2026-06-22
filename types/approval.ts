import type { LastAction } from "./last-action";

export type ApprovalDocType = "pr" | "po" | "sr";

/** Summary of a purchase-request detail returned in the approval list */
export interface ApprovalItemDetail {
  price: number;
  total_price: number;
}

/** A normalized approval item that can represent PR, PO, or SR */
export interface ApprovalItem {
  id: string;
  doc_type: ApprovalDocType;
  doc_no: string;
  doc_date: string;
  description: string;
  status: string;
  created_at: string;
  // Workflow
  workflow_name: string;
  workflow_current_stage: string;
  workflow_next_stage: string | null;
  workflow_previous_stage: string | null;
  last_action: LastAction | null;
  // PR-specific
  requestor_name: string;
  department_name: string;
  purchase_request_detail: ApprovalItemDetail[];
  // PO-specific
  vendor_name: string;
  total_amount: number;
  delivery_date: string | null;
}

/** Summary count returned from the pending-summary endpoint */
export interface ApprovalPendingSummary {
  total: number;
  sr: number;
  pr: number;
  po: number;
}

// --- Raw API response shapes for normalization ---

export interface RawApprovalPR {
  id: string;
  pr_no: string;
  pr_date: string;
  pr_status: string;
  description: string;
  created_at: string;
  workflow_name: string;
  workflow_current_stage: string;
  workflow_next_stage: string | null;
  workflow_previous_stage: string | null;
  last_action: LastAction | null;
  requestor_name: string;
  department_name: string;
  purchase_request_detail: ApprovalItemDetail[];
}

export interface RawApprovalPO {
  id: string;
  po_no: string;
  order_date: string;
  po_status?: string;
  status?: string;
  description: string;
  created_at: string;
  workflow_name: string;
  workflow_current_stage: string;
  workflow_next_stage: string | null;
  workflow_previous_stage: string | null;
  last_action: LastAction | null;
  vendor_name: string;
  total_amount: number;
  delivery_date: string | null;
}

export interface RawApprovalSR {
  id: string;
  sr_no: string;
  sr_date: string;
  sr_status?: string;
  status?: string;
  description: string;
  created_at: string;
  workflow_name: string;
  workflow_current_stage: string;
  workflow_next_stage: string | null;
  workflow_previous_stage: string | null;
  last_action: LastAction | null;
  requestor_name: string;
  department_name: string;
}
