import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { httpClient } from "@/lib/http-client";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import type {
  PricelistExternalDto,
  PricelistExternalTaxProfileOption,
} from "../types/price-list-external";

const round2 = (n: number) => Math.round(n * 100) / 100;

/** tier id ที่ขึ้นต้นด้วย `tier-new-` = สร้างในเครื่อง ยังไม่มี row ฝั่ง server */
const isNewTierId = (id?: string | null) =>
  !id || String(id).startsWith("tier-new-");

/**
 * แปลงฟอร์มเป็น payload update — โครงเดียวกับ price list ปกติ (เรื่องเดียวกัน
 * ต่างแค่ vendor เป็นคนกรอก). Input `price` เป็นราคารวมภาษี (gross) → derive
 * price_without_tax + tax_amt กลับตอนส่ง
 *
 * MOQ tier (ที่กรอกใน expanded) ถูก flatten เป็น pricelist_detail row แยก — tier
 * = สินค้าเดิม/หน่วยเดิม/ภาษีเดิมของ parent แต่ MOQ/ราคา/lead เป็นของ tier เอง:
 * tier ที่มี id server → `update[]`, tier ใหม่ (id `tier-new-*`) → `add[]`
 * (ไม่มี id) เหมือน buildItemChanges ของ price list ภายใน
 * @param formData - ข้อมูลฟอร์มจาก vendor
 * @returns payload สำหรับ PATCH/submit
 */
const buildPayload = (formData: PricelistExternalDto) => {
  const update: Record<string, unknown>[] = [];
  const add: Record<string, unknown>[] = [];
  let seq = 0;

  const derive = (gross: number | string, rate: number) => {
    const price = Number(gross) || 0;
    const priceNoTax = round2(price / (1 + rate / 100));
    return { price, price_without_tax: priceNoTax, tax_amt: round2(price - priceNoTax) };
  };

  for (const d of formData.tb_pricelist_detail) {
    const rate = Number(d.tax_rate) || 0;

    // base row (ตัว item เอง) — มี id server เสมอ → update
    // unit_id/tax_profile_id เป็น uuid: ถ้าว่าง (item ยังไม่มี unit) ให้ "ละไว้"
    // ไม่ส่ง — ส่ง "" backend มองเป็น invalid uuid, ส่ง null มองเป็น expected string
    update.push({
      id: d.id,
      sequence_no: ++seq,
      product_id: d.product_id,
      ...(d.unit_id ? { unit_id: d.unit_id } : {}),
      ...derive(d.price, rate),
      ...(d.tax_profile_id ? { tax_profile_id: d.tax_profile_id } : {}),
      tax_rate: d.tax_rate,
      lead_time_days: d.lead_time_days,
      moq_qty: d.moq_qty,
      is_preferred: d.is_preferred,
    });

    // MOQ tiers → flatten เป็น detail row (ยืม product/unit/tax จาก parent)
    for (const t of d.moq_tiers ?? []) {
      const row = {
        sequence_no: ++seq,
        product_id: d.product_id,
        ...(d.unit_id ? { unit_id: d.unit_id } : {}),
        moq_qty: t.minimum_quantity,
        ...derive(t.price, rate),
        ...(d.tax_profile_id ? { tax_profile_id: d.tax_profile_id } : {}),
        tax_rate: d.tax_rate,
        lead_time_days: t.lead_time_days ?? 0,
        is_preferred: false,
      };
      if (isNewTierId(t.id)) add.push(row);
      else update.push({ id: t.id, ...row });
    }
  }

  return {
    vendor_id: formData.vendor?.id ?? "",
    name: formData.name,
    description: formData.description ?? "",
    status: formData.status,
    currency_id: formData.currency_id,
    effective_from_date: formData.effective_from_date,
    effective_to_date: formData.effective_to_date,
    note: formData.note ?? "",
    pricelist_detail: {
      ...(update.length ? { update } : {}),
      ...(add.length ? { add } : {}),
    },
  };
};

/**
 * Error class สำหรับข้อผิดพลาดจาก HTTP พร้อม status code
 */
export class HttpError extends Error {
  status: number;
  /**
   * สร้าง HttpError พร้อมข้อความและ status code
   * @param message - ข้อความ error
   * @param status - HTTP status code
   */
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * แปลง Response เป็น JSON หรือโยน HttpError หาก response ไม่ ok
 * @param res - Fetch Response
 * @param errorMessage - ข้อความ fallback เมื่อ parse error message ไม่ได้
 * @returns ข้อมูล JSON ที่ parse แล้ว
 */
async function handleResponse<T = unknown>(
  res: Response,
  errorMessage: string,
): Promise<T> {
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new HttpError(json.message || errorMessage, res.status);
  }
  return res.json();
}

/**
 * Hook ดึงข้อมูล price list สำหรับ vendor ภายนอกผ่าน url token
 * ใช้ POST /check เพื่อ validate token และคืน price list payload
 * Retry สูงสุด 3 ครั้ง ยกเว้น 401 (unauthorized) จะหยุดทันที
 * @param urlToken - token สำหรับยืนยันสิทธิ์ของ vendor
 * @returns React Query ของข้อมูล PricelistExternalDto
 * @example
 * const { data, isLoading } = usePriceListExternal(urlToken);
 */
export function usePriceListExternal(urlToken: string) {
  return useQuery({
    queryKey: [QUERY_KEYS.PRICE_LIST_EXTERNAL, urlToken],
    queryFn: async () => {
      const res = await httpClient.post(
        API_ENDPOINTS.PRICE_LIST_EXTERNAL_CHECK(urlToken),
      );
      const json = await handleResponse<{ data: PricelistExternalDto }>(
        res,
        "Failed to fetch price list",
      );
      return json.data;
    },
    enabled: !!urlToken,
    retry: (failureCount, error) => {
      if (error instanceof HttpError && error.status === 401) return false;
      return failureCount < 3;
    },
  });
}

/**
 * Hook ดึง tax profile options สำหรับ portal vendor ภายนอก (public — เรียก auth
 * lookup ไม่ได้) ผ่าน endpoint แยก GET /check-pricelist/{token}/tax-profiles
 * @param urlToken - token ของ vendor
 * @returns React Query ของ tax profile options
 * @example
 * const { data: taxProfiles } = useExternalTaxProfiles(urlToken);
 */
export function useExternalTaxProfiles(urlToken: string) {
  return useQuery({
    queryKey: [QUERY_KEYS.PRICE_LIST_EXTERNAL_TAX_PROFILES, urlToken],
    queryFn: async () => {
      const res = await httpClient.get(
        API_ENDPOINTS.PRICE_LIST_EXTERNAL_TAX_PROFILES(urlToken),
      );
      const json = await handleResponse<{
        data: PricelistExternalTaxProfileOption[];
      }>(res, "Failed to fetch tax profiles");
      // แสดงเฉพาะที่ยัง active ให้ vendor เลือก
      return json.data.filter((t) => t.is_active);
    },
    enabled: !!urlToken,
    retry: (failureCount, error) => {
      if (error instanceof HttpError && error.status === 401) return false;
      return failureCount < 3;
    },
  });
}

/**
 * Hook บันทึก price list ของ vendor ภายนอก (save draft)
 * แปลงฟอร์มเป็น payload products+moqs แล้ว PATCH และ invalidate cache
 * @param urlToken - token สำหรับยืนยันสิทธิ์ของ vendor
 * @returns Mutation สำหรับบันทึกข้อมูล
 * @example
 * const save = useUpdatePriceListExternal(urlToken);
 * save.mutate(formValues);
 */
export function useUpdatePriceListExternal(urlToken: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: PricelistExternalDto) => {
      const res = await httpClient.patch(
        API_ENDPOINTS.PRICE_LIST_EXTERNAL(urlToken),
        buildPayload(formData),
      );
      return handleResponse(res, "Failed to save changes");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.PRICE_LIST_EXTERNAL, urlToken],
      });
    },
  });
}

/**
 * Hook ส่ง (submit) price list ของ vendor ภายนอกให้ระบบ
 * POST ไปยัง endpoint /submit ซึ่งจะ finalize price list และ invalidate cache
 * @param urlToken - token สำหรับยืนยันสิทธิ์ของ vendor
 * @returns Mutation สำหรับ submit ข้อมูล
 * @example
 * const submit = useSubmitPriceListExternal(urlToken);
 * submit.mutate();
 */
export function useSubmitPriceListExternal(urlToken: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // submit ไม่มี payload — แค่ finalize (การเซฟข้อมูลจัดการโดย save draft ก่อนหน้า)
      const res = await httpClient.post(
        `${API_ENDPOINTS.PRICE_LIST_EXTERNAL(urlToken)}/submit`,
      );
      return handleResponse(res, "Failed to submit price list");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.PRICE_LIST_EXTERNAL, urlToken],
      });
    },
  });
}
