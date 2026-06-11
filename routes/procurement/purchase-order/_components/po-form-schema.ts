import { z } from "zod";
import type { TranslationFn } from "@/lib/i18n-schema";
import type {
  PurchaseOrder,
  PoDetailPayload,
  PrDetailRef,
} from "@/types/purchase-order";

const locationSchema = z.object({
  id: z.string().min(1),
  order_qty: z.coerce.number().min(0),
  received_qty: z.coerce.number().min(0),
});

const prDetailSchema = z.object({
  pr_detail_id: z.string(),
  order_qty: z.coerce.number(),
  order_unit_id: z.string(),
  order_unit_name: z.string(),
  order_base_qty: z.coerce.number(),
});

export function createPoDetailSchema(tv: TranslationFn, tf: TranslationFn) {
  return z.object({
    id: z.string().optional(),
    description: z.string(),
    product_id: z
      .string()
      .nullable()
      .refine((v) => !!v, tv("required", { field: tf("product") })),
    product_code: z.string(),
    product_name: z.string(),
    product_local_name: z.string(),
    product_sku: z.string(),
    order_unit_id: z.string().nullable(),
    order_unit_name: z.string(),
    order_unit_conversion_factor: z.coerce.number(),
    order_qty: z.coerce
      .number()
      .min(1, tv("minNumber", { field: tf("qty"), min: 1 })),
    base_unit_id: z.string().nullable(),
    base_unit_name: z.string(),
    base_qty: z.coerce.number(),
    price: z.coerce.number().min(0),
    sub_total_price: z.coerce.number(),
    net_amount: z.coerce.number(),
    total_price: z.coerce.number(),
    tax_profile_id: z
      .string()
      .nullable()
      .refine((v) => !!v, tv("required", { field: tf("tax") })),
    tax_profile_name: z.string().optional(),
    tax_rate: z.coerce.number().optional(),
    tax_amount: z.coerce.number().optional(),
    discount_rate: z.coerce.number().optional(),
    discount_amount: z.coerce.number().optional(),
    is_foc: z.boolean(),
    current_stage_status: z.string(),
    stage_status: z.string().optional(),
    stage_message: z.string().optional(),
    pr_detail: z.array(prDetailSchema),
    locations: z.array(locationSchema),
  });
}

export function createPoSchema(
  tv: TranslationFn,
  tf: TranslationFn,
  isManual = true,
) {
  return z.object({
    workflow_id: isManual
      ? z.string().min(1, tv("required", { field: tf("workflow") }))
      : z.string(),
    vendor_id: z.string().min(1, tv("required", { field: tf("vendor") })),
    vendor_name: z.string(),
    delivery_date: z
      .string()
      .min(1, tv("required", { field: tf("deliveryDate") })),
    currency_id: z.string().min(1, tv("required", { field: tf("currency") })),
    currency_code: z.string().optional(),
    exchange_rate: z.coerce.number().min(0),
    description: z.string(),
    order_date: z.string().min(1, tv("required", { field: tf("orderDate") })),
    credit_term_id: z.string(),
    credit_term_name: z.string(),
    credit_term_value: z.coerce.number(),
    buyer_id: z.string(),
    buyer_name: z.string(),
    email: z.string(),
    remarks: z.string(),
    note: z.string(),
    items: z
      .array(createPoDetailSchema(tv, tf))
      .min(1, tv("required", { field: tf("items") })),
  });
}

export type PoFormValues = z.infer<ReturnType<typeof createPoSchema>>;

export const PO_ITEM: PoFormValues["items"][number] = {
  description: "",
  product_id: null,
  product_code: "",
  product_name: "",
  product_local_name: "",
  product_sku: "",
  order_unit_id: null,
  order_unit_name: "",
  order_unit_conversion_factor: 1,
  order_qty: 1,
  base_unit_id: null,
  base_unit_name: "",
  base_qty: 1,
  price: 0,
  sub_total_price: 0,
  net_amount: 0,
  total_price: 0,
  tax_profile_id: null,
  tax_profile_name: "",
  tax_rate: 0,
  tax_amount: 0,
  discount_rate: 0,
  discount_amount: 0,
  is_foc: false,
  current_stage_status: "pending",
  stage_status: "",
  stage_message: "",
  pr_detail: [] as PrDetailRef[],
  locations: [] as {
    id: string;
    order_qty: number;
    received_qty: number;
  }[],
};

export const EMPTY_FORM: PoFormValues = {
  workflow_id: "",
  vendor_id: "",
  vendor_name: "",
  delivery_date: "",
  currency_id: "",
  currency_code: "",
  exchange_rate: 1,
  description: "",
  order_date: "",
  credit_term_id: "",
  credit_term_name: "",
  credit_term_value: 0,
  buyer_id: "",
  buyer_name: "",
  email: "",
  remarks: "",
  note: "",
  items: [],
};

export function getDefaultValues(
  po?: PurchaseOrder,
  options?: {
    defaultCurrencyId?: string;
    buyerId?: string;
    buyerName?: string;
    email?: string;
  },
): PoFormValues {
  if (po) {
    return {
      workflow_id: po.workflow_id ?? "",
      vendor_id: po.vendor_id ?? "",
      vendor_name: po.vendor_name ?? "",
      delivery_date: po.delivery_date ?? "",
      currency_id: po.currency_id ?? "",
      currency_code: po.currency_code ?? "",
      exchange_rate: po.exchange_rate ?? 1,
      description: po.description ?? "",
      order_date: po.order_date ?? "",
      credit_term_id: po.credit_term_id ?? "",
      credit_term_name: po.credit_term_name ?? "",
      credit_term_value: po.credit_term_value ?? 0,
      buyer_id: po.buyer_id ?? "",
      buyer_name: po.buyer_name ?? "",
      email: po.email ?? "",
      remarks: po.remarks ?? "",
      note: po.note ?? "",
      items:
        po.purchase_order_detail?.map((d) => ({
          id: d.id,
          description: d.description ?? "",
          product_id: d.product_id,
          product_code: d.product_code ?? "",
          product_name: d.product_name,
          product_local_name: d.product_local_name ?? "",
          product_sku: d.product_sku ?? "",
          order_unit_id: d.order_unit_id ?? null,
          order_unit_name: d.order_unit_name ?? "",
          order_unit_conversion_factor: d.order_unit_conversion_factor ?? 1,
          order_qty: d.order_qty,
          base_unit_id: d.base_unit_id ?? null,
          base_unit_name: d.base_unit_name ?? "",
          base_qty: d.base_qty ?? d.order_qty,
          price:
            d.price ??
            (d.order_qty > 0
              ? Math.round((d.sub_total_price / d.order_qty) * 100) / 100
              : 0),
          sub_total_price: d.sub_total_price ?? 0,
          net_amount: d.net_amount ?? 0,
          total_price: d.total_price ?? 0,
          tax_profile_id: d.tax_profile_id ?? null,
          tax_profile_name: d.tax_profile_name ?? "",
          tax_rate: d.tax_rate ?? 0,
          tax_amount: d.tax_amount ?? 0,
          discount_rate: d.discount_rate ?? 0,
          discount_amount: d.discount_amount ?? 0,
          is_foc: d.is_foc ?? false,
          current_stage_status: d.current_stage_status ?? "pending",
          stage_status: "",
          stage_message: "",
          pr_detail: d.pr_detail ?? [],
          locations:
            d.locations
              ?.filter((loc) => loc.location_id)
              ?.map((loc) => ({
                id: loc.location_id ?? "",
                order_qty: loc.order_qty ?? 0,
                received_qty: loc.received_qty ?? 0,
              })) ?? [],
        })) ?? [],
    };
  }
  return {
    ...EMPTY_FORM,
    order_date: new Date().toISOString(),
    currency_id: options?.defaultCurrencyId ?? "",
    buyer_id: options?.buyerId ?? "",
    buyer_name: options?.buyerName ?? "",
    email: options?.email ?? "",
  };
}

export function mapItemToPayload(
  item: PoFormValues["items"][number],
  index: number,
): PoDetailPayload {
  return {
    sequence: index + 1,
    product_id: item.product_id || "",
    product_code: item.product_code ?? "",
    product_name: item.product_name ?? "",
    product_local_name: item.product_local_name ?? "",
    product_sku: item.product_sku ?? "",
    order_unit_id: item.order_unit_id || "",
    order_unit_name: item.order_unit_name ?? "",
    order_unit_conversion_factor: item.order_unit_conversion_factor ?? 1,
    order_qty: item.order_qty,
    base_unit_id: item.base_unit_id || item.order_unit_id || "",
    base_unit_name: item.base_unit_name ?? "",
    base_qty: item.base_qty ?? item.order_qty,
    price: item.price ?? 0,
    sub_total_price: item.sub_total_price ?? 0,
    net_amount: item.net_amount ?? 0,
    total_price: item.total_price ?? 0,
    tax_profile_id: item.tax_profile_id || null,
    tax_profile_name: item.tax_profile_name ?? "",
    tax_rate: item.tax_rate ?? 0,
    tax_amount: item.tax_amount ?? 0,
    is_foc: item.is_foc ?? false,
    discount_rate: item.discount_rate ?? 0,
    discount_amount: item.discount_amount ?? 0,
    pr_detail: item.pr_detail ?? [],
    description: item.description ?? "",
    locations:
      item.locations?.map((loc) => ({
        location_id: loc.id,
        // form ใช้ order_qty (consistent กับ item-level field);
        // payload schema ใช้ requested_qty (backend contract)
        requested_qty: loc.order_qty,
        received_qty: loc.received_qty,
      })) ?? [],
  };
}
