import { useQuery } from "@tanstack/react-query";
import { useBuCode } from "@/hooks/use-bu-code";
import { httpClient } from "@/lib/http-client";
import { buildUrl } from "@/lib/build-query-string";
import { QUERY_KEYS } from "@/constant/query-keys";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import {
  type WorkflowDto,
  type Workflow,
  WORKFLOW_TYPE,
} from "@/types/workflows";
import type { PaginatedResponse, ParamsDto } from "@/types/params";
import { CACHE_STATIC } from "@/lib/cache-config";

/**
 * Hook ดึงรายการ workflow แบบแบ่งหน้า
 * ใช้ CACHE_STATIC (staleTime 30 นาที) เพราะ workflow config เปลี่ยนไม่บ่อย
 * จะไม่ fetch จนกว่า buCode จะพร้อม
 * @param params - พารามิเตอร์ค้นหา/กรอง/แบ่งหน้า
 * @param options - ตัวเลือกเปิด/ปิด query
 * @returns ผลลัพธ์ useQuery ของ PaginatedResponse<WorkflowDto>
 * @example
 * const { data } = useWorkflow({ page: 1, perpage: 20 });
 */
export function useWorkflow(
  params?: ParamsDto,
  options?: { enabled?: boolean },
) {
  const buCode = useBuCode();

  return useQuery<PaginatedResponse<WorkflowDto>>({
    queryKey: [QUERY_KEYS.WORKFLOWS, buCode, params],
    queryFn: async () => {
      const url = buildUrl(API_ENDPOINTS.WORKFLOWS(buCode!), params);
      const res = await httpClient.get(url);
      if (!res.ok) throw new Error("Failed to fetch workflows");
      return res.json();
    },
    ...CACHE_STATIC,
    enabled: !!buCode && (options?.enabled ?? true),
  });
}

/**
 * Hook ดึงรายการ workflow ตามประเภท (PR, PO, GRN ฯลฯ)
 * ใช้สำหรับ lookup workflow ในฟอร์มตั้งค่า CACHE_STATIC
 * จะไม่ fetch จนกว่า buCode จะพร้อม
 * @param type - ประเภทของ workflow
 * @returns ผลลัพธ์ useQuery ของ WorkflowDto[]
 * @example
 * const { data } = useWorkflowTypeQuery(WORKFLOW_TYPE.PURCHASE_REQUEST);
 */
export function useWorkflowTypeQuery(
  type: WORKFLOW_TYPE | undefined,
  options?: { enabled?: boolean },
) {
  const buCode = useBuCode();

  return useQuery<WorkflowDto[]>({
    queryKey: [QUERY_KEYS.WORKFLOWS, buCode, "type", type],
    queryFn: async () => {
      const res = await httpClient.get(
        API_ENDPOINTS.WORKFLOW_BY_TYPE(buCode!, type!),
      );
      if (!res.ok) throw new Error("Failed to fetch workflows by type");
      const json = await res.json();
      return json.data ?? [];
    },
    enabled: !!buCode && !!type && (options?.enabled ?? true),
    ...CACHE_STATIC,
  });
}

/**
 * Hook ดึงเฉพาะ workflow ที่ผู้ใช้คนนี้เริ่มเอกสารใหม่ได้
 *
 * backend ตอบ `can_create` มากับ workflow แต่ละตัว (ต่อผู้ใช้) — ถ้าไม่ส่งมาเลย
 * ถือว่าสร้างได้ตามเดิม เพื่อไม่ให้ล็อกทุกคนออกตอน API ยังไม่อัปเดต
 *
 * @param type - ประเภทของ workflow
 * @returns `workflows` ที่กรองแล้ว, `canCreate` (มีสักตัวไหม) และ isLoading
 * @example
 * const { workflows, canCreate } = useCreatableWorkflows(WORKFLOW_TYPE.PR);
 */
export function useCreatableWorkflows(type: WORKFLOW_TYPE | undefined) {
  const { data, isLoading } = useWorkflowTypeQuery(type);
  const workflows = (data ?? []).filter((wf) => wf.can_create !== false);

  return { workflows, canCreate: workflows.length > 0, isLoading };
}

/**
 * Hook ดึงข้อมูล workflow ตามรหัส รวมรายละเอียด stage
 * Unwrap data จาก response จะไม่ fetch จนกว่า buCode และ id จะพร้อม
 * @param id - รหัส workflow
 * @returns ผลลัพธ์ useQuery ของ Workflow
 * @example
 * const { data: wf } = useWorkflowById(id);
 */
export function useWorkflowById(id: string | undefined) {
  const buCode = useBuCode();

  return useQuery<Workflow>({
    queryKey: [QUERY_KEYS.WORKFLOWS, buCode, id],
    queryFn: async () => {
      const res = await httpClient.get(
        `${API_ENDPOINTS.WORKFLOWS(buCode!)}/${id}`,
      );
      if (!res.ok) throw new Error("Failed to fetch workflow");
      const json = await res.json();
      return json.data;
    },
    enabled: !!buCode && !!id,
  });
}
