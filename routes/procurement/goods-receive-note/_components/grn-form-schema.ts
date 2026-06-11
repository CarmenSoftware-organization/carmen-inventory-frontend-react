import { z } from "zod";
import { round2 } from "@/lib/currency-utils";
import type { TranslationFn } from "@/lib/i18n-schema";
import type {
  GoodsReceiveNote,
  GrnDetailPayload,
  ExtraCostDetailPayload,
} from "@/types/goods-receive-note";

function createGrnDetailSchema(tv: TranslationFn, tf: TranslationFn) {
  return z.object({
    id: z.string().optional(),
    _group_key: z.string(),
    purchase_order_id: z.string().nullable(),
    purchase_order_no: z.string(),
    purchase_order_detail_id: z.string().nullable(),
    product_id: z
      .string()
      .nullable()
      .refine((v) => !!v, tv("required", { field: tf("product") })),
    product_name: z.string(),
    location_id: z
      .string()
      .nullable()
      .refine((v) => !!v, tv("required", { field: tf("location") })),
    location_name: z.string(),
    location_code: z.string(),
    location_type: z.string(),
    // Quantities
    foc_qty: z.coerce.number(),
    foc_unit_id: z.string().nullable(),
    foc_unit_conversion_factor: z.coerce.number(),
    approved_qty: z.coerce.number(),
    approved_unit_id: z.string().nullable(),
    received_qty: z.coerce
      .number()
      .min(1, tv("minNumber", { field: tf("receivedQty"), min: 1 })),
    received_unit_id: z
      .string()
      .nullable()
      .refine((v) => !!v, tv("required", { field: tf("unit") })),
    received_base_qty: z.coerce.number(),
    received_base_unit_id: z.string().nullable(),
    received_unit_conversion_factor: z.coerce.number(),
    // Tax
    tax_profile_id: z.string().nullable().optional(),
    tax_rate: z.coerce.number(),
    tax_amount: z.coerce.number(),
    is_tax_adjustment: z.boolean(),
    // Discount
    discount_rate: z.coerce.number(),
    discount_amount: z.coerce.number(),
    is_discount_adjustment: z.boolean(),
    // Amounts
    unit_price: z.coerce.number().optional(),
    net_amount: z.coerce.number(),
    total_price: z.coerce.number(),
    // Notes
    description: z.string().optional(),
    note: z.string().optional(),
  });
}

function createExtraCostDetailSchema(tv: TranslationFn, tf: TranslationFn) {
  return z.object({
    id: z.string().optional(),
    extra_cost_type_id: z
      .string()
      .min(1, tv("required", { field: tf("extraCost") })),
    note: z.string(),
    amount: z.coerce.number().min(0),
  });
}

export function createGrnSchema(tv: TranslationFn, tf: TranslationFn) {
  return z.object({
    grn_date: z.string().min(1, tv("required", { field: tf("grnDate") })),
    expired_date: z.string().nullable(),
    invoice_no: z.string().min(1, tv("required", { field: tf("invoiceNo") })),
    invoice_date: z
      .string()
      .nullable()
      .refine((v) => !!v, tv("required", { field: tf("invoiceDate") })),
    description: z.string(),
    note: z.string(),
    doc_status: z.string().min(1, tv("required", { field: tf("docStatus") })),
    doc_type: z.string().min(1, tv("required", { field: tf("docType") })),
    is_consignment: z.boolean(),
    is_cash: z.boolean(),
    credit_term_id: z.string().nullable().optional(),
    credit_term_name: z.string().optional(),
    credit_term_days: z.coerce.number().nullable().optional(),
    payment_due_date: z.string().nullable().optional(),
    is_active: z.boolean(),
    vendor_id: z
      .string()
      .nullable()
      .refine((v) => !!v, tv("required", { field: tf("vendor") })),
    vendor_name: z.string(),
    currency_id: z
      .string()
      .nullable()
      .refine((v) => !!v, tv("required", { field: tf("currency") })),
    currency_name: z.string(),
    exchange_rate: z.coerce.number().nullable(),
    exchange_rate_date: z.string().nullable(),
    received_at: z
      .string()
      .nullable()
      .refine((v) => !!v, tv("required", { field: tf("receivedAt") })),
    info: z.string(),
    dimension: z.string(),
    // Extra cost header
    allocate_extra_cost_type: z.string(),
    // Arrays
    items: z
      .array(createGrnDetailSchema(tv, tf))
      .min(1, tv("required", { field: tf("items") })),
    extra_cost_details: z.array(createExtraCostDetailSchema(tv, tf)),
  });
}

export type GrnFormValues = z.infer<ReturnType<typeof createGrnSchema>>;

export const EMPTY_DETAIL: GrnFormValues["items"][number] = {
  _group_key: "",
  purchase_order_id: null,
  purchase_order_no: "",
  purchase_order_detail_id: null,
  product_id: null,
  product_name: "",
  location_id: null,
  location_name: "",
  location_code: "",
  location_type: "",
  foc_qty: 0,
  foc_unit_id: null,
  foc_unit_conversion_factor: 0,
  approved_qty: 0,
  approved_unit_id: null,
  received_qty: 0,
  received_unit_id: null,
  received_base_qty: 0,
  received_base_unit_id: null,
  received_unit_conversion_factor: 0,
  tax_profile_id: null,
  tax_rate: 0,
  tax_amount: 0,
  is_tax_adjustment: false,
  discount_rate: 0,
  discount_amount: 0,
  is_discount_adjustment: false,
  unit_price: 0,
  net_amount: 0,
  total_price: 0,
  description: "",
  note: "",
};

// --- Default extra cost detail ---

export const EMPTY_EXTRA_COST: GrnFormValues["extra_cost_details"][number] = {
  extra_cost_type_id: "",
  note: "",
  amount: 0,
};

const objectToText = (
  value: unknown[] | Record<string, unknown> | null | undefined,
): string => {
  if (!value) return "";
  if (Array.isArray(value) && value.length === 0) return "";
  if (typeof value === "object" && Object.keys(value).length === 0) return "";
  return JSON.stringify(value, null, 2);
};

export function getDefaultValues(grn?: GoodsReceiveNote): GrnFormValues {
  if (!grn) {
    return {
      grn_date: new Date().toISOString(),
      expired_date: null,
      invoice_no: "",
      invoice_date: null,
      description: "",
      note: "",
      doc_status: "draft",
      doc_type: "purchase_order",
      is_consignment: false,
      is_cash: false,
      credit_term_id: null,
      credit_term_name: "",
      credit_term_days: null,
      payment_due_date: null,
      is_active: true,
      vendor_id: null,
      vendor_name: "",
      currency_id: "",
      currency_name: "",
      exchange_rate: 1,
      exchange_rate_date: new Date().toISOString(),
      received_at: new Date().toISOString(),
      info: "",
      dimension: "",
      allocate_extra_cost_type: "by_qty",
      items: [],
      extra_cost_details: [],
    };
  }

  return {
    grn_date: grn.grn_date ?? "",
    expired_date: grn.expired_date ?? null,
    invoice_no: grn.invoice_no ?? "",
    invoice_date: grn.invoice_date,
    description: grn.description ?? "",
    note: grn.note ?? "",
    doc_status: grn.doc_status,
    doc_type: grn.doc_type,
    is_consignment: grn.is_consignment,
    is_cash: grn.is_cash,
    credit_term_id: grn.credit_term_id,
    credit_term_name: grn.credit_term_name ?? "",
    credit_term_days: grn.credit_term_days,
    payment_due_date: grn.payment_due_date,
    is_active: grn.is_active,
    vendor_id: grn.vendor_id,
    vendor_name: grn.vendor_name ?? "",
    currency_id: grn.currency_id,
    currency_name: grn.currency_name ?? "",
    exchange_rate: grn.exchange_rate ?? 1,
    exchange_rate_date: grn.exchange_rate_date,
    received_at: grn.received_at,
    info: objectToText(grn.info),
    dimension: objectToText(grn.dimension),
    allocate_extra_cost_type:
      grn.extra_cost?.[0]?.allocate_extra_cost_type ?? "by_qty",
    items:
      grn.good_received_note_detail?.flatMap((detail) =>
        detail.items.map((item) => ({
          id: item.id,
          _group_key: detail.product_id,
          purchase_order_id: detail.purchase_order_id,
          purchase_order_no: detail.po_no ?? "",
          purchase_order_detail_id: detail.purchase_order_detail_id,
          product_id: detail.product_id,
          product_name: detail.product_name ?? "",
          location_id: detail.location_id,
          location_name: detail.location_name ?? "",
          location_code: detail.location_code ?? "",
          location_type: detail.location_type ?? "",
          foc_qty: item.foc_qty,
          foc_unit_id: item.foc_unit_id,
          foc_unit_conversion_factor: item.foc_unit_conversion_factor,
          approved_qty: item.order_qty,
          approved_unit_id: item.order_unit_id,
          received_qty: item.received_qty,
          received_unit_id: item.received_unit_id,
          received_base_qty: item.received_base_qty,
          received_base_unit_id: null,
          received_unit_conversion_factor: item.received_unit_conversion_factor,
          tax_profile_id: item.tax_profile_id,
          tax_rate: item.tax_rate,
          tax_amount: item.tax_amount,
          is_tax_adjustment: item.is_tax_adjustment,
          discount_rate: item.discount_rate ?? 0,
          discount_amount: item.discount_amount ?? 0,
          is_discount_adjustment: item.is_discount_adjustment ?? false,
          unit_price:
            item.received_qty > 0
              ? round2(item.sub_total_price / item.received_qty)
              : 0,
          net_amount: item.net_amount ?? 0,
          total_price: item.total_price,
          description: "",
          note: item.note ?? "",
        })),
      ) ?? [],
    extra_cost_details:
      grn.extra_cost_detail?.map((d) => ({
        id: d.id,
        extra_cost_type_id: d.extra_cost_type_id,
        note: d.note ?? "",
        amount: d.amount,
      })) ?? [],
  };
}

export function mapDetailToPayload(
  item: GrnFormValues["items"][number],
): GrnDetailPayload {
  return {
    purchase_order_detail_id: item.purchase_order_detail_id,
    product_id: item.product_id || "",
    location_id: item.location_id,
    foc_qty: item.foc_qty,
    foc_unit_id: item.foc_unit_id,
    foc_unit_conversion_factor: item.foc_unit_conversion_factor,
    approved_qty: item.approved_qty,
    approved_unit_id: item.approved_unit_id,
    received_qty: item.received_qty,
    received_unit_id: item.received_unit_id,
    received_base_qty: item.received_base_qty,
    received_base_unit_id: item.received_base_unit_id,
    received_unit_conversion_factor: item.received_unit_conversion_factor,
    ...(item.tax_profile_id ? { tax_profile_id: item.tax_profile_id } : {}),
    tax_rate: item.tax_rate,
    tax_amount: item.tax_amount,
    is_tax_adjustment: item.is_tax_adjustment,
    discount_rate: item.discount_rate,
    discount_amount: item.discount_amount,
    is_discount_adjustment: item.is_discount_adjustment,
    net_amount: item.net_amount,
    total_price: item.total_price,
    description: item.description,
    note: item.note,
  };
}

export function mapExtraCostToPayload(
  item: GrnFormValues["extra_cost_details"][number],
): ExtraCostDetailPayload {
  return {
    extra_cost_type_id: item.extra_cost_type_id,
    note: item.note,
    amount: item.amount,
  };
}
