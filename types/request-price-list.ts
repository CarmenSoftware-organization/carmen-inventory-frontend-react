export interface RequestPriceListVendor {
  id: string;
  sequence_no: number;
  vendor_id: string;
  vendor_name: string;
  vendor_code: string;
  contact_person: string;
  contact_phone: string;
  contact_email: string;
  url_token: string;
  has_submitted: boolean;
  pricelist: {
    id: string;
    no: string;
    name: string;
    status: string;
  } | null;
  info: Record<string, unknown>;
  dimension: string;
  doc_version: number;
}

export interface RequestPriceList {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  custom_message: string;
  email_template_id: string | null;
  info: string;
  dimension: Record<string, unknown>;
  doc_version: number;
  pricelist_template: {
    id: string;
    name: string;
    status: string;
    currency: { id: string; code: string };
  };
  vendor_count: number;
  vendors: RequestPriceListVendor[];
  created_at: string;
  updated_at: string;
}

export interface CreateRequestPriceListDto {
  name: string;
  pricelist_template_id?: string;
  start_date: string;
  end_date: string;
  custom_message?: string;
  email_template_id?: string;
  info?: string;
  dimension?: unknown;
  vendors: {
    add?: {
      vendor_id: string;
      vendor_name: string;
      vendor_code: string;
      contact_person: string;
      contact_phone: string;
      contact_email: string;
      sequence_no: number;
      dimension: string;
      id: string;
    }[];
    remove?: { vendor_id: string }[];
  };
}
