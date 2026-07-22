export type PriceListTemplateStatus = "draft" | "active" | "inactive";

export interface PriceListTemplateMoq {
  qty: number;
  note: string;
  unit_id: string;
  unit_name: string;
}

export interface PriceListTemplateProduct {
  id: string;
  product_id: string;
  product_name: string;
  product_local_name?: string;
  product_code?: string;
  code: string;
  default_order: {
    unit_id: string;
    unit_name: string;
  };
  moq: PriceListTemplateMoq[];
}

export interface PriceListTemplate {
  id: string;
  name: string;
  description: string;
  note: string | null;
  status: PriceListTemplateStatus;
  validity_period: number | null;
  vendor_instructions: string | null;
  currency: { id: string; code: string };
  products: PriceListTemplateProduct[];
  doc_version?: number;
  created_at: string;
  updated_at: string;
}

export interface CreatePriceListTemplateDto {
  name: string;
  description: string;
  status: PriceListTemplateStatus;
  validity_period: number | null;
  vendor_instruction: string;
  currency_id: string;
  products: {
    add?: {
      product_id: string;
      moq: {
        unit_id: string;
        unit_name: string;
        note: string;
        qty: number;
      }[];
    }[];
    // ลบ product ออกจาก template ด้วย id (ใช้ตอน update: full replace = remove เก่า + add ใหม่)
    remove?: { id: string }[];
  };
}
