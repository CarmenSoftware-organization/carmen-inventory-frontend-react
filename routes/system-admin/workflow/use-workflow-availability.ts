import { useQuery } from "@tanstack/react-query";
import { httpClient } from "@/lib/http-client";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import { useBuCode } from "@/hooks/use-bu-code";

/** คำตอบของ endpoint edit-availability — โครงเดียวกับที่ backend ส่งมา */
export interface WorkflowEditAvailability {
  readonly workflow_id: string;
  readonly workflow_type: string;
  readonly can_edit: boolean;
  /** รหัสจาก error catalog ที่บอกว่าติดอะไรอยู่ (null เมื่อแก้ได้) */
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
 * `update` และ `delete` ของ backend จะปฏิเสธเมื่อมีเอกสาร in_progress อยู่ — hook นี้ถามคำตอบเดียวกัน
 * มาตั้งแต่ก่อนผู้ใช้กดแก้ หน้าจอจะได้บอกเหตุผลและแสดงว่าอะไรค้างอยู่ แทนที่จะไปเจอ error ตอนกดเซฟ
 * @param id - รหัส workflow
 * @returns query ที่คืนสถานะว่าแก้ได้ไหมและจำนวนเอกสาร
 * @example
 * const { data } = useWorkflowEditAvailability(id);
 * if (data?.can_edit === false) showBlockedDialog();
 */
export function useWorkflowEditAvailability(id: string | undefined) {
  const buCode = useBuCode();

  return useQuery<WorkflowEditAvailability>({
    queryKey: [QUERY_KEYS.WORKFLOWS, buCode, id, "edit-availability"],
    queryFn: async () => {
      const res = await httpClient.get(
        `${API_ENDPOINTS.WORKFLOWS(buCode!)}/${id}/edit-availability`,
      );
      if (!res.ok) throw new Error("Failed to fetch workflow edit availability");
      const json = await res.json();
      return json.data;
    },
    enabled: !!buCode && !!id,
  });
}
