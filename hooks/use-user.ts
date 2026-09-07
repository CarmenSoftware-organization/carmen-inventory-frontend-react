import { useQuery } from "@tanstack/react-query";
import { createConfigCrud } from "@/hooks/use-config-crud";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useBuCode } from "@/hooks/use-bu-code";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import { httpClient } from "@/lib/http-client";
import { buildUrl } from "@/lib/build-query-string";
import { ApiError } from "@/lib/api-error";
import type { User } from "@/types/workflows";
import type {
  UserDetail,
  UpdateUserDto,
  UserDepartmentResponse,
  UserApplicationRole,
  UserRoleSummaryRole,
} from "@/types/user";
import type { INVENTORY_TYPE } from "@/constant/location";

const crud = createConfigCrud<User, never>({
  queryKey: QUERY_KEYS.USERS,
  endpoint: API_ENDPOINTS.USERS,
  label: "user",
});

/**
 * Hook ดึงรายการผู้ใช้ในระบบแบบแบ่งหน้า
 *
 * Re-export จาก `createConfigCrud.useList` ของ user module
 * ใช้ใน `LookupUser` (ภายใน workflow), system-admin > users
 *
 * @param params - พารามิเตอร์ pagination/search/filter
 * @param options - UseQueryOptions เพิ่มเติม
 * @returns UseQueryResult ของ PaginatedResponse<User>
 * @example
 * ```ts
 * const { data } = useUser({ page: 1, perpage: 20 });
 * ```
 */
export const useUser = crud.useList;

/**
 * Hook สำหรับลบผู้ใช้
 *
 * Re-export จาก factory รับ id string เรียก DELETE
 *
 * @returns UseMutationResult สำหรับลบ user
 * @example
 * ```ts
 * useDeleteUser().mutate(user.id);
 * ```
 */
export const useDeleteUser = crud.useDelete;

/**
 * Hook ดึงข้อมูลผู้ใช้พร้อมบทบาท (role) ตามรหัส
 *
 * ยิง `GET /config/{bu}/users/{id}` ที่คืน UserDetail พร้อม role mapping มาในตัว
 * (ย้ายมาจาก `user-application-roles/{id}` เดิม) enabled เมื่อมีทั้ง buCode และ id
 *
 * @param id - รหัสผู้ใช้
 * @returns UseQueryResult ของ UserDetail
 * @example
 * ```ts
 * const { data } = useUserById(params.id);
 * ```
 */
export function useUserById(id: string | undefined) {
  const buCode = useBuCode();

  return useQuery<UserDetail>({
    queryKey: [QUERY_KEYS.USERS, buCode, id],
    queryFn: async () => {
      if (!buCode) throw new Error("Missing buCode");
      const res = await httpClient.get(
        API_ENDPOINTS.CONFIG_USER_BY_ID(buCode, id!),
      );
      if (!res.ok) throw new Error("Failed to fetch user");
      const json = await res.json();
      return json.data;
    },
    enabled: !!buCode && !!id,
  });
}

export interface UserLocationItem {
  id: string;
  location_id: string;
  location_code: string;
  location_name: string;
  location_type: INVENTORY_TYPE;
  is_active: boolean;
}

/**
 * Hook ดึงรายการ location ที่ผูกกับผู้ใช้คนหนึ่ง
 *
 * ยิง `GET /config/{bu}/locations/user/{userId}` คืน array ของ location mapping
 * ใช้ query key `["user-locations", bu, userId]` ไม่ใช้ key มาตรฐานของ user
 * enabled เมื่อ buCode และ userId พร้อม
 *
 * @param userId - รหัสผู้ใช้
 * @returns UseQueryResult ของ array UserLocationItem
 * @example
 * ```ts
 * const { data: locations } = useUserLocations(user.id);
 * ```
 */
export function useUserLocations(userId: string | undefined) {
  const buCode = useBuCode();

  return useQuery<UserLocationItem[]>({
    queryKey: ["user-locations", buCode, userId],
    queryFn: async () => {
      if (!buCode) throw new Error("Missing buCode");
      const res = await httpClient.get(
        API_ENDPOINTS.CONFIG_LOCATION_USER(buCode, userId!),
      );
      if (!res.ok) throw new Error("Failed to fetch user locations");
      const json = await res.json();
      return json.data ?? [];
    },
    enabled: !!buCode && !!userId,
  });
}

/**
 * Hook แก้ไขผู้ใช้รายคน — บทบาท คลังที่ผูก และแผนกที่สังกัด
 *
 * ส่ง PATCH ไป `/config/{bu}/users/{user_id}` โดยดึง `user_id` ออกจาก payload
 * ไปประกอบ path ไม่ส่งซ้ำใน body — field ที่ไม่ได้ส่งคือ "ไม่แตะ" ตามสัญญาของ
 * PATCH (ดู `UpdateUserPayload`) ตอนนี้ UI ส่งแค่ `application_role_id`
 * ส่วนคลังกับแผนกยังแก้จากหน้าอื่น
 *
 * invalidate `QUERY_KEYS.USERS` หลังสำเร็จ ใช้ใน system-admin > user edit
 *
 * @returns UseMutationResult สำหรับอัพเดตผู้ใช้
 * @example
 * ```ts
 * const update = useUpdateUser();
 * update.mutate({ user_id: "...", application_role_id: { add: ["..."] } });
 * ```
 */
export function useUpdateUser() {
  return useApiMutation<UpdateUserDto>({
    mutationFn: ({ user_id, ...body }, buCode) =>
      httpClient.patch(API_ENDPOINTS.CONFIG_USER_BY_ID(buCode, user_id), body),
    invalidateKeys: [QUERY_KEYS.USERS],
    errorMessage: "Failed to update user",
  });
}

/**
 * Hook ดึง department หลักและรายการ department ที่เป็น HOD ของผู้ใช้
 *
 * ยิง `GET /config/{bu}/department-user/user/{userId}` คืน object
 * `{ department, hod_departments }` ใช้ query key `["user-departments", bu, userId]`
 *
 * @param userId - รหัสผู้ใช้
 * @returns UseQueryResult ของ UserDepartmentResponse
 * @example
 * ```ts
 * const { data } = useUserDepartments(user.id);
 * console.log(data?.department, data?.hod_departments);
 * ```
 */
export function useUserDepartments(userId: string | undefined) {
  const buCode = useBuCode();

  return useQuery<UserDepartmentResponse>({
    queryKey: ["user-departments", buCode, userId],
    queryFn: async () => {
      if (!buCode) throw new Error("Missing buCode");
      const res = await httpClient.get(
        API_ENDPOINTS.DEPARTMENT_USER_BY_USER(buCode, userId!),
      );
      if (!res.ok) throw new Error("Failed to fetch user departments");
      const json = await res.json();
      return json.data ?? { department: null, hod_departments: [] };
    },
    enabled: !!buCode && !!userId,
  });
}

// --- User × Role matrix (รายงาน print/CSV) ---

export interface UserRoleMatrix {
  users: UserApplicationRole[];
  roles: UserRoleSummaryRole[];
}

/**
 * Hook คืนฟังก์ชันดึงตาราง user × role ทั้ง BU จาก
 * `GET /api/config/{bu}/user-application-roles` — ยิงรอบแรกอ่าน `paginate.total`
 * ถ้าหน้าแรกยังไม่ครบค่อยยิงซ้ำด้วย `perpage = total` ให้ได้ครบทุกคน
 * data คือ user พร้อม role_ids และ summary.roles คือ role catalog ไว้ทำหัวคอลัมน์
 * @returns async fetcher คืน { users, roles }
 * @example
 * const fetchMatrix = useUserRoleMatrixFetch();
 * const { users, roles } = await fetchMatrix();
 */
export function useUserRoleMatrixFetch() {
  const buCode = useBuCode();

  return async (): Promise<UserRoleMatrix> => {
    if (!buCode) throw new Error("Missing buCode");
    const endpoint = API_ENDPOINTS.USER_APPLICATION_ROLES(buCode);

    const first = await httpClient.get(endpoint);
    if (!first.ok) {
      throw await ApiError.from(first, "Failed to fetch user roles");
    }
    const firstJson = await first.json();
    const users: UserApplicationRole[] = firstJson.data ?? [];
    const total: number = firstJson.paginate?.total ?? users.length;
    if (users.length >= total) {
      return { users, roles: firstJson.summary?.roles ?? [] };
    }

    const res = await httpClient.get(buildUrl(endpoint, { perpage: total }));
    if (!res.ok) {
      throw await ApiError.from(res, "Failed to fetch user roles");
    }
    const json = await res.json();
    return { users: json.data ?? [], roles: json.summary?.roles ?? [] };
  };
}
