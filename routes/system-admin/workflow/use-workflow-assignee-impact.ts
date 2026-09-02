import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { httpClient } from "@/lib/http-client";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import { useBuCode } from "@/hooks/use-bu-code";
import { ApiError } from "@/lib/api-error";

/** stage หนึ่งที่ผู้ใช้ถูก assign ไว้ พร้อมบริบทว่าถือคนเดียวไหมและมีเอกสารรออยู่เท่าไร */
export interface WorkflowAssigneeStage {
  readonly workflow_id: string;
  readonly workflow_name: string;
  readonly workflow_type: string;
  readonly stage: string;
  readonly assignee_count: number;
  /** true = stage นี้จะเหลือคนทำ action 0 คนถ้าผู้ใช้คนนี้หายไป */
  readonly is_sole_assignee: boolean;
  readonly in_progress_documents: number;
}

/** คำตอบของ endpoint assignees — โครงเดียวกับที่ backend ส่งมา */
export interface WorkflowAssigneeImpact {
  readonly user_id: string;
  readonly is_assigned: boolean;
  readonly sole_assignee_count: number;
  readonly stages: WorkflowAssigneeStage[];
}

/** ผู้รับช่วงหนึ่งราย: ใครเข้ามาแทนที่ stage ไหนของ workflow ไหน */
export interface WorkflowAssigneeReplacement {
  readonly workflow_id: string;
  readonly stage: string;
  readonly replacement_user_id: string;
}

/**
 * Hook ถามว่าผู้ใช้คนนี้ถูก assign ไว้ที่ stage ไหนบ้าง และ stage ไหนที่เขาถือคนเดียว
 *
 * เรียกก่อนลบผู้ใช้หรือเอาเขาออกจากแผนก — stage ที่เขาถือคนเดียวจะเหลือคนอนุมัติ 0 คนเมื่อเขาหายไป
 * และเอกสารที่รออยู่จะหยุดเดินโดยไม่มี error แจ้งใคร
 *
 * `enabled` เปิดเมื่อส่ง userId มาเท่านั้น หน้าจอจึงถามได้เฉพาะตอนกำลังจะลบจริง ไม่ยิงทุกแถวในตาราง
 * @param userId - รหัสผู้ใช้ที่จะตรวจ (undefined = ไม่ถาม)
 * @returns query ที่คืนรายการ stage ที่ผู้ใช้ถืออยู่
 * @example
 * const { data } = useWorkflowAssigneeImpact(deleteTarget?.user_id);
 * if (data?.sole_assignee_count) showHandoverDialog();
 */
export function useWorkflowAssigneeImpact(userId: string | undefined) {
  const buCode = useBuCode();

  return useQuery<WorkflowAssigneeImpact>({
    queryKey: [QUERY_KEYS.WORKFLOWS, buCode, "assignees", userId],
    queryFn: async () => {
      const res = await httpClient.get(
        `${API_ENDPOINTS.WORKFLOWS(buCode!)}/assignees/${userId}`,
      );
      if (!res.ok)
        throw await ApiError.from(res, "Failed to fetch workflow assignments");
      const json = await res.json();
      return json.data;
    },
    enabled: !!buCode && !!userId,
  });
}

/**
 * Hook ส่งมอบ stage ที่ผู้ใช้ถืออยู่ให้ผู้รับช่วงที่เลือกไว้
 *
 * ส่งทุกรายการไปในคำสั่งเดียว — ถ้ายิงทีละ workflow การส่งมอบที่สำเร็จครึ่งเดียวจะทิ้ง stage บางตัว
 * ไว้โดยไม่มีคนอนุมัติ ซึ่งคือสภาพที่ทั้งเรื่องนี้มีไว้เพื่อป้องกัน
 * @returns UseMutationResult สำหรับส่งมอบ
 * @example
 * handover.mutate({ userId, replacements: [{ workflow_id, stage, replacement_user_id }] });
 */
export function useWorkflowAssigneeHandover() {
  const buCode = useBuCode();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vars: {
      userId: string;
      replacements: WorkflowAssigneeReplacement[];
    }) => {
      const res = await httpClient.post(
        `${API_ENDPOINTS.WORKFLOWS(buCode!)}/assignees/${vars.userId}/handover`,
        { replacements: vars.replacements },
      );
      if (!res.ok)
        throw await ApiError.from(res, "Failed to hand over workflow stages");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WORKFLOWS] });
    },
  });
}
