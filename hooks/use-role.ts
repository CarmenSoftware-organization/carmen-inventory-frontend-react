import { useQuery } from "@tanstack/react-query";
import { useBuCode } from "@/hooks/use-bu-code";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { httpClient } from "@/lib/http-client";
import { buildUrl } from "@/utils/build-query-string";
import { QUERY_KEYS } from "@/constant/query-keys";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import type {
  Role,
  RoleDetail,
  CreateRoleDto,
  UpdateRoleDto,
} from "@/types/role";
import type { PaginatedResponse, ParamsDto } from "@/types/params";
import { CACHE_STATIC } from "@/lib/cache-config";

/**
 * Hook ดึงรายการ application roles แบบแบ่งหน้า
 * ใช้ CACHE_STATIC (staleTime 30 นาที) เพราะ role เป็น config ที่เปลี่ยนไม่บ่อย
 * จะไม่ fetch จนกว่า buCode จะพร้อม
 * @param params - พารามิเตอร์ค้นหา/กรอง/แบ่งหน้า
 * @param options - ตัวเลือกเปิด/ปิดการ query
 * @returns ผลลัพธ์ useQuery ของ PaginatedResponse<Role>
 * @example
 * const { data } = useRole({ page: 1, perpage: 20 });
 */
export function useRole(
  params?: ParamsDto,
  options?: { enabled?: boolean },
) {
  const buCode = useBuCode();

  return useQuery<PaginatedResponse<Role>>({
    queryKey: [QUERY_KEYS.APPLICATION_ROLES, buCode, params],
    queryFn: async () => {
      const url = buildUrl(API_ENDPOINTS.APPLICATION_ROLES(buCode!), params);
      const res = await httpClient.get(url);
      if (!res.ok) throw new Error("Failed to fetch roles");
      return res.json();
    },
    ...CACHE_STATIC,
    enabled: !!buCode && (options?.enabled ?? true),
  });
}

/**
 * Hook ดึงข้อมูล role ตามรหัส รวมรายละเอียด permission
 * Unwrap data จาก response จะไม่ fetch จนกว่า buCode และ id จะพร้อม
 * @param id - รหัส role
 * @returns ผลลัพธ์ useQuery ของ RoleDetail
 * @example
 * const { data: role } = useRoleById(id);
 */
export function useRoleById(id: string | undefined) {
  const buCode = useBuCode();

  return useQuery<RoleDetail>({
    queryKey: [QUERY_KEYS.APPLICATION_ROLES, buCode, id],
    queryFn: async () => {
      const res = await httpClient.get(
        `${API_ENDPOINTS.APPLICATION_ROLES(buCode!)}/${id}`,
      );
      if (!res.ok) throw new Error("Failed to fetch role");
      const json = await res.json();
      return json.data;
    },
    enabled: !!buCode && !!id,
  });
}

/**
 * Hook สร้าง role ใหม่ผ่าน POST
 * Invalidate APPLICATION_ROLES cache เมื่อสำเร็จ
 * @returns mutation สำหรับสร้าง role
 * @example
 * const create = useCreateRole();
 * create.mutate({ name: "Manager", permissions });
 */
export function useCreateRole() {
  return useApiMutation<CreateRoleDto>({
    mutationFn: (data, buCode) =>
      httpClient.post(API_ENDPOINTS.APPLICATION_ROLES(buCode), data),
    invalidateKeys: [QUERY_KEYS.APPLICATION_ROLES],
    errorMessage: "Failed to create role",
  });
}

/**
 * Hook แก้ไขข้อมูล role ผ่าน PUT โดยระบุ id
 * Invalidate cache รายการ role เมื่อสำเร็จ
 * @returns mutation สำหรับอัพเดต role
 * @example
 * const update = useUpdateRole();
 * update.mutate({ id, ...values });
 */
export function useUpdateRole() {
  return useApiMutation<UpdateRoleDto & { id: string; doc_version?: number }>({
    mutationFn: ({ id, ...data }, buCode) =>
      httpClient.put(
        `${API_ENDPOINTS.APPLICATION_ROLES(buCode)}/${id}`,
        data,
      ),
    invalidateKeys: [QUERY_KEYS.APPLICATION_ROLES],
    errorMessage: "Failed to update role",
  });
}

/**
 * Hook ลบ role ตาม id
 * DELETE และ invalidate รายการ role
 * @returns mutation สำหรับลบ role
 * @example
 * const del = useDeleteRole();
 * del.mutate(roleId);
 */
export function useDeleteRole() {
  return useApiMutation<string>({
    mutationFn: (id, buCode) =>
      httpClient.delete(
        `${API_ENDPOINTS.APPLICATION_ROLES(buCode)}/${id}`,
      ),
    invalidateKeys: [QUERY_KEYS.APPLICATION_ROLES],
    errorMessage: "Failed to delete role",
  });
}
