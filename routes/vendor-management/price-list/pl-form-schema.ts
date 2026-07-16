import { z } from "zod";
import type { FieldArrayWithId } from "react-hook-form";
import type { TranslationFn } from "@/lib/i18n-schema";
import type { PriceList } from "@/types/price-list";

/**
 * สร้าง zod schema สำหรับรายการสินค้าใน price list หนึ่งรายการ
 * @param tv - ฟังก์ชัน translation สำหรับ validation
 * @param tf - ฟังก์ชัน translation สำหรับชื่อ field
 * @returns zod schema ของ price list detail
 */
function createPriceListDetailSchema(tv: TranslationFn, tf: TranslationFn) {
  return z.object({
    id: z.string().optional(),
    product_id: z.string().min(1, tv("required", { field: tf("product") })),
    unit_id: z.string().min(1, tv("required", { field: tf("unit") })),
    moq_qty: z.coerce.number().min(0),
    price: z.coerce.number().min(0),
    price_without_tax: z.coerce.number().min(0),
    tax_profile_id: z.string().min(1, tv("required", { field: tf("taxProfile") })),
    tax_rate: z.coerce.number().min(0),
    tax_amt: z.coerce.number().min(0),
    lead_time_days: z.coerce.number().min(0),
    is_preferred: z.boolean(),
  });
}

/**
 * สร้าง zod schema ของ price list form พร้อมตรวจสอบช่วงวันที่
 * @param tv - ฟังก์ชัน translation สำหรับ validation
 * @param tf - ฟังก์ชัน translation สำหรับชื่อ field
 * @returns zod schema ของ price list form
 */
export function createPriceListSchema(tv: TranslationFn, tf: TranslationFn) {
  return z
    .object({
      name: z.string().min(1, tv("required", { field: tf("name") })),
      description: z.string(),
      status: z.enum(["draft", "active", "inactive"]),
      vendor_id: z.string().min(1, tv("required", { field: tf("vendor") })),
      currency_id: z.string().min(1, tv("required", { field: tf("currency") })),
      effective_from_date: z.string().min(1, tv("required", { field: tf("startDate") })),
      effective_to_date: z.string().min(1, tv("required", { field: tf("endDate") })),
      note: z.string(),
      pricelist_detail: z.array(createPriceListDetailSchema(tv, tf)),
    })
    .refine(
      (data) =>
        !data.effective_from_date ||
        !data.effective_to_date ||
        new Date(data.effective_to_date) >= new Date(data.effective_from_date),
      {
        message: tv("endDateAfterStart"),
        path: ["effective_to_date"],
      },
    )
    .superRefine((data, ctx) => {
      // MOQ tier ต่อ product+unit เดียวกัน: ชั้นที่ MOQ สูงกว่าต้องราคาไม่แพงกว่า
      const groups = new Map<string, number[]>();
      data.pricelist_detail.forEach((d, i) => {
        const key = `${d.product_id}::${d.unit_id}`;
        const bucket = groups.get(key);
        if (bucket) bucket.push(i);
        else groups.set(key, [i]);
      });
      for (const indices of groups.values()) {
        const sorted = [...indices].sort(
          (a, b) =>
            data.pricelist_detail[a].moq_qty - data.pricelist_detail[b].moq_qty,
        );
        for (let k = 1; k < sorted.length; k++) {
          const prev = data.pricelist_detail[sorted[k - 1]];
          const cur = data.pricelist_detail[sorted[k]];
          if (cur.moq_qty === prev.moq_qty) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: tv("moqDuplicate"),
              path: ["pricelist_detail", sorted[k], "moq_qty"],
            });
          } else if (cur.price > prev.price) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: tv("moqTierPrice"),
              path: ["pricelist_detail", sorted[k], "price"],
            });
          }
        }
      }
    });
}

export type PriceListFormValues = z.infer<ReturnType<typeof createPriceListSchema>>;

export type PriceListDetailField = FieldArrayWithId<
  PriceListFormValues,
  "pricelist_detail",
  "id"
>;

const EMPTY_FORM: PriceListFormValues = {
  name: "",
  description: "",
  status: "draft",
  vendor_id: "",
  currency_id: "",
  effective_from_date: "",
  effective_to_date: "",
  note: "",
  pricelist_detail: [],
};

/**
 * คำนวณค่าเริ่มต้นของ price list form จากข้อมูลที่มีอยู่ หรือใช้ค่าเริ่มต้น
 * @param priceList - ข้อมูล price list ที่จะใช้ pre-fill (optional)
 * @param options - ตัวเลือกเพิ่มเติม เช่น default currency id
 * @returns ค่า default ของ price list form
 */
export function getDefaultValues(
  priceList?: PriceList,
  options?: { defaultCurrencyId?: string },
): PriceListFormValues {
  if (priceList) {
    const parts = priceList.effectivePeriod.split(" - ");
    const fmt = (s: string) => {
      const d = new Date(s.trim());
      return Number.isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
    };
    const from = parts.length === 2 ? fmt(parts[0]) : "";
    const to = parts.length === 2 ? fmt(parts[1]) : "";

    return {
      name: priceList.name,
      description: priceList.description ?? "",
      status: priceList.status as PriceListFormValues["status"],
      vendor_id: priceList.vendor?.id ?? "",
      currency_id: priceList.currency?.id ?? "",
      effective_from_date: from,
      effective_to_date: to,
      note: priceList.note ?? "",
      pricelist_detail:
        priceList.pricelist_detail?.map((d) => ({
          id: d.id,
          product_id: d.product_id,
          unit_id: d.unit_id,
          moq_qty: d.moq_qty,
          price: d.price,
          price_without_tax: d.price_without_tax,
          tax_profile_id: d.tax_profile_id ?? "",
          tax_rate: d.tax_rate ?? 0,
          tax_amt: d.tax_amt,
          lead_time_days: d.lead_time_days,
          is_preferred: d.is_preferred ?? false,
        })) ?? [],
    };
  }

  return {
    ...EMPTY_FORM,
    currency_id: options?.defaultCurrencyId ?? "",
  };
}

export const PRICE_LIST_DETAIL_EMPTY = {
  product_id: "",
  unit_id: "",
  moq_qty: 1,
  price: 0,
  price_without_tax: 0,
  tax_profile_id: "",
  tax_rate: 0,
  tax_amt: 0,
  lead_time_days: 0,
  is_preferred: false,
} satisfies PriceListFormValues["pricelist_detail"][number];

/**
 * แปลง price list detail จาก form values เป็น payload สำหรับส่ง API พร้อม sequence number
 * @param d - ข้อมูล detail ใน form
 * @param index - ลำดับของรายการใน array
 * @returns payload object ของ detail
 */
export function mapDetailToPayload(
  d: PriceListFormValues["pricelist_detail"][number],
  index: number,
) {
  // Derive tax_amt + price (incl tax) from price_without_tax + tax_rate
  // Fields เหล่านี้ไม่ sync ระหว่างพิมพ์ใน cell — คำนวณซ้ำที่ submit
  const priceNoTax = Number(d.price_without_tax) || 0;
  const rate = Number(d.tax_rate) || 0;
  const taxAmt = Math.round(((priceNoTax * rate) / 100) * 100) / 100;
  const price = Math.round((priceNoTax + taxAmt) * 100) / 100;
  return {
    sequence_no: index + 1,
    product_id: d.product_id,
    price,
    price_without_tax: d.price_without_tax,
    unit_id: d.unit_id,
    tax_profile_id: d.tax_profile_id || "",
    tax_rate: d.tax_rate,
    tax_amt: taxAmt,
    lead_time_days: d.lead_time_days,
    moq_qty: d.moq_qty,
    is_preferred: d.is_preferred,
  };
}
