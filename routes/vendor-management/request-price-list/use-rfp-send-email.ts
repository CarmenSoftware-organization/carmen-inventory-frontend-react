import { useApiMutation } from "@/hooks/use-api-mutation";
import { httpClient } from "@/lib/http-client";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";

export interface RfpSendEmailPayload {
  profile_id: string;
  to: string[];
  cc: string[];
  subject: string;
  body: string;
  vendor_id?: string;
}

/**
 * ผลลัพธ์จริงของ `POST .../request-for-pricings/{id}/send-email`
 *
 * **HTTP 200 ไม่ได้แปลว่าถึงผู้รับครบ** — ต้องอ่าน `rejected` เสมอ เหมือนของใบสั่งซื้อ
 */
export interface RfpSendEmailResult {
  sent: boolean;
  rejected?: string[];
}

/** gateway ห่อผลลัพธ์ด้วย `StdResponse` และ `useApiMutation` คืน body ทั้งก้อน */
export interface RfpSendEmailResponse {
  data: RfpSendEmailResult | null;
  status: number;
  success: boolean;
  message: string;
  timestamp: string;
}

/**
 * ส่งคำขอรายการราคาให้ผู้ขายหนึ่งรายทางอีเมล
 *
 * ไม่มีตัวเลือกแนบไฟล์ — สิ่งที่ผู้ขายต้องได้คือลิงก์กรอกราคา ซึ่ง **หน้าจอเป็นคนประกอบ
 * ลงในเนื้อความ** เพราะฝั่ง client เท่านั้นที่รู้ origin ของพอร์ทัล (backend ไม่มี
 * base URL ของ frontend ให้ใช้ ต่างจากเส้นทางอีเมลของ platform)
 *
 * โปรไฟล์ที่หาไม่เจอหรือถูกปิดตอบ 400 · คำขอราคาที่ไม่มีอยู่ตอบ 404 — ทั้งคู่เข้า
 * error toast มาตรฐานผ่าน `<ApiErrorToaster />`
 *
 * @param id - id ของคำขอรายการราคา
 * @returns UseMutationResult รับ payload ส่งอีเมล คืน `{ sent, rejected? }`
 */
export function useRfpSendEmail(id: string) {
  return useApiMutation<RfpSendEmailPayload, RfpSendEmailResponse>({
    mutationFn: (data, buCode) =>
      httpClient.post(
        API_ENDPOINTS.REQUEST_PRICE_LIST_SEND_EMAIL(buCode, id),
        data,
      ),
    invalidateKeys: [QUERY_KEYS.ACTIVITY_LOGS_BY_RECORD],
    errorMessage: "Failed to send request for pricing",
  });
}
