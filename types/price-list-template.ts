import type { Audit } from "@/types/audit";
import type { EntityRef } from "@/types/entity-ref";

type PriceListTemplateStatus = "draft" | "active" | "inactive";

// ยืนยันจาก /pricelist-templates จริง — endpoint นี้ (ต่างจากตอนถูก embed ใน
// RFP ซึ่งมี unit object) ยังส่ง moq[] แบบ flat unit_id/unit_name อยู่ ไม่แปลง
interface PriceListTemplateMoq {
  qty: number;
  note: string;
  unit_id: string;
  unit_name: string;
}

interface PriceListTemplateProduct {
  id: string;
  product: EntityRef | null;
  code: string;
  default_order: {
    unit: EntityRef | null;
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
  currency: EntityRef | null;
  products: PriceListTemplateProduct[];
  doc_version?: number;
  audit?: Audit;
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
