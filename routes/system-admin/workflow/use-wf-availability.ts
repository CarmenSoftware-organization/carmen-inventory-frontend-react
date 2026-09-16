import { useQuery } from "@tanstack/react-query";
import { httpClient } from "@/lib/http-client";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import { useBuCode } from "@/hooks/use-bu-code";

export interface WorkflowEditAvailability {
  readonly workflow_id: string;
  readonly workflow_type: string;
  readonly can_edit: boolean;
  readonly can_edit_stages: boolean;
  readonly can_delete: boolean;
  readonly blocked_reason: string | null;
  readonly documents: {
    readonly draft: number;
    readonly in_progress: number;
    readonly done: number;
    readonly total: number;
  };
}

/**
 * Hook ถามว่า workflow นี้แก้ได้ไหม พร้อมจำนวนเอกสารแยกตามสถานะ
 *
 * เอกสารที่เดินอยู่ล็อกแค่รายการ stage กับเส้นทางระหว่าง stage ไม่ใช่ทั้ง workflow — backend ปฏิเสธ
 * เฉพาะการแก้สองอย่างนั้น ส่วนชื่อ ผู้อนุมัติ และรายการสินค้าบันทึกได้ตลอด hook นี้ถามคำตอบเดียวกันมา
 * ตั้งแต่ก่อนผู้ใช้กดแก้ หน้าจอจะได้ปิดเฉพาะส่วนที่ล็อกจริง แทนที่จะไปเจอ error ตอนกดเซฟ
 * @param id - รหัส workflow
 * @returns query ที่คืนสถานะว่าแก้อะไรได้บ้างและจำนวนเอกสาร
 * @example
 * const { data } = useWorkflowEditAvailability(id);
 * const lockStages = data?.can_edit_stages === false;
 */
export function useWorkflowEditAvailability(id: string | undefined) {
  const buCode = useBuCode();

  return useQuery<WorkflowEditAvailability>({
    queryKey: [QUERY_KEYS.WORKFLOWS, buCode, id, "edit-availability"],
    queryFn: async () => {
      const res = await httpClient.get(
        `${API_ENDPOINTS.WORKFLOWS(buCode!)}/${id}/edit-availability`,
      );
      if (!res.ok)
        throw new Error("Failed to fetch workflow edit availability");
      const json = await res.json();
      return json.data;
    },
    enabled: !!buCode && !!id,
  });
}
