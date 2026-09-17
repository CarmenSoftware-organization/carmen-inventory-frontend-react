import type { EntityRef } from "./entity-ref";

export interface TaxFields {
  tax_profile: EntityRef | null;
  tax_rate: number;
  tax_amount: number;
  is_tax_adjustment: boolean;
}

export interface DiscountFields {
  discount_rate: number;
  discount_amount: number;
  is_discount_adjustment: boolean;
}

export interface ItemMoneyFields {
  sub_total_price: number;
  net_amount: number;
  total_price: number;
}
