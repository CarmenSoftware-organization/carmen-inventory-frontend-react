export type PricelistExternalDto = {
  id: string;
  pricelist_no: string;
  name: string;
  status: "draft" | "active" | "inactive" | "expired";
  vendor_id: string;
  vendor_name: string | null;
  currency_id: string;
  currency_code: string;
  effective_from_date: string;
  effective_to_date: string;
  description: string | null;
  note: string | null;
  tb_pricelist_detail: PricelistExternalDetailDto[];
};

export type MoqTierDto = {
  id: string;
  minimum_quantity: number;
  price: number;
  lead_time_days?: number;
};

export type PricelistExternalDetailDto = {
  id: string;
  sequence_no: number;
  product_id: string;
  product_name: string;
  unit_id: string | null;
  unit_name: string | null;
  moq_qty: string;
  price_without_tax: string;
  tax_amt: string;
  price: string;
  tax_profile_id: string;
  tax_profile_name: string | null;
  tax_rate: string;
  lead_time_days: number;
  is_active: boolean;
  note: string | null;
  moq_tiers?: MoqTierDto[];
};
