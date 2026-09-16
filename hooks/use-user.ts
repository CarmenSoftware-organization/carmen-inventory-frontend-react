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
  UserApplicationRole,
  UserRoleSummaryRole,
} from "@/types/user";

const crud = createConfigCrud<User, never>({
  queryKey: QUERY_KEYS.USERS,
  endpoint: API_ENDPOINTS.USERS,
  label: "user",
});

export const useUser = crud.useList;

export const useDeleteUser = crud.useDelete;

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
