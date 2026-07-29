import type { AuditInfo } from "@/types/workflows";

export interface CreditNoteItem {
  id: string;
  doc_version?: number;
  sequence_no?: number;
  location_id: string | null;
  location_code: string | null;
  location_name: string | null;
  location_type?: string | null;
  product_id: string;
  product_code: string | null;
  product_name: string;
  product_local_name?: string | null;
  product_sku?: string | null;
  return_qty: number;
  return_unit_id: string | null;
  return_unit_name: string | null;
  return_conversion_factor?: number;
  return_base_qty?: number;
  price: number;
  tax_profile_id?: string | null;
  tax_profile_name?: string | null;
  tax_rate: number;
  tax_amount: number;
  base_tax_amount?: number;
  is_tax_adjustment: boolean;
  discount_rate?: number;
  discount_amount?: number;
  is_discount_adjustment?: boolean;
  sub_total_price?: number;
  net_amount: number;
  total_price: number;
  description: string | null;
  note?: string | null;
}

export type CreditNoteType = "quantity_return" | "amount_discount";

export interface CnItemPayload {
  doc_version?: number;
  location_id: string;
  location_name: string;
  product_id: string;
  product_name: string;
  requested_qty: number;
  approved_qty: number;
  return_qty: number;
  return_unit_id: string;
  return_unit_name: string;
  currency_code: string;
  price: number;
  net_amount: number;
  discount_rate: number;
  discount_amount: number;
  is_discount_adjustment: boolean;
  tax_profile_id?: string | null;
  tax_rate: number;
  tax_amount: number;
  total_price: number;
  is_tax_adjustment: boolean;
  description: string;
}

export interface CreateCnDto {
  doc_version?: number;
  credit_note_type: CreditNoteType;
  grn_id: string;
  grn_date: string;
  vendor_id: string;
  credit_note_number?: string;
  cn_date: string;
  cn_reason_id: string;
  reference_number: string;
  description?: string;
  currency_id: string;
  exchange_rate: number;
  // อ้างอิงจาก GRN — GRN บางใบไม่มี จึง optional และ omit ตอนว่าง
  // (backend ไม่รับ "" สำหรับ invoice_date ที่เป็น ISO-8601 datetime)
  invoice_no?: string;
  invoice_date?: string;
  tax_invoice_no: string;
  tax_invoice_date: string;
  tax_amount: number;
  discount_amount: number;
  note?: string;
  credit_note_detail: {
    add?: CnItemPayload[];
    update?: (CnItemPayload & { id: string })[];
    remove?: { id: string }[];
  };
}

export enum CN_STATUS {
  DRAFT = "draft",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
  VOIDED = "voided",
}

export interface CreditNote {
  id: string;
  doc_version?: number;
  cn_no: string;
  cn_date: string;
  doc_status: CN_STATUS;
  credit_note_type: CreditNoteType;
  vendor_id: string;
  vendor_name?: string | null;
  currency_id: string;
  currency_code?: string | null;
  exchange_rate: number;
  exchange_rate_date?: string | null;
  grn_id: string;
  grn_no?: string | null;
  grn_date: string;
  cn_reason_id: string | null;
  cn_reason_name?: string | null;
  cn_reason_description?: string | null;
  invoice_no: string | null;
  invoice_date: string | null;
  tax_invoice_no: string | null;
  tax_invoice_date: string | null;
  note: string | null;
  description: string | null;
  reference_number?: string | null;
  tax_amount?: number;
  discount_amount?: number;
  total_amount?: number;
  base_total_amount?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  /** audit จาก API — created.name ใช้แสดง "Created By" ใน header ribbon */
  audit?: AuditInfo;
  credit_note_detail: CreditNoteItem[];
}

export interface CreditNoteDetailItem {
  id: string;
  doc_version?: number;
  sequence_no?: number;
  product: {
    id: string | null;
    code: string | null;
    name: string | null;
    local_name: string | null;
    sku: string | null;
  } | null;
  location: {
    id: string | null;
    code: string | null;
    name: string | null;
  } | null;
  return_unit: {
    id: string | null;
    name: string | null;
  } | null;
  tax_profile: {
    id: string | null;
    name: string | null;
  } | null;
  return_qty: number;
  price: number;
  tax_rate: number;
  tax_amount: number;
  is_tax_adjustment: boolean;
  discount_rate?: number;
  discount_amount?: number;
  is_discount_adjustment?: boolean;
  net_amount: number;
  total_price: number;
  description: string | null;
  note?: string | null;
}

/**
 * Detail-view (findOne) shape of a credit note with relations collapsed into
 * nested objects. Distinct from `CreditNote` (flat, list). `reference_number`/
 * `tax_amount`/`discount_amount` are optional (not returned by findOne; form
 * defaults them).
 * รูปแบบ detail-view (findOne) ของใบลดหนี้ที่ยุบ relation เป็น object ซ้อน
 */
export interface CreditNoteDetail {
  id: string;
  doc_version?: number;
  cn_no: string;
  cn_date: string;
  doc_status: CN_STATUS;
  credit_note_type: CreditNoteType;
  invoice_no: string | null;
  invoice_date: string | null;
  tax_invoice_no: string | null;
  tax_invoice_date: string | null;
  note: string | null;
  description: string | null;
  reference_number?: string | null;
  tax_amount?: number;
  discount_amount?: number;
  vendor: {
    id: string | null;
    name: string | null;
  } | null;
  currency: {
    id: string | null;
    code: string | null;
    exchange_rate: number | null;
  } | null;
  grn: {
    id: string | null;
    no: string | null;
    date: string | null;
  } | null;
  cn_reason: {
    id: string | null;
    name: string | null;
    description: string | null;
  } | null;
  /** audit จาก API — created.name ใช้แสดง "Created By" ใน header ribbon */
  audit?: AuditInfo;
  credit_note_detail: CreditNoteDetailItem[];
}
