import { z } from "zod";
import type { TranslationFn } from "@/lib/i18n-schema";
import type { CreditNote, CnItemPayload } from "@/types/credit-note";

/**
 * สร้าง Zod schema สำหรับรายการสินค้าในใบลดหนี้
 * กำหนด validation ของ location, product, qty, unit, price, tax, discount
 * ใช้ร่วมกับ createCnSchema ในฐานะ items array
 *
 * @param tv - ฟังก์ชันแปลข้อความ validation (next-intl)
 * @param tf - ฟังก์ชันแปลชื่อฟิลด์ (next-intl)
 * @returns Zod object schema ของ CN item
 * @example
 * const item = createCnItemSchema(tv, tf);
 * item.parse({ item_id: "p1", quantity: 1, unit_id: "u1", ... });
 */
function createCnItemSchema(tv: TranslationFn, tf: TranslationFn) {
  return z.object({
    id: z.string().optional(),
    location_id: z
      .string()
      .nullable()
      .refine((v) => !!v, tv("required", { field: tf("location") })),
    location_name: z.string(),
    item_id: z
      .string()
      .nullable()
      .refine((v) => !!v, tv("required", { field: tf("product") })),
    item_name: z.string(),
    quantity: z.coerce
      .number()
      .min(1, tv("minNumber", { field: tf("qty"), min: 1 })),
    requested_qty: z.coerce.number().min(0),
    approved_qty: z.coerce.number().min(0),
    unit_id: z.string().min(1, tv("required", { field: tf("unit") })),
    unit_name: z.string(),
    currency_code: z.string(),
    unit_price: z.coerce.number().min(0),
    net_amount: z.coerce.number().min(0),
    tax_rate: z.coerce.number().min(0),
    tax_amount: z.coerce.number().min(0),
    total_amount: z.coerce.number().min(0),
    is_tax_adjustment: z.boolean(),
    description: z.string(),
  });
}

/**
 * สร้าง Zod schema หลักของฟอร์มใบลดหนี้
 * รองรับทั้งประเภท quantity_return และ amount_discount
 * ประกอบด้วย grn, vendor, currency, invoice, tax invoice และ items
 *
 * @param tv - ฟังก์ชันแปลข้อความ validation
 * @param tf - ฟังก์ชันแปลชื่อฟิลด์
 * @returns Zod schema ของฟอร์มใบลดหนี้
 * @example
 * const schema = createCnSchema(tv, tf);
 * const form = useForm<CnFormValues>({ resolver: zodResolver(schema) as Resolver<CnFormValues> });
 */
export function createCnSchema(tv: TranslationFn, tf: TranslationFn) {
  return z.object({
    credit_note_type: z.enum(["quantity_return", "amount_discount"], {
      error: tv("creditNoteTypeRequired"),
    }),
    grn_id: z.string().min(1, tv("required", { field: tf("grn") })),
    grn_date: z
      .string()
      .min(1, tv("required", { field: tf("grnDate") })),
    vendor_id: z.string().min(1, tv("required", { field: tf("vendor") })),
    cn_no: z.string(),
    cn_date: z.string().min(1, tv("required", { field: tf("docDate") })),
    reason: z.string().min(1, tv("required", { field: tf("reason") })),
    reference_number: z.string(),
    description: z.string(),
    currency_code: z.string().min(1, tv("required", { field: tf("currency") })),
    exchange_rate: z.coerce
      .number()
      .gt(0, tv("minNumber", { field: tf("exchangeRate"), min: 0 })),
    invoice_no: z
      .string()
      .min(1, tv("required", { field: tf("invoiceNo") })),
    invoice_date: z
      .string()
      .min(1, tv("required", { field: tf("invoiceDate") })),
    tax_invoice_no: z
      .string()
      .min(1, tv("required", { field: tf("taxInvoiceNo") })),
    tax_invoice_date: z
      .string()
      .min(1, tv("required", { field: tf("taxInvoiceDate") })),
    tax_amount: z.coerce.number().min(0),
    discount_amount: z.coerce.number().min(0),
    notes: z.string(),
    items: z
      .array(createCnItemSchema(tv, tf))
      .min(1, tv("required", { field: tf("items") })),
  });
}

export type CnFormValues = z.infer<ReturnType<typeof createCnSchema>>;

// --- Defaults ---

export const CN_ITEM = {
  location_id: null,
  location_name: "",
  item_id: null,
  item_name: "",
  quantity: 1,
  requested_qty: 0,
  approved_qty: 0,
  unit_id: "",
  unit_name: "",
  currency_code: "",
  unit_price: 0,
  net_amount: 0,
  tax_rate: 0,
  tax_amount: 0,
  total_amount: 0,
  is_tax_adjustment: false,
  description: "",
} as const;

export const EMPTY_FORM: CnFormValues = {
  credit_note_type: "quantity_return",
  grn_id: "",
  grn_date: "",
  vendor_id: "",
  cn_no: "",
  cn_date: "",
  reason: "",
  reference_number: "",
  description: "",
  currency_code: "",
  exchange_rate: 0,
  invoice_no: "",
  invoice_date: "",
  tax_invoice_no: "",
  tax_invoice_date: "",
  tax_amount: 0,
  discount_amount: 0,
  notes: "",
  items: [],
};

// --- Helpers ---

/**
 * คืนค่าเริ่มต้นของฟอร์มใบลดหนี้
 * กรณีแก้ไข: แปลงจาก CreditNote เป็น CnFormValues (รวม items)
 * กรณีสร้างใหม่: ใช้ EMPTY_FORM + cn_date ปัจจุบัน — currency มาจากการเลือก GRN
 *
 * @param cn - CreditNote ที่จะแก้ไข (optional)
 * @returns CnFormValues พร้อมใช้กับ useForm
 * @example
 * const defaultValues = getDefaultValues(cn);
 * const form = useForm<CnFormValues>({ defaultValues, resolver });
 */
export function getDefaultValues(cn?: CreditNote): CnFormValues {
  if (cn) {
    return {
      credit_note_type: cn.credit_note_type ?? "quantity_return",
      grn_id: cn.grn_id ?? "",
      grn_date: cn.grn_date ?? "",
      vendor_id: cn.vendor_id ?? "",
      cn_no: cn.cn_no ?? "",
      cn_date: cn.cn_date ?? "",
      reason: cn.cn_reason_id ?? "",
      reference_number: cn.reference_number ?? "",
      description: cn.description ?? "",
      currency_code: cn.currency_id ?? "",
      exchange_rate: cn.exchange_rate ?? 1,
      invoice_no: cn.invoice_no ?? "",
      invoice_date: cn.invoice_date ?? "",
      tax_invoice_no: cn.tax_invoice_no ?? "",
      tax_invoice_date: cn.tax_invoice_date ?? "",
      tax_amount: cn.tax_amount ?? 0,
      discount_amount: cn.discount_amount ?? 0,
      notes: cn.note ?? "",
      items:
        cn.credit_note_detail?.map((d) => ({
          id: d.id,
          location_id: d.location_id ?? null,
          location_name: d.location_name ?? "",
          item_id: d.product_id,
          item_name: d.product_name ?? "",
          quantity: d.return_qty,
          requested_qty: 0,
          approved_qty: 0,
          unit_id: d.return_unit_id ?? "",
          unit_name: d.return_unit_name ?? "",
          currency_code: cn.currency_code ?? "",
          unit_price: d.price ?? 0,
          net_amount: d.net_amount ?? 0,
          tax_rate: d.tax_rate ?? 0,
          tax_amount: d.tax_amount ?? 0,
          total_amount: d.total_price ?? 0,
          is_tax_adjustment: d.is_tax_adjustment ?? false,
          description: d.description ?? "",
        })) ?? [],
    };
  }
  return {
    ...EMPTY_FORM,
    cn_date: new Date().toISOString(),
    currency_code: "",
  };
}

/**
 * แปลง item ของฟอร์ม CN เป็น payload สำหรับส่ง API
 * map field ชื่อ form เป็นชื่อที่ API คาดหวัง (return_qty/return_unit_id/price)
 * ใช้กับ buildItemChanges เพื่อสร้าง add/update/remove arrays
 *
 * @param item - item จากฟอร์ม CnFormValues.items[number]
 * @returns CnItemPayload พร้อมส่ง API
 * @example
 * const details = buildItemChanges(values.items, defaultItems, dirtyItems, mapItemToPayload);
 */
export function mapItemToPayload(
  item: CnFormValues["items"][number],
): CnItemPayload {
  return {
    location_id: item.location_id || "",
    location_name: item.location_name,
    product_id: item.item_id || "",
    product_name: item.item_name,
    requested_qty: item.requested_qty ?? 0,
    approved_qty: item.approved_qty ?? 0,
    return_qty: item.quantity,
    return_unit_id: item.unit_id,
    return_unit_name: item.unit_name,
    currency_code: item.currency_code,
    price: item.unit_price ?? 0,
    net_amount: item.net_amount ?? 0,
    tax_rate: item.tax_rate ?? 0,
    tax_amount: item.tax_amount ?? 0,
    total_price: item.total_amount ?? 0,
    is_tax_adjustment: item.is_tax_adjustment ?? false,
    description: item.description ?? "",
  };
}
