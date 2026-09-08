import { useApiMutation } from "@/hooks/use-api-mutation";
import { httpClient } from "@/lib/http-client";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";

export interface PoSendEmailPayload {
  profile_id: string;
  to: string[];
  cc: string[];
  subject: string;
  body: string;
  attach_pdf: boolean;
}

/**
 * ผลลัพธ์จริงของ `POST .../purchase-orders/{id}/send-email` (Task B5)
 *
 * **HTTP 200 ไม่ได้แปลว่าถึงผู้รับครบ** — ต้องอ่าน `rejected` เสมอ ถ้าไม่ว่างแปลว่า
 * บาง recipient ส่งไม่ถึง (ห้ามขึ้น toast สำเร็จเฉย ๆ) ดู `po-send-email-dialog.tsx`
 * ที่แปลผลลัพธ์นี้เป็น toast จริง
 */
export interface PoSendEmailResult {
  sent: boolean;
  rejected?: string[];
}

/**
 * ส่งใบสั่งซื้อให้ผู้ขายทางอีเมล พร้อมไฟล์ PDF (แนบได้ผ่าน `attach_pdf`)
 *
 * Endpoint นี้กำลังถูกสร้างคู่ขนานใน backend (Task B5) — ยังไม่มีจริงตอนเขียน hook
 * นี้ แต่สัญญา request/response ตกลงกันไว้แล้วตาม spec จึงเขียนฝั่ง client รอได้เลย
 *
 * สถานะ PO ที่ส่งไม่ได้ (draft/in_progress) backend ตอบ 422 · โปรไฟล์ที่หาไม่เจอ
 * หรือถูกปิด (enabled: false) ตอบ 400 — ทั้งสองกรณีเข้า error toast มาตรฐานผ่าน
 * `<ApiErrorToaster />` (ดู `errorMessage` ด้านล่าง) ชั้นการกันซ้ำจริงคือฝั่ง backend
 * ปุ่มในหน้า UI (`po-header.tsx`) เป็นแค่ชั้นที่สองที่ซ่อนปุ่มไปเลยเมื่อสถานะไม่เข้าเงื่อนไข
 *
 * ประวัติการส่งไปโผล่ใน activity sheet ของ PO (`components/share/activity-sheet.tsx`)
 * ซึ่งอ่านผ่าน `useActivityLogByRecord` คีย์ `QUERY_KEYS.ACTIVITY_LOGS_BY_RECORD` —
 * ไม่มีคีย์ `ACTIVITIES` แยกต่างหากในโปรเจกต์นี้ จึง invalidate คีย์นี้แทน
 *
 * @param id - PO id ที่จะส่ง
 * @returns UseMutationResult รับ payload ส่งอีเมล คืน `{ sent, rejected? }`
 * @example
 * ```ts
 * const sendEmail = usePoSendEmail(purchaseOrder.id);
 * sendEmail.mutate({ profile_id, to, cc, subject, body, attach_pdf: true });
 * ```
 */
export function usePoSendEmail(id: string) {
  return useApiMutation<PoSendEmailPayload, PoSendEmailResult>({
    mutationFn: (data, buCode) =>
      httpClient.post(
        API_ENDPOINTS.PURCHASE_ORDER_SEND_EMAIL(buCode, id),
        data,
      ),
    invalidateKeys: [QUERY_KEYS.ACTIVITY_LOGS_BY_RECORD],
    errorMessage: "Failed to send purchase order",
  });
}
