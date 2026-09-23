import type { PaginatedResponse } from "@/types/params";

export type TransactionDocType =
  | "stock_in"
  | "stock_out"
  | "credit_note"
  | "purchase_request"
  | "purchase_order"
  | "good_received_note"
  | "store_requisition";

/**
 * อ้างอิงเอนทิตีแบบยุบก้อน — gateway ยุบ `<base>_id/_code/_name` ให้เป็น `<base>: {...}`
 * ผ่าน `@CollapseRefs` แล้ว (ดู inventory-transaction.serializer.ts) ถ้า `<base>_id`
 * เป็น null จะได้ทั้งก้อนเป็น null ไม่ใช่ object ว่าง
 */
interface EntityRef {
  id: string | null;
  code: string | null;
  name: string | null;
}

interface TransactionDetail {
  id: string;
  location: EntityRef | null;
  product: (EntityRef & { local_name: string | null }) | null;
  qty_in: number;
  qty_out: number;
  cost_per_unit: number;
  total_cost: number;
}

interface AuditActor {
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

export interface TransactionListResponse extends PaginatedResponse<Transaction> {
  summary: TransactionSummary;
}
