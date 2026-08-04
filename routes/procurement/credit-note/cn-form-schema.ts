import { z } from "zod";
import type { TranslationFn } from "@/lib/i18n-schema";
import type { CreditNoteDetail, CnItemPayload } from "@/types/credit-note";

/**
 * สร้าง Zod schema สำหรับรายการสินค้าในใบลดหนี้
 * กำหนด validation ของ location, product, qty, unit, price, tax, discount
 * ใช้ร่วมกับ createCnSchema ในฐานะ items array
 *
 * เงื่อนไขที่ขึ้นกับประเภทใบ (จำนวนคืน vs ยอดลดหนี้) อยู่ที่ superRefine ของ
 * createCnSchema แทน — ระดับ item มองไม่เห็น credit_note_type ของแม่
 *
 * @param tv - ฟังก์ชันแปลข้อความ validation (next-intl)
 * @param tf - ฟังก์ชันแปลชื่อฟิลด์ (next-intl)
 * @returns Zod object schema ของ CN item
 * @example
 * const item = createCnItemSchema(tv, tf);
 * item.parse({ item_id: "p1", quantity: 1, unit_id: "u1", ... });
 */
function createCnItemSchema(tv: TranslationFn, tf: TranslationFn) {
  return z
    .object({
      id: z.string().optional(),
      doc_version: z.coerce.number().optional(),
      _group_key: z.string(),
      // ยอดของบรรทัด GRN ต้นทาง — แถวหลักในตารางแสดงชุดนี้ให้เทียบกับยอดที่คิด
      // จากจำนวนคืน ทุกตัวเป็น display อย่างเดียว ไม่ส่งเข้า payload
      // (_grn_received_qty ยังเป็นเพดานของจำนวนคืนด้วย · null = ยังไม่รู้ค่า เช่น
      // ใบเก่าที่โหลด GRN ไม่เสร็จ → ไม่บังคับเพดาน จะได้ไม่บล็อกมั่ว
      // ส่วน 0 คือรับมา 0 จริง = คืนไม่ได้เลย ห้ามเอาไปปนกับ "ไม่รู้")
      _grn_received_qty: z.coerce.number().nullable(),
      _grn_price: z.coerce.number(),
      _grn_sub_total: z.coerce.number(),
      _grn_discount_amount: z.coerce.number(),
      _grn_net_amount: z.coerce.number(),
      _grn_tax_amount: z.coerce.number(),
      _grn_total_amount: z.coerce.number(),
      location_id: z
        .string()
        .nullable()
        .refine((v) => !!v, tv("required", { field: tf("location") })),
      location_name: z.string(),
      // display เท่านั้น — ไม่ส่งเข้า payload
      location_code: z.string(),
      item_id: z
        .string()
        .nullable()
        .refine((v) => !!v, tv("required", { field: tf("product") })),
      item_name: z.string(),
      // display เท่านั้น — ไม่ส่งเข้า payload (เหมือน item_name)
      item_local_name: z.string(),
      // คืนเป็นเศษได้ (0.5 kg) · ต้อง > 0 เฉพาะใบประเภทจำนวนคืน (เช็คที่ระดับฟอร์ม)
      quantity: z.coerce.number().min(0),
      requested_qty: z.coerce.number().min(0),
      approved_qty: z.coerce.number().min(0),
      unit_id: z.string().min(1, tv("required", { field: tf("unit") })),
      unit_name: z.string(),
      currency_code: z.string(),
      unit_price: z.coerce.number().min(0),
      net_amount: z.coerce.number().min(0),
      discount_rate: z.coerce.number().min(0),
      discount_amount: z.coerce.number().min(0),
      is_discount_adjustment: z.boolean(),
      tax_profile_id: z.string().nullable(),
      tax_profile_name: z.string(),
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
  return z
    .object({
      doc_version: z.coerce.number().optional(),
      credit_note_type: z.enum(["quantity_return", "amount_discount"], {
        error: tv("creditNoteTypeRequired"),
      }),
      grn_id: z.string().min(1, tv("required", { field: tf("grn") })),
      grn_date: z.string().min(1, tv("required", { field: tf("grnDate") })),
      vendor_id: z.string().min(1, tv("required", { field: tf("vendor") })),
      cn_no: z.string(),
      cn_date: z.string().min(1, tv("required", { field: tf("docDate") })),
      reason: z.string().min(1, tv("required", { field: tf("reason") })),
      reference_number: z.string(),
      description: z.string(),
      currency_code: z
        .string()
        .min(1, tv("required", { field: tf("currency") })),
      exchange_rate: z.coerce
        .number()
        .gt(0, tv("minNumber", { field: tf("exchangeRate"), min: 0 })),
      // invoice_no / invoice_date เป็นข้อมูลอ้างอิงจาก GRN (readOnly แก้เองไม่ได้) —
      // GRN บางใบไม่มีค่า จึงไม่บังคับ กัน submit โดนบล็อกเงียบ ๆ โดยไม่มี error โชว์
      invoice_no: z.string(),
      invoice_date: z.string(),
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
    })
    .superRefine((values, ctx) => {
      // ยอดของแต่ละแถวมาจากคนละช่องตามประเภทใบ — บังคับช่องที่ผู้ใช้เห็นจริงเท่านั้น
      // ไม่งั้นจะตกที่ฟิลด์ที่หน้าจอนั้นไม่ได้เรนเดอร์ = error ที่แก้ไม่ได้
      const isAmountDiscount = values.credit_note_type === "amount_discount";
      values.items.forEach((item, index) => {
        if (isAmountDiscount) {
          // ยอดลดหนี้ 0 = ใบไม่มีความหมาย (จำนวนคืนเป็น ref ไม่ใช่ตัวตั้ง)
          if (!(item.net_amount > 0)) {
            ctx.addIssue({
              code: "custom",
              path: ["items", index, "net_amount"],
              message: tv("positive", { field: tf("cnAmount") }),
            });
          }
          return;
        }
        if (!(item.quantity > 0)) {
          ctx.addIssue({
            code: "custom",
            path: ["items", index, "quantity"],
            message: tv("positive", { field: tf("returnQty") }),
          });
          return;
        }
        // คืนเกินที่รับมาไม่ได้ — บล็อกตั้งแต่ในฟอร์ม ไม่ปล่อยไปตายที่ backend
        // (backend เช็คสะสมข้ามใบอีกชั้น เพดานจริงอาจต่ำกว่านี้ถ้าเคยคืนไปแล้ว)
        // ข้อความไม่บอกตัวเลขเพดานซ้ำ — คอลัมน์ Received อยู่ติดกันในแถวเดียวกัน
        if (
          item._grn_received_qty != null &&
          item.quantity > item._grn_received_qty
        ) {
          ctx.addIssue({
            code: "custom",
            path: ["items", index, "quantity"],
            message: tv("maxReturnQty"),
          });
        }
      });
    });
}

export type CnFormValues = z.infer<ReturnType<typeof createCnSchema>>;

// --- Defaults ---

export const CN_ITEM = {
  _group_key: "",
  _grn_received_qty: 0,
  _grn_price: 0,
  _grn_sub_total: 0,
  _grn_discount_amount: 0,
  _grn_net_amount: 0,
  _grn_tax_amount: 0,
  _grn_total_amount: 0,
  location_id: null,
  location_name: "",
  location_code: "",
  item_id: null,
  item_name: "",
  item_local_name: "",
  // จำนวนคืนเริ่มที่ 0 เสมอ — คนกรอกต้องตัดสินใจเองว่าคืนเท่าไหร่
  // (เติมจำนวนที่รับให้ล่วงหน้า = ชวนให้กด save ทั้งที่ยังไม่ได้ดู)
  quantity: 0,
  requested_qty: 0,
  approved_qty: 0,
  unit_id: "",
  unit_name: "",
  currency_code: "",
  unit_price: 0,
  net_amount: 0,
  discount_rate: 0,
  discount_amount: 0,
  is_discount_adjustment: false,
  tax_profile_id: null,
  tax_profile_name: "",
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
 * @param cn - CreditNoteDetail ที่จะแก้ไข (optional)
 * @returns CnFormValues พร้อมใช้กับ useForm
 * @example
 * const defaultValues = getDefaultValues(cn);
 * const form = useForm<CnFormValues>({ defaultValues, resolver });
 */
export function getDefaultValues(cn?: CreditNoteDetail): CnFormValues {
  if (cn) {
    return {
      doc_version: cn.doc_version,
      credit_note_type: cn.credit_note_type ?? "quantity_return",
      grn_id: cn.grn?.id ?? "",
      grn_date: cn.grn?.date ?? "",
      vendor_id: cn.vendor?.id ?? "",
      cn_no: cn.cn_no ?? "",
      cn_date: cn.cn_date ?? "",
      reason: cn.cn_reason?.id ?? "",
      reference_number: cn.reference_number ?? "",
      description: cn.description ?? "",
      currency_code: cn.currency?.id ?? "",
      exchange_rate: cn.currency?.exchange_rate ?? 1,
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
          doc_version: d.doc_version,
          _group_key: d.product?.id ?? d.id,
          // ยอดฝั่ง GRN ไม่ได้มากับ API ของ CN — cn-item เติมให้จาก GRN ต้นทาง
          // (null = ยังไม่รู้ ไม่ใช่ 0 ไม่งั้นเพดานจะบล็อกทุกแถวก่อน GRN มาถึง)
          _grn_received_qty: null,
          _grn_price: 0,
          _grn_sub_total: 0,
          _grn_discount_amount: 0,
          _grn_net_amount: 0,
          _grn_tax_amount: 0,
          _grn_total_amount: 0,
          location_id: d.location?.id ?? null,
          location_name: d.location?.name ?? "",
          location_code: d.location?.code ?? "",
          item_id: d.product?.id ?? "",
          item_name: d.product?.name ?? "",
          item_local_name: d.product?.local_name ?? "",
          quantity: d.return_qty,
          requested_qty: 0,
          approved_qty: 0,
          unit_id: d.return_unit?.id ?? "",
          unit_name: d.return_unit?.name ?? "",
          currency_code: cn.currency?.code ?? "",
          unit_price: d.price ?? 0,
          net_amount: d.net_amount ?? 0,
          discount_rate: d.discount_rate ?? 0,
          discount_amount: d.discount_amount ?? 0,
          is_discount_adjustment: d.is_discount_adjustment ?? false,
          tax_profile_id: d.tax_profile?.id ?? null,
          tax_profile_name: d.tax_profile?.name ?? "",
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
 * ยกค่าอ้างอิงฝั่ง GRN (`_grn_*`) ของแถวเดิมมาใส่ค่า default ชุดใหม่
 *
 * ค่าพวกนี้ไม่ได้มากับ API ของ CN — `cn-item` ไปดึงจาก GRN ต้นทางมาเติมเองครั้งเดียว
 * ตอน GRN โหลดเสร็จ ถ้า reset ทับตรง ๆ จะกลับเป็น null แล้วไม่มีใครเติมซ้ำ
 * (effect ฝั่ง cn-item ไม่ขยับ) = เพดานจำนวนคืนหลุดทั้งใบจนกว่าจะ reload
 *
 * @param next - ค่า default ชุดใหม่ที่ได้จาก getDefaultValues
 * @param current - ค่าปัจจุบันในฟอร์ม (`form.getValues("items")`)
 * @returns next ที่แถวเดิม (match ด้วย id) ได้ `_grn_*` ที่รู้แล้วกลับคืน
 * @example
 * form.reset(keepGrnRefs(getDefaultValues(cn), form.getValues("items")));
 */
export function keepGrnRefs(
  next: CnFormValues,
  current: CnFormValues["items"],
): CnFormValues {
  const known = new Map(current.filter((i) => i.id).map((i) => [i.id, i]));
  return {
    ...next,
    items: next.items.map((item) => {
      const prev = item.id ? known.get(item.id) : undefined;
      if (!prev || prev._grn_received_qty == null) return item;
      return {
        ...item,
        _grn_received_qty: prev._grn_received_qty,
        _grn_price: prev._grn_price,
        _grn_sub_total: prev._grn_sub_total,
        _grn_discount_amount: prev._grn_discount_amount,
        _grn_net_amount: prev._grn_net_amount,
        _grn_tax_amount: prev._grn_tax_amount,
        _grn_total_amount: prev._grn_total_amount,
      };
    }),
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
    ...(item.doc_version != null ? { doc_version: item.doc_version } : {}),
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
    discount_rate: item.discount_rate ?? 0,
    discount_amount: item.discount_amount ?? 0,
    is_discount_adjustment: item.is_discount_adjustment ?? false,
    ...(item.tax_profile_id ? { tax_profile_id: item.tax_profile_id } : {}),
    tax_rate: item.tax_rate ?? 0,
    tax_amount: item.tax_amount ?? 0,
    total_price: item.total_amount ?? 0,
    is_tax_adjustment: item.is_tax_adjustment ?? false,
    description: item.description ?? "",
  };
}
