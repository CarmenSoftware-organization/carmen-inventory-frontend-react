import { z } from "zod";
import type { TranslationFn } from "@/lib/i18n-schema";
import type {
  PurchaseRequest,
  PurchaseRequestTemplate,
  PurchaseRequestDetailPayload,
  WorkflowStageDetail,
  ApproveDetail,
  PurchaseApproveDetail,
} from "@/types/purchase-request";
import { STAGE_ROLE } from "@/types/stage-role";
import { PR_ITEM_STAGE_STATUS } from "@/types/purchase-request";
import { isoToDateInput } from "@/lib/date-utils";
import { round2 } from "@/lib/currency-utils";

/**
 * สร้าง zod schema สำหรับ detail แต่ละรายการของใบขอซื้อ
 * @param tv - ฟังก์ชันแปลข้อความ validation
 * @param tf - ฟังก์ชันแปลชื่อ field
 * @returns zod object schema ของ PR detail
 */
function createDetailSchema(tv: TranslationFn, tf: TranslationFn) {
  return z.object({
    id: z.string().optional(),
    doc_version: z.coerce.number().optional(),
    product_id: z
      .string()
      .nullable()
      .refine((v) => !!v, tv("required", { field: tf("product") })),
    product_code: z.string(),
    product_name: z.string(),
    product_local_name: z.string(),
    description: z.string(),
    pricelist_price: z.coerce
      .number()
      .min(0, tv("minZero", { field: tf("unitPrice") })),
    vendor_id: z.string().nullable(),
    vendor_name: z.string(),
    stage_status: z.string().optional(),
    current_stage_status: z.string().optional(),
    _initial_stage_status: z.string().optional(),
    stage_message: z.string().optional(),
    des_stage: z.string().optional(),
    location_id: z.string().nullable(),
    location_code: z.string(),
    location_name: z.string(),
    location_type: z.string(),
    delivery_point_name: z.string(),
    requested_qty: z.coerce
      .number()
      .min(1, tv("minNumber", { field: tf("qty"), min: 1 })),
    requested_unit_id: z.string().nullable(),
    requested_unit_name: z.string(),
    inventory_unit_id: z.string().nullable(),
    inventory_unit_name: z.string(),
    foc_qty: z.coerce.number().min(0),
    foc_unit_id: z.string().nullable(),
    foc_unit_name: z.string(),
    approved_qty: z.coerce.number().min(0),
    approved_unit_id: z.string().nullable(),
    approved_unit_name: z.string(),
    currency_id: z.string().nullable(),
    currency_code: z.string().nullable(),
    currency_decimal_places: z.coerce.number().optional(),
    exchange_rate: z.coerce.number(),
    delivery_point_id: z.string().nullable(),
    delivery_date: z.string(),
    pricelist_detail_id: z.string().nullable(),
    pricelist_no: z.string().nullable(),
    pricelist_type: z.string().nullable(),
    tax_profile_id: z.string().nullable().optional(),
    tax_profile_name: z.string().optional(),
    tax_rate: z.coerce.number().optional(),
    tax_amount: z.coerce.number().optional(),
    is_tax_adjustment: z.boolean().optional(),
    discount_rate: z.coerce.number().optional(),
    discount_amount: z.coerce.number().optional(),
    is_discount_adjustment: z.boolean().optional(),
    net_amount: z.coerce.number().optional(),
    total_price: z.coerce.number().optional(),
    comment: z.string(),
    // ประวัติ workflow ระดับรายการ (display-only passthrough, ไม่ส่งกลับ API)
    history: z
      .array(
        z.object({
          at: z.string(),
          seq: z.coerce.number(),
          name: z.string(),
          user: z.object({ id: z.string(), name: z.string() }),
          status: z.string(),
          message: z.string().nullish(),
        }),
      )
      .optional(),
  });
}

/**
 * สร้าง zod schema หลักของฟอร์มใบขอซื้อ
 * @param tv - ฟังก์ชันแปลข้อความ validation
 * @param tf - ฟังก์ชันแปลชื่อ field
 * @returns zod object schema ของ PR
 */
export function createPrSchema(
  tv: TranslationFn,
  tf: TranslationFn,
  role?: string,
) {
  const isPurchase = role === STAGE_ROLE.PURCHASE;

  return z.object({
    doc_version: z.coerce.number().optional(),
    pr_date: z.string().min(1, tv("required", { field: tf("prDate") })),
    description: z.string(),
    workflow_id: z.string().min(1, tv("required", { field: tf("workflow") })),
    requestor_id: z.string(),
    department_id: z
      .string()
      .min(1, tv("required", { field: tf("department") })),
    items: z.array(createDetailSchema(tv, tf)).superRefine((items, ctx) => {
      if (!isPurchase) return;
      items.forEach((item, i) => {
        // แถวที่ถูกทำเครื่องหมาย reject หรือ send back (review) ไม่ต้องกรอก
        // vendor/price/currency/tax — validate เฉพาะแถวที่กำลังจะอนุมัติ
        const status = item.current_stage_status ?? "";
        if (
          status === PR_ITEM_STAGE_STATUS.REJECT ||
          status === PR_ITEM_STAGE_STATUS.REJECTED ||
          status === PR_ITEM_STAGE_STATUS.REVIEW
        ) {
          return;
        }
        if (!item.vendor_id) {
          ctx.addIssue({
            code: "custom",
            path: [i, "vendor_id"],
            message: tv("required", { field: tf("vendor") }),
          });
        }
        if (!item.pricelist_price || item.pricelist_price <= 0) {
          ctx.addIssue({
            code: "custom",
            path: [i, "pricelist_price"],
            message: tv("minNumber", { field: tf("unitPrice"), min: 0 }),
          });
        }
        if (!item.currency_id) {
          ctx.addIssue({
            code: "custom",
            path: [i, "currency_id"],
            message: tv("required", { field: tf("currency") }),
          });
        }
        if (!item.tax_profile_id) {
          ctx.addIssue({
            code: "custom",
            path: [i, "tax_profile_id"],
            message: tv("required", { field: tf("taxProfile") }),
          });
        }
      });
    }),
  });
}

export type PrFormValues = z.infer<ReturnType<typeof createPrSchema>>;

// --- Defaults ---

export const PR_ITEM = {
  product_id: null,
  product_code: "",
  product_name: "",
  product_local_name: "",
  description: "",
  pricelist_price: 0,
  vendor_id: null,
  vendor_name: "",
  stage_status: "",
  current_stage_status: "",
  _initial_stage_status: "",
  stage_message: "",
  des_stage: "",
  location_id: null,
  location_code: "",
  location_name: "",
  location_type: "",
  delivery_point_name: "",
  requested_qty: 0,
  requested_unit_id: null,
  requested_unit_name: "",
  inventory_unit_id: null,
  inventory_unit_name: "",
  foc_qty: 0,
  foc_unit_id: null,
  foc_unit_name: "",
  approved_qty: 0,
  approved_unit_id: null,
  approved_unit_name: "",
  currency_id: null,
  currency_code: null,
  currency_decimal_places: 2,
  exchange_rate: 1,
  delivery_point_id: null,
  delivery_date: "",
  pricelist_detail_id: null,
  pricelist_no: null,
  pricelist_type: null,
  tax_profile_id: null,
  tax_profile_name: "",
  tax_rate: 0,
  tax_amount: 0,
  is_tax_adjustment: false,
  discount_rate: 0,
  discount_amount: 0,
  is_discount_adjustment: false,
  net_amount: 0,
  total_price: 0,
  comment: "",
} as const;

export const EMPTY_FORM: PrFormValues = {
  pr_date: "",
  description: "",
  workflow_id: "",
  requestor_id: "",
  department_id: "",
  items: [],
};

// --- Helpers ---

/**
 * คืนค่าเริ่มต้นของฟอร์ม PR จากข้อมูล PR เดิมหรือจากเทมเพลต
 * หากส่ง purchaseRequest จะ map จาก detail ที่มีอยู่ (mode edit/view)
 * หากส่ง template จะใช้ข้อมูลจาก template_detail แทน และหากไม่ส่งทั้งคู่จะคืน EMPTY_FORM
 * @param purchaseRequest - ข้อมูล PR ที่มีอยู่ (ใช้ในโหมดแก้ไข/ดู)
 * @param template - เทมเพลต PR (ใช้ในโหมดสร้างจากเทมเพลต)
 * @returns ค่าเริ่มต้นของฟอร์ม PR ชนิด PrFormValues พร้อมใช้กับ useForm
 * @example
 * const form = useForm<PrFormValues>({
 *   resolver: zodResolver(schema) as Resolver<PrFormValues>,
 *   defaultValues: getDefaultValues(purchaseRequest),
 * });
 */
export function getDefaultValues(
  purchaseRequest?: PurchaseRequest,
  template?: PurchaseRequestTemplate,
): PrFormValues {
  if (purchaseRequest) {
    return {
      doc_version: purchaseRequest.doc_version,
      pr_date: isoToDateInput(purchaseRequest.pr_date),
      description: purchaseRequest.description ?? "",
      workflow_id: purchaseRequest.workflow_id ?? "",
      requestor_id: purchaseRequest.requestor_id ?? "",
      department_id: purchaseRequest.department_id ?? "",
      items:
        purchaseRequest.purchase_request_detail?.map((d) => ({
          id: d.id,
          doc_version: d.doc_version,
          product_id: d.product_id,
          product_code: d.product_code ?? "",
          product_name: d.product_name,
          product_local_name: d.product_local_name ?? "",
          description: d.description ?? "",
          pricelist_price: d.pricelist_price,
          vendor_id: d.vendor_id ?? null,
          vendor_name: d.vendor_name ?? "",
          stage_status: d.state_status ?? "",
          current_stage_status: d.current_stage_status || "pending",
          _initial_stage_status: d.current_stage_status || "pending",
          stage_message: d.state_message ?? "",
          location_id: d.location_id ?? null,
          location_code: d.location_code ?? "",
          location_name: d.location_name ?? "",
          location_type: d.location_type ?? "",
          delivery_point_name: d.delivery_point_name ?? "",
          requested_qty: d.requested_qty,
          requested_unit_id: d.requested_unit_id ?? null,
          requested_unit_name: d.requested_unit_name ?? "",
          inventory_unit_id: d.inventory_unit_id ?? null,
          inventory_unit_name: d.inventory_unit_name ?? "",
          foc_qty: d.foc_qty ?? 0,
          foc_unit_id: d.foc_unit_id ?? null,
          foc_unit_name: d.foc_unit_name ?? "",
          approved_qty: d.approved_qty ?? 0,
          approved_unit_id: d.approved_unit_id ?? null,
          approved_unit_name: d.approved_unit_name ?? "",
          currency_id: d.currency_id ?? null,
          currency_code: d.currency_code ?? null,
          currency_decimal_places: d.currency_decimal_places ?? 2,
          exchange_rate: d.exchange_rate ?? 1,
          delivery_point_id: d.delivery_point_id ?? null,
          delivery_date: d.delivery_date ?? "",
          pricelist_detail_id: d.pricelist_detail_id ?? null,
          pricelist_no: d.pricelist_no ?? null,
          pricelist_type: d.pricelist_type ?? "",
          tax_profile_id: d.tax_profile_id ?? null,
          tax_profile_name: d.tax_profile_name ?? "",
          tax_rate: d.tax_rate ?? 0,
          tax_amount: d.tax_amount ?? 0,
          is_tax_adjustment: d.is_tax_adjustment ?? false,
          discount_rate: d.discount_rate ?? 0,
          discount_amount: d.discount_amount ?? 0,
          is_discount_adjustment: d.is_discount_adjustment ?? false,
          net_amount: d.net_amount ?? 0,
          total_price: d.total_price ?? 0,
          comment: d.comment ?? "",
          history: d.history,
        })) ?? [],
    };
  }
  if (template) {
    return {
      ...EMPTY_FORM,
      description: template.description ?? "",
      workflow_id: template.workflow_id ?? "",
      department_id: template.department_id ?? "",
      items:
        template.purchase_request_template_detail?.map((d) => ({
          product_id: d.product_id,
          product_code: d.product_code ?? "",
          product_name: d.product_name,
          product_local_name: d.product_local_name ?? "",
          description: d.description ?? "",
          pricelist_price: 0,
          vendor_id: null,
          vendor_name: "",
          stage_status: "",
          current_stage_status: "",
          stage_message: "",
          location_id: d.location_id ?? null,
          location_code: d.location_code ?? "",
          location_name: d.location_name ?? "",
          location_type: d.location_type ?? "",
          requested_qty: d.requested_qty,
          requested_unit_id: d.requested_unit_id ?? null,
          requested_unit_name: d.requested_unit_name ?? "",
          inventory_unit_id: d.inventory_unit_id ?? null,
          inventory_unit_name: d.inventory_unit_name ?? "",
          foc_qty: d.foc_qty ?? 0,
          foc_unit_id: d.foc_unit_id ?? null,
          foc_unit_name: d.foc_unit_name ?? "",
          approved_qty: 0,
          approved_unit_id: null,
          approved_unit_name: "",
          currency_id: d.currency_id ?? null,
          currency_code: null,
          currency_decimal_places: 2,
          exchange_rate: 1,
          delivery_point_id: d.delivery_point_id ?? null,
          delivery_point_name: d.delivery_point_name ?? "",
          delivery_date: "",
          pricelist_detail_id: null,
          pricelist_no: null,
          pricelist_type: "",
          tax_profile_id: d.tax_profile_id ?? null,
          tax_profile_name: d.tax_profile_name ?? "",
          tax_rate: d.tax_rate ?? 0,
          tax_amount: d.tax_amount ?? 0,
          is_tax_adjustment: d.is_tax_adjustment ?? false,
          discount_rate: d.discount_rate ?? 0,
          discount_amount: d.discount_amount ?? 0,
          is_discount_adjustment: d.is_discount_adjustment ?? false,
          net_amount: 0,
          total_price: 0,
          comment: d.comment ?? "",
        })) ?? [],
    };
  }
  return EMPTY_FORM;
}

const STATUS_DENORMALIZE: Record<string, string> = {
  approved: "approve",
  rejected: "reject",
  pending: "pending",
};

/**
 * แปลงสถานะ stage จากรูปแบบภายใน (approved/rejected) เป็นรูปแบบที่ backend รับ (approve/reject)
 * ใช้ตาราง STATUS_DENORMALIZE ในการแมปค่า หากไม่พบจะคืนค่าเดิม
 * เรียกใช้ก่อนส่ง payload ไปยัง API เพื่อให้ตรงกับ contract ของฝั่ง server
 * @param status - สถานะ stage ภายในของ frontend เช่น "approved", "rejected", "pending"
 * @returns สถานะ stage ที่ backend ต้องการ เช่น "approve", "reject", "pending"
 * @example
 * denormalizeStageStatus("approved"); // => "approve"
 * denormalizeStageStatus("rejected"); // => "reject"
 * denormalizeStageStatus("review");   // => "review"
 */
export function denormalizeStageStatus(status: string): string {
  return STATUS_DENORMALIZE[status] ?? status;
}

/**
 * ตัดสิน stage_status ราย item สำหรับ payload ของ action approve/purchase-approve
 * ใช้ค่าที่ผู้ใช้ตัดสินใจ (`stage_status` ของ session นี้) ก่อน แล้ว fallback ไป
 * `current_stage_status` ที่โหลดจาก DB — คง reject/review ไว้เสมอ ไม่งั้น item ที่
 * ถูก reject (แต่ stage_status ว่างเพราะโหลดมา) จะถูกส่งเป็น approve ผิดพลาด
 * รายการอื่น ๆ (pending/submit/approve) ถือว่าอนุมัติเมื่อกดปุ่ม Approve
 * @param item - item จากฟอร์ม PR
 * @returns stage_status ที่ backend รับ: "reject" | "review" | "approve"
 */
function resolveApproveStageStatus(
  item: PrFormValues["items"][number],
): string {
  const decided = denormalizeStageStatus(
    item.stage_status || item.current_stage_status || "",
  );
  if (
    decided === PR_ITEM_STAGE_STATUS.REJECT ||
    decided === PR_ITEM_STAGE_STATUS.REVIEW
  ) {
    return decided;
  }
  return PR_ITEM_STAGE_STATUS.APPROVE;
}

/**
 * ตรวจสอบว่ารายการทั้งหมดของ PR กรอกข้อมูลครบถ้วนหรือยัง
 * ใช้ร่วมกันระหว่างปุ่ม Save และ Submit เพื่อให้เงื่อนไขตรงกันเสมอ
 * @param items - รายการ items ของ PR
 * @returns true เมื่อมี item อย่างน้อย 1 รายการ และทุก item มี product, location, qty, unit, currency, delivery point และ delivery date
 */
export function isAllItemsComplete(
  items: PrFormValues["items"],
): boolean {
  return (
    items.length > 0 &&
    items.every(
      (item) =>
        !!item.product_id &&
        !!item.location_id &&
        item.requested_qty > 0 &&
        !!item.requested_unit_id &&
        !!item.currency_id &&
        !!item.delivery_point_id &&
        !!item.delivery_date,
    )
  );
}

export interface PrItemAmountInput {
  readonly price: number;
  readonly qty: number;
  readonly discRate: number;
  readonly isDiscAdj: boolean;
  readonly discAmt: number;
  readonly taxRate: number;
  readonly isTaxAdj: boolean;
  readonly taxAmt: number;
}

/**
 * คำนวณยอดของ PR item: subtotal → discount → net → tax → total (round2 ทุกชั้น)
 * ใช้ร่วมกันทั้ง pr-item-expand (sync ตอน edit) และ auto-allocate (ตอนดึงราคา)
 * เพื่อให้สูตรเดียวกัน ไม่ drift
 */
export function computePrItemAmounts(input: PrItemAmountInput) {
  const subtotal = round2(input.price * input.qty);
  const discountAmount = input.isDiscAdj
    ? input.discAmt
    : round2((subtotal * input.discRate) / 100);
  const netAmount = round2(subtotal - discountAmount);
  const taxAmount = input.isTaxAdj
    ? input.taxAmt
    : round2((netAmount * input.taxRate) / 100);
  const totalPrice = round2(netAmount + taxAmount);
  return { subtotal, discountAmount, netAmount, taxAmount, totalPrice };
}

/**
 * แปลง item ของฟอร์มเป็น payload ที่ส่งไปยัง API ของ PR detail
 * จัดการการแปลง empty string เป็น null สำหรับ foreign key ต่าง ๆ และ normalize stage status
 * ใช้ร่วมกับ buildItemChanges เพื่อสร้าง payload add/update/remove ก่อนเรียก mutation
 * @param item - ค่า item จากฟอร์ม (PrFormValues["items"][number])
 * @returns payload ของ PR detail ชนิด PurchaseRequestDetailPayload สำหรับส่งไป backend
 * @example
 * const changes = buildItemChanges(
 *   values.items,
 *   defaultValues.items,
 *   form.formState.dirtyFields.items,
 *   mapItemToPayload,
 * );
 * await updatePR.mutateAsync({ id: prId, purchase_request_detail: changes });
 */
/**
 * สร้าง payload สำหรับ workflow stage action แบบ submit/reject
 * @param items - รายการ items ของฟอร์ม PR (เฉพาะรายการที่มี id จะถูกรวม)
 * @param defaultMessage - ข้อความ fallback เมื่อ item ไม่มี stage_message
 * @returns รายการ WorkflowStageDetail สำหรับส่งไป API
 */
export function prepareStageDetails(
  items: PrFormValues["items"],
  defaultMessage: string = "",
): WorkflowStageDetail[] {
  return items
    .filter((item) => item.id)
    .map((item) => ({
      id: item.id!,
      stage_status: "submit",
      stage_message: item.stage_message || defaultMessage,
    }));
}

/**
 * สร้าง payload สำหรับ workflow action approve/reject ของ PR (stage role approve)
 * รวมข้อมูล qty, pricing, delivery, tax, discount ของแต่ละ item
 * @param items - รายการ items ของฟอร์ม PR (เฉพาะรายการที่มี id)
 * @param purchaseRequestId - id ของ PR สำหรับฝังใน payload
 * @returns รายการ ApproveDetail สำหรับส่งไป API
 */
export function prepareApproveDetails(
  items: PrFormValues["items"],
  purchaseRequestId?: string,
): ApproveDetail[] {
  return items
    .filter((item) => item.id)
    .map((item) => ({
      id: item.id!,
      purchase_request_id: purchaseRequestId,
      stage_status: resolveApproveStageStatus(item),
      stage_message: item.stage_message || "",
      approved_qty: Number(item.approved_qty),
      approved_unit_id: item.approved_unit_id || item.requested_unit_id,
      vendor_id: item.vendor_id || undefined,
      // omit null string FK ทั้งหมด — backend zod รับเป็น string (ห้าม null);
      // item ที่ถูก reject มักยังไม่มี tax/location/pricelist → ต้องไม่ส่ง null
      pricelist_detail_id: item.pricelist_detail_id || undefined,
      pricelist_price: Number(item.pricelist_price),
      pricelist_no: item.pricelist_no,
      pricelist_type: item.pricelist_type || null,
      currency_id: item.currency_id || undefined,
      delivery_point_id: item.delivery_point_id || undefined,
      delivery_date: item.delivery_date || undefined,
      location_id: item.location_id || undefined,
      tax_profile_id: item.tax_profile_id || undefined,
      tax_rate: Number(item.tax_rate ?? 0),
      tax_amount: Number(item.tax_amount ?? 0),
      is_tax_adjustment: item.is_tax_adjustment ?? false,
      discount_rate: Number(item.discount_rate ?? 0),
      discount_amount: Number(item.discount_amount ?? 0),
      is_discount_adjustment: item.is_discount_adjustment ?? false,
      net_amount: Number(item.net_amount ?? 0),
      total_price: Number(item.total_price ?? 0),
      foc_qty: Number(item.foc_qty ?? 0),
      foc_unit_id: item.foc_unit_id || undefined,
      comment: item.comment || "",
    }));
}

/**
 * สร้าง payload สำหรับ workflow action ของ PR (stage role purchase)
 * คำนวณ subtotal/discount/tax/total จากราคาและจำนวนที่อนุมัติ
 * @param items - รายการ items ของฟอร์ม PR (เฉพาะรายการที่มี id)
 * @returns รายการ PurchaseApproveDetail สำหรับส่งไป API
 */
export function preparePurchaseDetails(
  items: PrFormValues["items"],
): PurchaseApproveDetail[] {
  return items
    .filter((item) => item.id)
    .map((item) => {
      const price = Number(item.pricelist_price ?? 0);
      const approvedQty = Number(item.approved_qty ?? 0);
      const discRate = Number(item.discount_rate ?? 0);
      const discAmt = Number(item.discount_amount ?? 0);
      const isDiscAdj = item.is_discount_adjustment ?? false;
      const taxRate = Number(item.tax_rate ?? 0);
      const taxAmt = Number(item.tax_amount ?? 0);
      const isTaxAdj = item.is_tax_adjustment ?? false;
      const exchangeRate = Number(item.exchange_rate ?? 1);

      const subTotal = round2(price * approvedQty);
      const discount = isDiscAdj
        ? discAmt
        : round2((subTotal * discRate) / 100);
      const net = round2(subTotal - discount);
      const tax = isTaxAdj ? taxAmt : round2((net * taxRate) / 100);
      const total = round2(net + tax);

      return {
        id: item.id!,
        stage_status: resolveApproveStageStatus(item),
        stage_message: item.stage_message || null,
        is_tax_adjustment: isTaxAdj,
        description: item.description || null,
        approved_qty: approvedQty,
        approved_unit_id: item.approved_unit_id || item.requested_unit_id,
        approved_base_qty: approvedQty,
        approved_unit_conversion_factor: 1,
        vendor_id: item.vendor_id || null,
        currency_id: item.currency_id || null,
        exchange_rate: exchangeRate,
        exchange_rate_date: null,
        tax_profile_id: item.tax_profile_id || null,
        tax_profile_name: null,
        tax_rate: taxRate,
        tax_amount: tax,
        base_tax_amount: round2(tax * exchangeRate),
        total_amount: total,
        discount_rate: discRate,
        discount_amount: discount,
        is_discount_adjustment: isDiscAdj,
        base_discount_amount: round2(discount * exchangeRate),
        total_price: total,
        sub_total_price: subTotal,
        net_amount: net,
        base_sub_total_price: round2(subTotal * exchangeRate),
        base_total_price: round2(total * exchangeRate),
        base_net_amount: round2(net * exchangeRate),
        base_price: round2(price * exchangeRate),
        foc_qty: Number(item.foc_qty ?? 0),
        foc_unit_id: item.foc_unit_id || null,
        foc_unit_conversion_rate: 1,
        foc_base_qty: Number(item.foc_qty ?? 0),
        pricelist_detail_id: item.pricelist_detail_id || null,
        pricelist_no: item.pricelist_no || null,
        pricelist_price: price,
        pricelist_type: item.pricelist_type || null,
        current_stage_status: item.current_stage_status || "pending",
      };
    });
}

export function mapItemToPayload(
  item: PrFormValues["items"][number],
): PurchaseRequestDetailPayload {
  return {
    ...(item.doc_version != null ? { doc_version: item.doc_version } : {}),
    product_id: item.product_id || null,
    description: item.description,
    requested_qty: item.requested_qty,
    requested_unit_id: item.requested_unit_id || null,
    pricelist_price: item.pricelist_price,
    vendor_id: item.vendor_id || null,
    pricelist_detail_id: item.pricelist_detail_id || null,
    current_stage_status: denormalizeStageStatus(item.current_stage_status || "pending"),
    location_id: item.location_id || null,
    delivery_point_id: item.delivery_point_id || null,
    delivery_date: item.delivery_date,
    currency_id: item.currency_id || null,
    foc_qty: item.foc_qty ?? 0,
    foc_unit_id: item.foc_unit_id || null,
    approved_qty: item.approved_qty ?? 0,
    approved_unit_id: item.approved_unit_id || null,
    tax_profile_id: item.tax_profile_id || null,
    tax_rate: item.tax_rate ?? 0,
    tax_amount: item.tax_amount ?? 0,
    is_tax_adjustment: item.is_tax_adjustment ?? false,
    discount_rate: item.discount_rate ?? 0,
    discount_amount: item.discount_amount ?? 0,
    is_discount_adjustment: item.is_discount_adjustment ?? false,
    net_amount: item.net_amount ?? 0,
    total_price: item.total_price ?? 0,
    comment: item.comment ?? "",
  };
}
