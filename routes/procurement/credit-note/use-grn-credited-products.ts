import { useQuery } from "@tanstack/react-query";
import { useBuCode } from "@/hooks/use-bu-code";
import { httpClient } from "@/lib/http-client";
import { ApiError } from "@/lib/api-error";
import { QUERY_KEYS } from "@/constant/query-keys";
import { API_ENDPOINTS } from "@/constant/api-endpoints";

/** รูปที่ `GET good-received-notes/:id/ref` คืน — เอาเฉพาะส่วนที่ใช้ */
interface GrnRefResponse {
  goods_receive_note_details: {
    product_id?: string | null;
    cn: { id: string; cn_no?: string | null } | null;
  }[];
}

/**
 * สินค้าบนใบรับที่ถูกลดหนี้ไปแล้ว → เลขใบลดหนี้ที่ถือมันอยู่
 *
 * สินค้าหนึ่งตัวบนใบรับลดหนี้ได้ครั้งเดียว (หลังบ้านบังคับด้วย CREDIT_NOTE_LINE_ALREADY_CREDITED)
 * dialog เลือกรายการจึงต้องล็อกตัวที่ใบอื่นถือไว้แล้วตั้งแต่ก่อนกด ไม่ใช่ปล่อยให้ไปเจอ 422 ตอนบันทึก
 * (e2e CN.3) — จับคู่ด้วยสินค้าแบบเดียวกับหลังบ้าน ไม่ใช่สินค้า+คลัง
 *
 * ดึงใหม่ทุกครั้งที่เปิด dialog (staleTime 0) เพราะใบลดหนี้ที่เพิ่งสร้างเมื่อครู่ต้องนับด้วย
 * ถ้าดึงไม่ได้ก็ไม่ล็อกอะไร — หลังบ้านยังกันอยู่ และตอนนี้ตอบเป็นข้อความที่บอกเหตุจริงแล้ว
 *
 * @param grnId - ใบรับที่ใบลดหนี้อ้างถึง
 * @param enabled - ดึงเฉพาะตอน dialog เปิด
 * @returns Map จาก product_id ไปเป็นเลขใบลดหนี้ (สตริงว่างเมื่อใบนั้นไม่มีเลข)
 */
export function useGrnCreditedProducts(
  grnId: string | undefined,
  enabled: boolean,
) {
  const buCode = useBuCode();

  return useQuery<Map<string, string>>({
    queryKey: [QUERY_KEYS.GOODS_RECEIVE_NOTE_REF, buCode, grnId],
    queryFn: async () => {
      const res = await httpClient.get(
        API_ENDPOINTS.GOODS_RECEIVE_NOTE_REF(buCode!, grnId!),
      );
      if (!res.ok)
        throw await ApiError.from(res, "Failed to fetch goods receive note references");
      const json = await res.json();
      const data = (json.data ?? json) as GrnRefResponse;
      const credited = new Map<string, string>();
      for (const line of data.goods_receive_note_details ?? []) {
        if (line.product_id && line.cn) {
          credited.set(line.product_id, line.cn.cn_no ?? "");
        }
      }
      return credited;
    },
    staleTime: 0,
    enabled: enabled && !!buCode && !!grnId,
  });
}
