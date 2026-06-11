import type { PaginatedResponse } from "@/types/params";

export type TransactionDocType =
  | "stock_in"
  | "stock_out"
  | "credit_note"
  | "purchase_request"
  | "purchase_order"
  | "good_received_note"
  | "store_requisition";

export interface TransactionDetail {
  id: string;
  location_id: string;
  location_code: string;
  location_name: string;
  product_id: string;
  product_code: string;
  product_name: string;
  product_local_name: string;
  qty_in: number;
  qty_out: number;
  cost_per_unit: number;
  total_cost: number;
}

export interface AuditActor {
  at: string;
  id: string;
  name: string;
}

export interface Transaction {
  id: string;
  inventory_doc_type: TransactionDocType;
  parent_document_id: string | null;
  parent_document_no: string | null;
  details: TransactionDetail[];
  audit: {
    created: AuditActor;
    updated?: AuditActor;
  };
}

export interface TransactionSummary {
  total_transactions: number;
  adjustments_count: number;
  inbound: {
    units: number;
    total_cost: number;
  };
  outbound: {
    units: number;
    total_cost: number;
  };
  net_change: {
    units: number;
    total_cost: number;
  };
}

export interface TransactionListResponse
  extends PaginatedResponse<Transaction> {
  summary: TransactionSummary;
}
