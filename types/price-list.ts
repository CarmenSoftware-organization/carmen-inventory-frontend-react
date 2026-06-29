export type PriceListStatus = "draft" | "active" | "inactive";

/**
 * Vendor record จาก `/{buCode}/pricelists/active-vendors/{date}` —
 * vendor ที่มี price list active ในวันที่ระบุ
 */
export interface PriceListActiveVendor {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
  latitude: number | null;
  longitude: number | null;
}

export interface PriceListDetailItem {
  id: string;
  sequence_no: number;
  product_id: string;
  product_name: string;
  product_local_name: string;
  product_code?: string;
  product_sku?: string;
  unit_id: string;
  unit_name: string | null;
  moq_qty: number;
  price: number;
  price_without_tax: number;
  tax_profile_id: string;
  tax_profile_name: string | null;
  tax_rate: number;
  tax_amt: number;
  lead_time_days: number;
  is_active: boolean;
  description: string | null;
  note: string | null;
  info: Record<string, unknown>;
  dimension: unknown[];
}

export interface PriceListAuditEntry {
  at: string;
  id: string;
  name: string;
}

export interface PriceListAudit {
  created?: PriceListAuditEntry;
  updated?: PriceListAuditEntry;
}

export interface PriceList {
  id: string;
  no: string;
  name: string;
  status: PriceListStatus;
  description: string;
  vendor: { id: string; name: string };
  currency: { id: string; code: string; name: string };
  effectivePeriod: string;
  note: string;
  pricelist_detail: PriceListDetailItem[];
  doc_version?: number;
  audit?: PriceListAudit;
}

export interface CreatePriceListDto {
  vendor_id: string;
  name: string;
  description: string;
  status: PriceListStatus;
  currency_id: string;
  effective_from_date: string;
  effective_to_date: string;
  note: string;
  pricelist_detail: {
    add?: {
      sequence_no: number;
      product_id: string;
      price: number;
      price_without_tax: number;
      unit_id: string;
      tax_profile_id: string;
      tax_rate: number;
      tax_amt: number;
      lead_time_days: number;
      moq_qty: number;
    }[];
    update?: {
      id: string;
      sequence_no: number;
      product_id: string;
      price: number;
      price_without_tax: number;
      unit_id: string;
      tax_profile_id: string;
      tax_rate: number;
      tax_amt: number;
      lead_time_days: number;
      moq_qty: number;
    }[];
    remove?: { id: string }[];
  };
}
